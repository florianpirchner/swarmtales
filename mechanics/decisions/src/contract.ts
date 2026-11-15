// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The `/contract` sub-path of the mechanic `decisions`: the only file another mechanic imports. It holds the
 * service, the three events, the tool reference and the refusal codes of the decision window.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { defineEvents, defineService, defineTool } from "@swarmtales/sdk";

const decision = Type.String({ description: "The id of the decision: `D1`, `D2`, in the order they were opened." });
const kind = Type.String({ description: "What is decided, as the owning mechanic names it: `<mechanic>.<decision>`." });
const owner = Type.String({ description: "The id of the mechanic that proposed the decision and commits it." });
const proposal = Type.Unknown({ description: "The proposal: plain JSON data, shaped as the owner says." });
const schema = Type.Optional(Type.Unknown({ description: "A JSON schema every amended proposal must fit." }));
const deadline = Type.Integer({ description: "The tick at whose start the decision settles." });
const by = Type.String({ description: "The actor id of the holder that amended the decision." });
const n = Type.Integer({ minimum: 1, description: "The number of the amendment within its decision, from 1 in the order the amendments were made. It is no log position." });
const reason = Type.String({ description: "Why the holder amended the decision, in its own words." });

/**
 * What a mechanic calls to put a decision before the holders, and to see what is open.
 *
 * @public
 */
export const DecisionsService = defineService({
	name: "decisions",
	summary: "Opens a decision that its holders may amend until it settles.",
	methods: {
		propose: {
			kind: "command",
			summary:
				"Opens a decision owned by the caller. With a window of 0, or when no holder can act, it writes nothing and answers `committed: true`: the caller commits at once. Otherwise it writes `decision_proposed` and answers `committed: false` with the id; the caller commits in a listener to `decision_settled`.",
			input: Type.Object({ kind, proposal, window: Type.Integer({ minimum: 0, description: "The ticks the holders have; the decision settles at the start of the tick `now + window`." }), schema }, { description: "A decision to open." }),
			output: Type.Union([Type.Object({ committed: Type.Literal(true) }), Type.Object({ committed: Type.Literal(false), decision })], { description: "Whether the caller commits at once, else the id of the open decision." }),
		},
		open: {
			kind: "query",
			summary: "Lists the open decisions, in the order they were opened.",
			input: Type.Object({}, { description: "No input." }),
			output: Type.Array(Type.Object({ decision, kind, owner, deadline }), { description: "The open decisions." }),
		},
	},
});

/**
 * The events of `decisions`, for a listener: the owner of a decision commits on `decision_settled`.
 *
 * @public
 */
export const DecisionsEvents = defineEvents("decisions", {
	decision_proposed: Type.Object(
		{ decision, kind, owner, proposal, schema, deadline, holders: Type.Array(Type.String(), { description: "The actor ids of the holders that can act now." }) },
		{ description: "A decision was opened; its holders may amend it until the deadline." },
	),
	decision_amended: Type.Object({ decision, n, by, reason, proposal }, { description: "A holder replaced the proposal of an open decision." }),
	decision_settled: Type.Object(
		{
			decision,
			kind,
			owner,
			changed: Type.Boolean({ description: "True when an amendment stands and differs from the original proposal." }),
			by: Type.Optional(by),
			reason: Type.Optional(reason),
			proposal,
			amendments: Type.Array(Type.Object({ by, n }), { description: "Every amendment, in order; the last one stands." }),
		},
		{ description: "The deadline came: the decision is closed with the proposal that stands." },
	),
});

/**
 * The tool a holder amends an open decision with.
 *
 * @public
 */
export const AmendDecision = defineTool("amendDecision", Type.Object({ decision, proposal, reason }, { description: "An amendment of an open decision." }));

/**
 * The refusal codes of `amendDecision`: the decision is unknown or settled, the caller is no holder, the human has
 * amended it already, the proposal does not fit the decision's schema.
 *
 * @public
 */
export const DECISION_REFUSALS = ["DECISION_CLOSED", "DECISION_NOT_HELD", "DECISION_HUMAN", "PROPOSAL_INVALID"] as const;
