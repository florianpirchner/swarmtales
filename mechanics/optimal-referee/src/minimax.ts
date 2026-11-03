/** Exact game values by minimax, for the optimal-referee. Values are from the point of view of the side that moves: 1 win, 0 draw, -1 loss. */
import { freeCells, linesOf, other, winnerOf, type Cell, type Side } from "@swarmtales/mechanic-grid-game";

export type MoveClass = "optimal" | "blunder" | "missed_win" | "missed_block";

export interface Scored {
	readonly valueBefore: number;
	readonly valueAfter: number;
	readonly class: MoveClass;
}

/** The value for `side` to move on a board nobody has won yet. */
function solve(board: Cell[], side: Side, lines: readonly (readonly number[])[], memo: Map<string, number>): number {
	const key = `${board.join("")}${side}`;
	const known = memo.get(key);
	if (known !== undefined) return known;
	let best = -1;
	const free = freeCells(board);
	if (free.length === 0) best = 0;
	for (const cell of free) {
		board[cell] = side;
		const value = winnerOf(board, lines) !== undefined ? 1 : -solve(board, other(side), lines, memo);
		board[cell] = ".";
		if (value > best) best = value;
		if (best === 1) break;
	}
	memo.set(key, best);
	return best;
}

/** What `side` gets by playing each free cell, as a record cell to value. */
function valuesOf(board: readonly Cell[], side: Side, lines: readonly (readonly number[])[]): ReadonlyMap<number, number> {
	const memo = new Map<string, number>();
	const work = [...board];
	const values = new Map<number, number>();
	for (const cell of freeCells(work)) {
		work[cell] = side;
		values.set(cell, winnerOf(work, lines) !== undefined ? 1 : -solve(work, other(side), lines, memo));
		work[cell] = ".";
	}
	return values;
}

/** Whether `side` would win at once by playing some free cell. */
function winsAt(board: readonly Cell[], side: Side, lines: readonly (readonly number[])[]): readonly number[] {
	const work = [...board];
	return freeCells(work).filter((cell) => {
		work[cell] = side;
		const wins = winnerOf(work, lines)?.side === side;
		work[cell] = ".";
		return wins;
	});
}

/**
 * Scores the move `cell` of `side` on `board` (the position before it). Returns undefined when no error
 * was possible there: the position has more than `maxEmpty` free cells, or every free cell is worth the
 * same, so nothing the mover chose could have been better or worse.
 */
export function scoreMove(board: readonly Cell[], size: number, line: number, side: Side, cell: number, maxEmpty: number): Scored | undefined {
	const free = freeCells(board);
	if (free.length < 2 || free.length > maxEmpty) return undefined;
	const lines = linesOf(size, line);
	const values = valuesOf(board, side, lines);
	const all = [...values.values()];
	const best = Math.max(...all);
	if (all.every((value) => value === best)) return undefined;
	const played = values.get(cell);
	if (played === undefined) return undefined;
	if (played === best) return { valueBefore: best, valueAfter: played, class: "optimal" };
	if (winsAt(board, side, lines).length > 0) return { valueBefore: best, valueAfter: played, class: "missed_win" };
	if (winsAt(board, other(side), lines).some((threat) => threat !== cell)) return { valueBefore: best, valueAfter: played, class: "missed_block" };
	return { valueBefore: best, valueAfter: played, class: "blunder" };
}
