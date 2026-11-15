// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The Director of the city slice: the warden. A proposed decision wakes it; it asks its model for one line and
 * posts that line on the board. Its grant also holds `amendDecision`, so it is a holder of the decision, but it
 * never amends.
 */
import { defineDirector } from "@swarmtales/sdk";
import { Type } from "typebox";

/**
 * The line the warden posts when its model gives no answer that fits.
 *
 * @public
 */
export const WARDEN_FALLBACK = "The warden has seen the proposal. The city waits for the deadline.";

const proposalOf = (payload: unknown): string => (typeof payload === "object" && payload !== null && "proposal" in payload ? JSON.stringify(payload.proposal) : "?");

/**
 * The warden: woken by `decisions.decision_proposed`, it posts one line on the board, at most three times a run.
 *
 * @example
 * ```ts
 * defineGame({ id: "city", residents: 6, mechanics: [channels(), decisions({ holders: ["director:warden"] })], directors: [{ use: warden }], grants: { warden: ["postBoard", "amendDecision"] } });
 * ```
 *
 * @public
 */
export const warden = defineDirector(
	{
		id: "warden",
		summary: "Posts one line on the board when a decision is proposed.",
		on: [{ event: "decisions.decision_proposed" }],
		output: Type.Object({ line: Type.String({ minLength: 1, maxLength: 400, description: "The line for the board" }) }, { additionalProperties: false, description: "The warden's answer" }),
		limits: { maxCalls: 3 },
	},
	{
		system: () => "You are the warden of the city. When a decision is proposed, you tell the city in one plain line what was proposed and that it can still be changed before its deadline. Answer with JSON: { \"line\": string }.",
		input: (ctx) => `Tick ${String(ctx.tick)}. Proposed: ${ctx.firings.map((firing) => proposalOf(firing.payload)).join("; ")}`,
		act: async (answer, ctx) => {
			await ctx.call("postBoard", { message: answer.line });
		},
		fallback: () => ({ line: WARDEN_FALLBACK }),
	},
);
