/** Exact game values by minimax, for the optimal-referee. Values are from the point of view of the side that moves: 1 win, 0 draw, -1 loss. */
import { freeCells, linesOf, other, winnerOf, type Cell, type Side } from "@swarmtales/mechanic-grid-game";

export type MoveClass = "optimal" | "blunder" | "missed_win" | "missed_block";

export interface Scored {
	readonly valueBefore: number;
	readonly valueAfter: number;
	readonly class: MoveClass;
}

/** Exact bounds on a position's value, as stored in the transposition table. */
interface Entry {
	lower: number;
	upper: number;
}

/** What a search needs: lines through each cell, the board symmetries, the transposition table and the order to try cells in. */
interface Tools {
	readonly through: readonly (readonly (readonly number[])[])[];
	readonly symmetries: readonly (readonly number[])[];
	readonly memo: Map<string, Entry>;
	readonly order: readonly number[];
}

/** The cells nearest the centre first: they cut the search soonest. */
function centreFirst(size: number): readonly number[] {
	const middle = (size - 1) / 2;
	const distance = (cell: number): number => Math.abs(Math.floor(cell / size) - middle) + Math.abs((cell % size) - middle);
	return Array.from({ length: size * size }, (_, cell) => cell).sort((a, b) => distance(a) - distance(b) || a - b);
}

/** Lines through each cell, so that a win is checked only where a mark was just placed. */
function linesByCell(cells: number, lines: readonly (readonly number[])[]): readonly (readonly (readonly number[])[])[] {
	const through: (readonly number[])[][] = Array.from({ length: cells }, () => []);
	for (const line of lines) for (const cell of line) through[cell]?.push(line);
	return through;
}

/** Whether `side` completes a line by marking the free `cell`. */
function completes(board: readonly Cell[], through: readonly (readonly (readonly number[])[])[], cell: number, side: Side): boolean {
	for (const line of through[cell] ?? []) {
		if (line.every((member) => member === cell || board[member] === side)) return true;
	}
	return false;
}

/** The 8 symmetries of a square board, as cell permutations (new cell i takes the mark of old cell p[i]). */
function symmetriesOf(size: number): readonly (readonly number[])[] {
	const maps: ((row: number, col: number) => readonly [number, number])[] = [
		(r, c) => [r, c],
		(r, c) => [c, size - 1 - r],
		(r, c) => [size - 1 - r, size - 1 - c],
		(r, c) => [size - 1 - c, r],
		(r, c) => [r, size - 1 - c],
		(r, c) => [size - 1 - r, c],
		(r, c) => [c, r],
		(r, c) => [size - 1 - c, size - 1 - r],
	];
	return maps.map((map) => Array.from({ length: size * size }, (_, index) => {
		const [row, col] = map(Math.floor(index / size), index % size);
		return row * size + col;
	}));
}

/** The smallest text of the board under the symmetries. */
function canonical(board: readonly Cell[], symmetries: readonly (readonly number[])[]): string {
	let best = "";
	for (const map of symmetries) {
		let text = "";
		for (const from of map) text += board[from] ?? ".";
		if (best === "" || text < best) best = text;
	}
	return best;
}

/**
 * Negamax with alpha-beta and a transposition table on board and side to move (exact for every board size
 * the referee accepts). Values are 1, 0 or -1 for the side to move on a board nobody has won yet. An
 * immediate win is taken, and a lone threat must be blocked (two threats lose), which keeps 4x4 small.
 */
function solve(board: Cell[], side: Side, tools: Tools, alphaIn: number, beta: number): number {
	const { through, symmetries, memo, order } = tools;
	const free = order.filter((cell) => board[cell] === ".");
	if (free.length === 0) return 0;
	for (const cell of free) if (completes(board, through, cell, side)) return 1;
	const foe = other(side);
	const threats = free.filter((cell) => completes(board, through, cell, foe));
	if (threats.length > 1) return -1;
	const key = `${canonical(board, symmetries)}${side}`;
	let entry = memo.get(key);
	if (entry === undefined) {
		entry = { lower: -1, upper: 1 };
		memo.set(key, entry);
	}
	let alpha = alphaIn;
	if (entry.lower >= beta) return entry.lower;
	if (entry.upper <= alpha) return entry.upper;
	if (entry.lower === entry.upper) return entry.lower;
	alpha = Math.max(alpha, entry.lower);
	const hi = Math.min(beta, entry.upper);
	const moves = threats.length === 1 ? threats : free;
	let best = -2;
	let window = alpha;
	for (const cell of moves) {
		board[cell] = side;
		const value = -solve(board, foe, tools, -hi, -window);
		board[cell] = ".";
		if (value > best) best = value;
		if (best > window) window = best;
		if (window >= hi) break;
	}
	if (best <= alpha) entry.upper = Math.min(entry.upper, best);
	else if (best >= hi) entry.lower = Math.max(entry.lower, best);
	else {
		entry.lower = best;
		entry.upper = best;
	}
	return best;
}

/** Cache limit: a whole 4x4 game from the empty board needs well under this many table entries. */
const MAX_ENTRIES = 1_500_000;
const toolCache = new Map<string, Tools>();

/** The search tools of a board shape; the table lives across the moves of a game (positions repeat), and is dropped when it grows big. Values are exact, so the cache changes speed only. */
function toolsFor(cells: number, lines: readonly (readonly number[])[], line: number): Tools {
	const size = Math.round(Math.sqrt(cells));
	const name = `${String(size)}:${String(line)}`;
	let tools = toolCache.get(name);
	if (tools === undefined || tools.memo.size > MAX_ENTRIES) {
		tools = { through: linesByCell(cells, lines), symmetries: symmetriesOf(size), memo: new Map(), order: centreFirst(size) };
		toolCache.set(name, tools);
	}
	return tools;
}

/** What `side` gets by playing each free cell, as a record cell to value. */
function valuesOf(board: readonly Cell[], side: Side, lines: readonly (readonly number[])[], line: number): ReadonlyMap<number, number> {
	const tools = toolsFor(board.length, lines, line);
	const work = [...board];
	const values = new Map<number, number>();
	for (const cell of freeCells(work)) {
		work[cell] = side;
		values.set(cell, completes(board, tools.through, cell, side) ? 1 : 0 - solve(work, other(side), tools, -1, 1));
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
	const values = valuesOf(board, side, lines, line);
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
