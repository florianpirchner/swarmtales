// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The state of the sealed auction (the rules are pure functions in `rules.ts`, the reference metrics in `reference.ts`). */
import { Type, type Static } from "typebox";
import { Lot, LotResult } from "./rules.ts";

/**
 * The schema of the mechanic's state and of its snapshot slice. `game` is the running (or last) game, from 1;
 * `lot` the open lot, from 1; `opened` the tick the open lot opened (its deadline counts from it); `told` the
 * residents told of the open lot in a turn line, `briefed` those told of the game's rules; `coins` the coins left in
 * the running game.
 *
 * @public
 */
export const AuctionSlice = Type.Object({
	seats: Type.Array(Type.String()),
	game: Type.Integer(),
	lots: Type.Array(Lot),
	lot: Type.Integer(),
	open: Type.Boolean(),
	opened: Type.Integer(),
	owing: Type.Array(Type.String()),
	told: Type.Array(Type.String()),
	briefed: Type.Array(Type.String()),
	bids: Type.Record(Type.String(), Type.Number()),
	reasons: Type.Record(Type.String(), Type.String()),
	results: Type.Array(LotResult),
	coins: Type.Record(Type.String(), Type.Number()),
	scores: Type.Record(Type.String(), Type.Number()),
	gameScores: Type.Record(Type.String(), Type.Number()),
	running: Type.Boolean(),
	finished: Type.Boolean(),
	held: Type.Boolean(),
	due: Type.Boolean(),
});
/**
 * The state of the mechanic.
 *
 * @public
 */
export type AuctionState = Static<typeof AuctionSlice>;

/**
 * The points of the seats as one line: `A01 3, A02 0`.
 *
 * @param scores - The points by seat.
 * @param seats - The seats, in order.
 * @returns The line.
 *
 * @public
 */
export function scoreLine(scores: Readonly<Record<string, number>>, seats: readonly string[]): string {
	return seats.map((seat) => `${seat} ${String(scores[seat] ?? 0)}`).join(", ");
}
