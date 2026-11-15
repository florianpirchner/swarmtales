// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The rules of liar's dice as pure functions (in `rules.ts`: bid order, counting, the baseline, the seat statistics) and the mechanic's state. */
import { Type, type Static } from "typebox";
import { Bid, Entry, Scored } from "./rules.ts";

export { atLeast, baselineOf, beats, Bid, bidProblem, bidText, chanceOf, countFor, diceText, Entry, Kind, legalBids, lowestFace, minimalRaise, nextLive, Scored, SeatStats, statsOf, truthOf, type Rules } from "./rules.ts";

/**
 * The schema of the mechanic's state and of its snapshot slice.
 *
 * @public
 */
export const DiceSlice = Type.Object(
	{
		seats: Type.Array(Type.String()),
		game: Type.Integer(),
		round: Type.Integer(),
		/** Dice per seat in the running game (0: out). */
		counts: Type.Record(Type.String(), Type.Integer()),
		/** The current roll (secret). */
		dice: Type.Record(Type.String(), Type.Array(Type.Integer())),
		standing: Type.Optional(Bid),
		bidder: Type.String(),
		toAct: Type.String(),
		/** Seats out of the running game, first out first. */
		out: Type.Array(Type.String()),
		log: Type.Array(Entry),
		seenLog: Type.Record(Type.String(), Type.Integer()),
		briefed: Type.Array(Type.String()),
		told: Type.Boolean(),
		opened: Type.Integer(),
		decisions: Type.Array(Scored),
		scores: Type.Record(Type.String(), Type.Number()),
		gameScores: Type.Record(Type.String(), Type.Number()),
		running: Type.Boolean(),
		finished: Type.Boolean(),
		held: Type.Boolean(),
		due: Type.Boolean(),
	},
	{ description: "The table: the seats, the running game and round, the secret roll, the standing bid, the public record and the scores." },
);
/**
 * The state of the mechanic.
 *
 * @public
 */
export type DiceState = Static<typeof DiceSlice>;

/**
 * The dice on the table in the running game.
 *
 * @param state - The state of the mechanic.
 * @returns The sum of the seats' dice.
 *
 * @public
 */
export const totalDice = (state: Readonly<DiceState>): number => Object.values(state.counts).reduce((sum, count) => sum + count, 0);

/**
 * A seat's name as `viewer` reads it: its own seat is marked (P133).
 *
 * @param seat - The seat to name.
 * @param viewer - The resident that reads the name, if any.
 * @returns The name.
 *
 * @public
 */
export const nameFor = (seat: string, viewer: string | undefined): string => (seat === viewer ? `${seat} (you)` : seat);

/**
 * The points of every seat in one line.
 *
 * @param scores - The points, by seat.
 * @param seats - The seats in table order.
 * @param viewer - The resident that reads the line, if any.
 * @returns The line.
 *
 * @public
 */
export function scoreLine(scores: Readonly<Record<string, number>>, seats: readonly string[], viewer?: string): string {
	return seats.map((seat) => `${nameFor(seat, viewer)} ${String(scores[seat] ?? 0)}`).join(", ");
}
