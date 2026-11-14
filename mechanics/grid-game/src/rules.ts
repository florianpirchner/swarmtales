// SPDX-License-Identifier: Apache-2.0
/**
 * The `/rules` sub-path of this mechanic: the board rules of the grid game, as pure functions (shared with the
 * optimal-referee). `model.ts` re-exports them beside the mechanic's state.
 */
import { Type, type Static } from "typebox";

/**
 * The schema of a side of the grid game.
 *
 * @public
 */
export const Side = Type.Union([Type.Literal("X"), Type.Literal("O")]);
/**
 * A side of the grid game: X or O.
 *
 * @public
 */
export type Side = Static<typeof Side>;

/**
 * A cell holds a side's mark, or "." when free.
 *
 * @public
 */
export const Cell = Type.Union([Type.Literal("X"), Type.Literal("O"), Type.Literal(".")]);
/**
 * A cell holds a side's mark, or "." when free.
 *
 * @public
 */
export type Cell = Static<typeof Cell>;

/**
 * The side that is not `side`.
 *
 * @param side - A side.
 * @returns The other side.
 *
 * @public
 */
export function other(side: Side): Side {
	return side === "X" ? "O" : "X";
}

/**
 * Every line of `line` consecutive cells on a `size` x `size` board (rows, columns, both diagonals), as cell numbers.
 *
 * @param size - The board's side length.
 * @param line - The line length that wins.
 * @returns The lines, each as its cell numbers.
 *
 * @public
 */
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

/**
 * The winning line of a board, with its side; undefined when nobody has `line` in a row.
 *
 * @param board - The cells, row by row.
 * @param lines - The lines of the board (`linesOf`).
 * @returns The winning side and its cells, or undefined.
 *
 * @public
 */
export function winnerOf(board: readonly Cell[], lines: readonly (readonly number[])[]): { readonly side: Side; readonly cells: readonly number[] } | undefined {
	for (const cells of lines) {
		const first = board[cells[0] ?? -1];
		if (first === undefined || first === ".") continue;
		if (cells.every((cell) => board[cell] === first)) return { side: first, cells };
	}
	return undefined;
}

/**
 * The free cells, ascending.
 *
 * @param board - The cells, row by row.
 * @returns The numbers of the free cells.
 *
 * @public
 */
export function freeCells(board: readonly Cell[]): readonly number[] {
	return board.flatMap((cell, index) => (cell === "." ? [index] : []));
}

/**
 * A board with every cell free.
 *
 * @param size - The board's side length.
 * @returns `size` x `size` free cells.
 *
 * @public
 */
export function emptyBoard(size: number): Cell[] {
	return Array.from({ length: size * size }, (): Cell => ".");
}
