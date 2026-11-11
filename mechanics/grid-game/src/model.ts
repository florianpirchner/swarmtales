/** The board rules of the grid game, as pure functions (shared with the optimal-referee), and the mechanic's state. */
import { Type, type Static } from "typebox";

export const Side = Type.Union([Type.Literal("X"), Type.Literal("O")]);
export type Side = Static<typeof Side>;

/** A cell holds a side's mark, or "." when free. */
export const Cell = Type.Union([Type.Literal("X"), Type.Literal("O"), Type.Literal(".")]);
export type Cell = Static<typeof Cell>;

export const Result = Type.Union([Type.Literal("X"), Type.Literal("O"), Type.Literal("draw")]);
export type Result = Static<typeof Result>;

export const Tally = Type.Object({ X: Type.Integer(), O: Type.Integer(), draw: Type.Integer() });
export type Tally = Static<typeof Tally>;

export function other(side: Side): Side {
	return side === "X" ? "O" : "X";
}

/** Every line of `line` consecutive cells on a `size` x `size` board (rows, columns, both diagonals), as cell numbers. */
export function linesOf(size: number, line: number): readonly (readonly number[])[] {
	const directions: readonly (readonly [number, number])[] = [
		[0, 1],
		[1, 0],
		[1, 1],
		[1, -1],
	];
	const lines: number[][] = [];
	for (let row = 0; row < size; row++) {
		for (let col = 0; col < size; col++) {
			for (const [dr, dc] of directions) {
				const endRow = row + dr * (line - 1);
				const endCol = col + dc * (line - 1);
				if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) continue;
				lines.push(Array.from({ length: line }, (_, step) => (row + dr * step) * size + col + dc * step));
			}
		}
	}
	return lines;
}

/** The winning line of a board, with its side; undefined when nobody has `line` in a row. */
export function winnerOf(board: readonly Cell[], lines: readonly (readonly number[])[]): { readonly side: Side; readonly cells: readonly number[] } | undefined {
	for (const cells of lines) {
		const first = board[cells[0] ?? -1];
		if (first === undefined || first === ".") continue;
		if (cells.every((cell) => board[cell] === first)) return { side: first, cells };
	}
	return undefined;
}

/** The free cells, ascending. */
export function freeCells(board: readonly Cell[]): readonly number[] {
	return board.flatMap((cell, index) => (cell === "." ? [index] : []));
}

export function emptyBoard(size: number): Cell[] {
	return Array.from({ length: size * size }, (): Cell => ".");
}

/** The board as text: one row per line, cells separated by a space, free cells shown by their number. */
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

export const GameResultSchema = Type.Object({
	game: Type.Integer(),
	result: Result,
	winLine: Type.Optional(Type.Array(Type.Integer())),
	moves: Type.Array(Type.Integer()),
});
export type GameResult = Static<typeof GameResultSchema>;

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
	/** Another mechanic holds the next game back (`GridGameApi.hold`). */
	held: boolean;
	/** A game is due but waits for `release`. */
	due: boolean;
	/** The match was ended as invalid (consensus forfeits only). */
	invalid?: boolean;
	/** The last turn the captain of the turn was told about ("game:move:minute"), so it is told once per turn and minute. */
	told?: string;
}

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

export function tallyOf(results: readonly GameResult[]): Tally {
	const tally: Tally = { X: 0, O: 0, draw: 0 };
	for (const { result } of results) tally[result] += 1;
	return tally;
}
