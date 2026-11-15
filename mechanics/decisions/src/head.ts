// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The head of the `decisions` mechanic: its option, its slice, its events, its prompts, its tool and the service it provides. */
import { Type, type Static } from "typebox";
import { SwtError } from "@swarmtales/contracts";
import { defineHead, optionMismatch } from "@swarmtales/sdk";
import { AmendDecision, DecisionsEvents, DecisionsService } from "./contract.ts";

const Amendment = Type.Object(
	{
		by: Type.String({ description: "The actor id of the holder." }),
		n: Type.Integer({ minimum: 1, description: "The number of the amendment within its decision, from 1." }),
		proposal: Type.Unknown({ description: "The proposal the holder put in place." }),
		reason: Type.String({ description: "The holder's reason." }),
	},
	{ description: "One amendment of an open decision." },
);

const Open = Type.Object(
	{
		kind: Type.String({ description: "What is decided, as the owner names it." }),
		owner: Type.String({ description: "The id of the mechanic that proposed it." }),
		proposal: Type.Unknown({ description: "The original proposal." }),
		schema: Type.Optional(Type.Unknown({ description: "A JSON schema every amended proposal must fit." })),
		deadline: Type.Integer({ description: "The tick at whose start it settles." }),
		amendments: Type.Array(Amendment, { description: "The amendments, in order; the last one stands." }),
	},
	{ description: "One open decision." },
);

/** One open decision as the slice holds it. */
export type OpenDecision = Static<typeof Open>;

/** The head of the mechanic. */
export const head = defineHead({
	id: "decisions",
	package: "@swarmtales/mechanic-decisions",
	summary: "A decision window: a proposal that its holders may amend before it settles.",
	provides: [DecisionsService],
	options: Type.Object({
		holders: Type.Array(Type.String(), { default: [], description: "The actor ids that may amend a decision (`human`, `director:warden`, `resident:A01`). An id that is no actor of the run is refused when the run is created." }),
	}),
	state: Type.Object({ next: Type.Integer({ description: "The number of the next decision id." }), open: Type.Record(Type.String(), Open, { description: "The open decisions by id." }) }, { description: "The open decisions." }),
	// Runs while the kernel is created, for a fresh run and a resumed one: a holder that is no actor of the run is `SWT-G020`.
	start: ({ options, actors }) => {
		const unknown = options.holders.findIndex((holder) => !actors.some((actor) => actor === holder));
		if (unknown >= 0) throw new SwtError(optionMismatch({ owner: "decisions", package: "@swarmtales/mechanic-decisions", path: `options.holders[${String(unknown)}]`, message: `names "${options.holders[unknown] ?? ""}", which is no actor of the run` }));
		return { next: 1, open: {} };
	},
	events: DecisionsEvents.events,
	prompts: {
		"decisions/tools/amendDecision": [],
		"decisions/replies/decision-amended": ["decision", "proposal"],
		"decisions/replies/decision-outlasts-run": ["decision", "deadline", "last"],
		"decisions/replies/decision-closed": [],
		"decisions/replies/decision-not-held": [],
		"decisions/replies/decision-human": [],
	},
	// The person holds the tool by default; a game grants it to every other holder (a Director's grant, `resident`).
	tools: { [AmendDecision.name]: { description: "decisions/tools/amendDecision", params: AmendDecision.parameters, for: ["human"] } },
});
