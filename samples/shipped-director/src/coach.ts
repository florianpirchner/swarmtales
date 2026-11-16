// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The Director of sample 4: the coach. A tick trigger wakes it every second tick; it reads the captain on move and
 * the tally, and may send that captain one private note through the note desk of `channels`. Its dial `direction`
 * (0 to 10) sets its system text and its fallback: at 0 it does not steer and says nothing, from 1 it steers, and
 * without an answer of its model it reminds the captain that the team is on move.
 */
import { defineDirector, type DirectorContext } from "swarmtales";
import { Type, type Static } from "typebox";
import { Check } from "typebox/value";

/**
 * The options of a use of the coach: its dial.
 *
 * @public
 */
export const CoachOptions = Type.Object(
	{ direction: Type.Integer({ minimum: 0, maximum: 10, default: 0, description: "How strongly the coach steers: 0 not at all, 10 by naming the cell." }) },
	{ additionalProperties: false, description: "The options of the coach" },
);

const Captain = Type.String({ minLength: 1, description: "The resident on move" });
const Tally = Type.Object({ X: Type.Integer(), O: Type.Integer(), draw: Type.Integer() }, { description: "The games won so far" });

// The captain on move, read from the fact `grid.captain`; undefined between two games.
const captainOf = (ctx: DirectorContext<Static<typeof CoachOptions>>): string | undefined => (Check(Captain, ctx.facts["grid.captain"]) ? ctx.facts["grid.captain"] : undefined);

/**
 * The text of the fallback note, before the captain's id.
 *
 * @public
 */
export const COACH_REMINDER = "your team is on move: talk in your channel before you vote.";

/**
 * The coach: woken every second tick (a tick trigger, `{ every: 2 }`), asked at most five times a run.
 *
 * @example
 * ```ts
 * defineGame({ ..., mechanics: [..., channels()], directors: [{ use: coach, options: { direction: 8 } }], grants: { coach: ["notify"] } });
 * ```
 *
 * @public
 */
export const coach = defineDirector(
	{
		id: "coach",
		summary: "Every second tick, may send the captain on move one private note; its dial direction says how strongly it steers.",
		options: CoachOptions,
		on: [{ every: 2 }],
		facts: ["grid.captain", "grid.tally"],
		output: Type.Object({ note: Type.String({ maxLength: 200, description: "The note to the captain; empty sends nothing." }) }, { additionalProperties: false, description: "The coach's answer" }),
		limits: { maxCalls: 5 },
	},
	{
		system: ({ options: { direction } }) =>
			[
				"You coach one game of team tic-tac-toe. Every second minute you may send the captain on move one private note.",
				direction === 0 ? "Direction 0: do not steer. Answer with an empty note." : `Direction ${String(direction)} of 10: steer the captain toward a line of three; the higher the direction, the more plainly you name the cell.`,
				'Answer with JSON: { "note": string }, at most 200 characters.',
			].join("\n"),
		input: (ctx) => `Minute ${String(ctx.tick)}. Captain on move: ${captainOf(ctx) ?? "nobody"}. Games won: ${JSON.stringify(Check(Tally, ctx.facts["grid.tally"]) ? ctx.facts["grid.tally"] : {})}.`,
		act: async (answer, ctx) => {
			const captain = captainOf(ctx);
			if (answer.note !== "" && captain !== undefined) await ctx.call("notify", { agent: captain, text: answer.note });
		},
		fallback: (ctx) => {
			const captain = captainOf(ctx);
			return ctx.options.direction === 0 || captain === undefined ? undefined : { note: `${captain}, ${COACH_REMINDER}` };
		},
	},
);
