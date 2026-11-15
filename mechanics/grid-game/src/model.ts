// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The board rules of the grid game (in `rules.ts`, shared with the optimal-referee), and the mechanic's state. */
import { Type, type Static } from "typebox";
import { Cell, Side } from "./rules.ts";

export { Cell, emptyBoard, freeCells, linesOf, other, Side, winnerOf } from "./rules.ts";

/**
 * The schema of a game's result.
 *
 * @public
 */
export const Result = Type.Union([Type.Literal("X"), Type.Literal("O"), Type.Literal("draw")]);
/**
 * A game's result: the side that won, or a draw.
 *
 * @public
 */
export type Result = Static<typeof Result>;

/**
 * The schema of a match's tally.
 *
 * @public
 */
export const Tally = Type.Object({ X: Type.Integer(), O: Type.Integer(), draw: Type.Integer() });
/**
 * A match's tally: the games each side won, and the draws.
 *
 * @public
 */
export type Tally = Static<typeof Tally>;

/**
 * The board as text: one row per line, cells separated by a space, free cells shown by their number.
 *
 * @param board - The cells, row by row.
 * @param size - The board's side length.
 * @returns The text.
 *
 * @public
 */
export function renderBoard(board: readonly Cell[], size: number): string {
	// Every cell is its mark (or a blank) plus its number, so a taken cell still shows which number it is and a
	// reader never has to count columns (P147: GLM misread cells on 5x5 where marks replaced the numbers).
	const width = String(size * size - 1).length;
	const rows: string[] = [];
	for (let row = 0; row < size; row++) {
		rows.push(
			board
				.slice(row * size, row * size + size)
				.map((cell, col) => `${cell === "." ? " " : cell}${String(row * size + col).padStart(width, " ")}`)
				.join(" "),
		);
	}
	return rows.join("\n");
}

/**
 * The schema of one finished game.
 *
 * @public
 */
export const GameResultSchema = Type.Object({
	game: Type.Integer(),
	result: Result,
	winLine: Type.Optional(Type.Array(Type.Integer())),
	moves: Type.Array(Type.Integer()),
});
/**
 * One finished game: its number, its result, the winning line and the cells played.
 *
 * @public
 */
export type GameResult = Static<typeof GameResultSchema>;

/**
 * The state of the grid game.
 *
 * @public
 */
export interface GridState {
	teams: { X: string[]; O: string[] };
	board: Cell[];
	/** The side to move; meaningful while a game is running. */
	side: Side;
	/** The running (or last) game, from 1; 0 before the first starts. */
	game: number;
	startingSide: Side;
	/** The cells played in the current game, in order. */
	moves: number[];
	/** Moves each side has made in the match: the captain of a turn rotates with them. */
	taken: { X: number; O: number };
	results: GameResult[];
	/** A game is on and a move is expected. */
	running: boolean;
	/** The match is over. */
	finished: boolean;
	/** Another mechanic holds the next game back (`GridGameService.hold`). */
	held: boolean;
	/** A game is due but waits for `release`. */
	due: boolean;
	/** The match was ended as invalid (consensus forfeits only). */
	invalid?: boolean;
	/** The last turn the captain of the turn was told about ("game:move:minute"), so it is told once per turn and minute. */
	told?: string;
}

/**
 * The schema of the grid game's state in a snapshot.
 *
 * @public
 */
export const GridSlice = Type.Object({
	teams: Type.Object({ X: Type.Array(Type.String()), O: Type.Array(Type.String()) }),
	board: Type.Array(Cell),
	side: Side,
	game: Type.Integer(),
	startingSide: Side,
	moves: Type.Array(Type.Integer()),
	taken: Type.Object({ X: Type.Integer(), O: Type.Integer() }),
	results: Type.Array(GameResultSchema),
	running: Type.Boolean(),
	finished: Type.Boolean(),
	held: Type.Optional(Type.Boolean()),
	due: Type.Optional(Type.Boolean()),
	invalid: Type.Optional(Type.Boolean()),
	told: Type.Optional(Type.String()),
});

/**
 * Counts the results of a match.
 *
 * @param results - The finished games.
 * @returns The tally.
 *
 * @public
 */
export function tallyOf(results: readonly GameResult[]): Tally {
	const tally: Tally = { X: 0, O: 0, draw: 0 };
	for (const { result } of results) tally[result] += 1;
	return tally;
}
