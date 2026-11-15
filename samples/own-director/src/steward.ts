// SPDX-License-Identifier: Apache-2.0
/**
 * The Director of sample 6: the steward. The crew's proposal of a captain wakes it; it asks its model whom it
 * wants as captain and for one line to the crew. When the answer names another resident, the steward amends the
 * decision; then it says its line. Without an answer that fits, its fallback keeps the crew's choice.
 */
import { defineDirector, type DirectorContext } from "@swarmtales/sdk";
import { Type } from "typebox";
import { Check } from "typebox/value";
import { CAPTAIN } from "./crew.ts";

// The part of a `decision_proposed` payload the steward reads: a payload is checked, not trusted.
const Proposed = Type.Object(
	{
		decision: Type.String({ description: "The id of the decision." }),
		kind: Type.String({ description: "What is decided." }),
		proposal: Type.Object({ captain: Type.String({ description: "The proposed captain." }) }, { description: "The proposal." }),
	},
	{ description: "A proposed captain." },
);

// The latest proposal among the firings, or undefined.
function proposedOf(ctx: DirectorContext<unknown>): { readonly decision: string; readonly captain: string } | undefined {
	const payload = ctx.firings.at(-1)?.payload;
	return Check(Proposed, payload) ? { decision: payload.decision, captain: payload.proposal.captain } : undefined;
}

/**
 * The line of the fallback: the steward has no answer of its model and keeps the crew's choice.
 *
 * @public
 */
export const STEWARD_FALLBACK = "The steward has no word; the crew's choice stands.";

/**
 * The steward: woken by `decisions.decision_proposed` of the kind `crew.captain`, asked at most twice a run.
 *
 * @example
 * ```ts
 * defineGame({ id: "crew", residents: 3, mechanics: [decisions({ holders: ["director:steward"] }), crew()], directors: [{ use: steward }], grants: { steward: ["remark", "amendDecision"] } });
 * ```
 *
 * @public
 */
export const steward = defineDirector(
	{
		id: "steward",
		summary: "Reads the crew's choice of a captain and may put another resident in its place.",
		on: [{ event: "decisions.decision_proposed", where: (payload) => Check(Proposed, payload) && payload.kind === CAPTAIN }],
		output: Type.Object(
			{
				captain: Type.String({ minLength: 1, description: "The resident id the steward wants as captain." }),
				line: Type.String({ minLength: 1, maxLength: 200, description: "One line to the crew." }),
			},
			{ additionalProperties: false, description: "The steward's answer" },
		),
		limits: { maxCalls: 2 },
	},
	{
		system: () => 'You are the steward of a ship. The crew has named a captain. Keep the choice or name another resident, and say one line to the crew. Answer with JSON: { "captain": string, "line": string }.',
		input: (ctx) => `Tick ${String(ctx.tick)}. The crew proposes ${proposedOf(ctx)?.captain ?? "nobody"} as captain.`,
		act: async (answer, ctx) => {
			const proposed = proposedOf(ctx);
			if (proposed !== undefined && answer.captain !== proposed.captain) {
				await ctx.call("amendDecision", { decision: proposed.decision, proposal: { captain: answer.captain }, reason: answer.line });
			}
			await ctx.call("remark", { line: answer.line });
		},
		fallback: (ctx) => {
			const proposed = proposedOf(ctx);
			return proposed === undefined ? undefined : { captain: proposed.captain, line: STEWARD_FALLBACK };
		},
	},
);
