// SPDX-License-Identifier: Apache-2.0
/**
 * The rules of nine men's morris as pure functions, shared by the mechanic and the morris-referee.
 *
 * The board has 24 points on three nested squares joined at the middle of each side. Points are
 * numbered 1-24 for the residents, row by row from the top left; inside this module they are 0-23.
 * Each side has 9 pieces. While a side has pieces in hand it places one per turn on a free point;
 * after that it moves a piece along a line to an adjacent free point; with 3 pieces left it may jump
 * to any free point (flying, an option). Three pieces of one side on a line form a mill, and a turn
 * that closes a mill removes one opposing piece that is not in a mill (any piece when all are in
 * mills). A side loses when it has fewer than 3 pieces (on the board and in hand) or, with no piece in
 * hand, no legal move.
 *
 * A move is one integer for the residents (and the consensus gate): placing on point p is `p`,
 * moving or flying from p to q is `p * 100 + q`, and removing the piece on point p is `p`.
 */
import { Type, type Static } from "typebox";

/**
 * The schema of a side.
 *
 * @public
 */
export const Side = Type.Union([Type.Literal("X"), Type.Literal("O")]);
/**
 * A side: X or O.
 *
 * @public
 */
export type Side = Static<typeof Side>;

/**
 * The schema of a point's cell.
 *
 * @public
 */
export const Cell = Type.Union([Type.Literal("X"), Type.Literal("O"), Type.Literal(".")]);
/**
 * A point holds a side's piece, or "." when free.
 *
 * @public
 */
export type Cell = Static<typeof Cell>;

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
 * The number of points of the board.
 *
 * @public
 */
export const POINTS = 24;
/**
 * Pieces per side in nine men's morris.
 *
 * @public
 */
export const PIECES = 9;

/**
 * The 16 lines of three points, 0-based: eight across, eight down.
 *
 * @public
 */
export const MILLS: readonly (readonly [number, number, number])[] = [
	[0, 1, 2],
	[3, 4, 5],
	[6, 7, 8],
	[9, 10, 11],
	[12, 13, 14],
	[15, 16, 17],
	[18, 19, 20],
	[21, 22, 23],
	[0, 9, 21],
	[3, 10, 18],
	[6, 11, 15],
	[1, 4, 7],
	[16, 19, 22],
	[8, 12, 17],
	[5, 13, 20],
	[2, 14, 23],
];

/**
 * The neighbours of every point (0-based): the points next to it on a line.
 *
 * @public
 */
export const NEIGHBOURS: readonly (readonly number[])[] = (() => {
	const lists: number[][] = Array.from({ length: POINTS }, () => []);
	for (const [a, b, c] of MILLS) {
		lists[a]?.push(b);
		lists[b]?.push(a, c);
		lists[c]?.push(b);
	}
	return lists.map((list) => [...list].sort((x, y) => x - y));
})();

/** For each point, the mills it lies on (two each). */
const MILLS_OF: readonly (readonly (readonly [number, number, number])[])[] = Array.from({ length: POINTS }, (_, point) => MILLS.filter((mill) => mill.includes(point)));

/**
 * The side that is not `side`.
 *
 * @param side - The side.
 * @returns The other side.
 *
 * @public
 */
export function other(side: Side): Side {
	return side === "X" ? "O" : "X";
}

/**
 * A position: the board, the side to move and the pieces in hand.
 *
 * @public
 */
export interface Position {
	/** The cells of the 24 points. */
	readonly board: readonly Cell[];
	/** The side to move. */
	readonly side: Side;
	/** Pieces each side has not placed yet. */
	readonly inHand: { readonly X: number; readonly O: number };
}

/**
 * One step of a turn, without its removal: a placement (no `from`) or a move.
 *
 * @public
 */
export interface Step {
	/** The point the piece leaves, 0-based; none for a placement. */
	readonly from?: number;
	/** The point the piece lands on, 0-based. */
	readonly to: number;
}

/**
 * A whole turn: the step and, when it closes a mill, the removed point.
 *
 * @public
 */
export interface Turn extends Step {
	/** The point of the opposing piece the turn removes, 0-based; none when it closes no mill. */
	readonly remove?: number;
}

/**
 * How a side takes its next step.
 *
 * @public
 */
export type Stage = "place" | "move" | "fly";

/**
 * A board with no piece on it.
 *
 * @returns The 24 free cells.
 *
 * @public
 */
export function emptyBoard(): Cell[] {
	return Array.from({ length: POINTS }, (): Cell => ".");
}

/**
 * The position at the start of a game.
 *
 * @param side - The side.
 * @param pieces - Pieces per side.
 * @returns The empty board with every piece in hand and `side` to move.
 *
 * @public
 */
export function startPosition(side: Side, pieces = PIECES): Position {
	return { board: emptyBoard(), side, inHand: { X: pieces, O: pieces } };
}

/**
 * Counts the pieces of `side` on the board.
 *
 * @param board - The cells of the 24 points.
 * @param side - The side.
 * @returns The count.
 *
 * @public
 */
export function onBoard(board: readonly Cell[], side: Side): number {
	return board.reduce((count, cell) => (cell === side ? count + 1 : count), 0);
}

/**
 * How `side` takes its next step: place while it has pieces in hand, fly with three left (when allowed), else move.
 *
 * @param position - The position.
 * @param side - The side.
 * @param flying - Whether a side with three pieces may fly.
 * @returns The stage.
 *
 * @public
 */
export function stageOf(position: Position, side: Side, flying: boolean): Stage {
	if (position.inHand[side] > 0) return "place";
	return flying && onBoard(position.board, side) === 3 ? "fly" : "move";
}

/**
 * Whether the piece on `point` is part of a mill of its side.
 *
 * @param board - The cells of the 24 points.
 * @param point - The point, 0-based.
 * @returns True when it is.
 *
 * @public
 */
export function inMill(board: readonly Cell[], point: number): boolean {
	const side = board[point];
	if (side === undefined || side === ".") return false;
	return (MILLS_OF[point] ?? []).some((mill) => mill.every((p) => board[p] === side));
}

/**
 * The points of `side`'s pieces that may be removed: those outside mills, or all when every piece is in one.
 *
 * @param board - The cells of the 24 points.
 * @param side - The side.
 * @returns The points, 0-based.
 *
 * @public
 */
export function removable(board: readonly Cell[], side: Side): readonly number[] {
	const own = board.flatMap((cell, point) => (cell === side ? [point] : []));
	const free = own.filter((point) => !inMill(board, point));
	return free.length > 0 ? free : own;
}

/**
 * The free points of the board.
 *
 * @param board - The cells of the 24 points.
 * @returns The points, 0-based.
 *
 * @public
 */
export function freePoints(board: readonly Cell[]): readonly number[] {
	return board.flatMap((cell, point) => (cell === "." ? [point] : []));
}

/**
 * Every legal step of the side to move (no removal), in a fixed order.
 *
 * @param position - The position.
 * @param flying - Whether a side with three pieces may fly.
 * @returns The steps.
 *
 * @public
 */
export function legalSteps(position: Position, flying: boolean): readonly Step[] {
	const { board, side } = position;
	const free = freePoints(board);
	const stage = stageOf(position, side, flying);
	if (stage === "place") return free.map((to) => ({ to }));
	const steps: Step[] = [];
	for (let from = 0; from < POINTS; from++) {
		if (board[from] !== side) continue;
		const targets = stage === "fly" ? free : (NEIGHBOURS[from] ?? []).filter((to) => board[to] === ".");
		for (const to of targets) steps.push({ from, to });
	}
	return steps;
}

/**
 * The board after `step` for the side to move, and whether the step closed a mill.
 *
 * @param position - The position.
 * @param step - The step.
 * @returns The position, with the same side to move, and the mill flag.
 *
 * @public
 */
export function applyStep(position: Position, step: Step): { readonly position: Position; readonly mill: boolean } {
	const board = [...position.board];
	const side = position.side;
	if (step.from !== undefined) board[step.from] = ".";
	board[step.to] = side;
	const inHand = step.from === undefined ? { ...position.inHand, [side]: position.inHand[side] - 1 } : position.inHand;
	return { position: { board, side, inHand }, mill: inMill(board, step.to) };
}

/**
 * Removes the opposing piece on `point`; the side to move stays the same (call `pass` after).
 *
 * @param position - The position.
 * @param point - The point, 0-based.
 * @returns The position without that piece.
 *
 * @public
 */
export function applyRemove(position: Position, point: number): Position {
	const board = [...position.board];
	board[point] = ".";
	return { ...position, board };
}

/**
 * Hands the move to the other side.
 *
 * @param position - The position.
 * @returns The position with the other side to move.
 *
 * @public
 */
export function pass(position: Position): Position {
	return { ...position, side: other(position.side) };
}

/**
 * Every legal whole turn of the side to move (a step, plus each possible removal when it closes a mill).
 *
 * @param position - The position.
 * @param flying - Whether a side with three pieces may fly.
 * @returns The turns.
 *
 * @public
 */
export function legalTurns(position: Position, flying: boolean): readonly Turn[] {
	const turns: Turn[] = [];
	const opponent = other(position.side);
	for (const step of legalSteps(position, flying)) {
		const after = applyStep(position, step);
		const targets = after.mill ? removable(after.position.board, opponent) : [];
		if (targets.length === 0) turns.push(step);
		else for (const remove of targets) turns.push({ ...step, remove });
	}
	return turns;
}

/**
 * The position after a whole turn, with the other side to move.
 *
 * @param position - The position.
 * @param turn - The whole turn.
 * @returns The position.
 *
 * @public
 */
export function applyTurn(position: Position, turn: Turn): Position {
	const stepped = applyStep(position, turn).position;
	return pass(turn.remove === undefined ? stepped : applyRemove(stepped, turn.remove));
}

/**
 * Whether `side` has lost: fewer than three pieces in all, or nothing in hand and no legal step when it is to move.
 *
 * @param position - The position.
 * @param side - The side.
 * @param flying - Whether a side with three pieces may fly.
 * @returns True when it has lost.
 *
 * @public
 */
export function hasLost(position: Position, side: Side, flying: boolean): boolean {
	if (onBoard(position.board, side) + position.inHand[side] < 3) return true;
	if (position.side !== side || position.inHand[side] > 0) return false;
	return legalSteps(position, flying).length === 0;
}

/**
 * A key of the position for the repetition rule.
 *
 * @param position - The position.
 * @returns The key.
 *
 * @public
 */
export function positionKey(position: Position): string {
	return `${position.board.join("")}${position.side}${String(position.inHand.X)}${String(position.inHand.O)}`;
}

/**
 * The move number of a step, as the residents see it: `p` places on point p, `p * 100 + q` moves from p to q (1-based).
 *
 * @param step - The step.
 * @returns The move number.
 *
 * @public
 */
export function stepCode(step: Step): number {
	return step.from === undefined ? step.to + 1 : (step.from + 1) * 100 + step.to + 1;
}

/**
 * The step of a move number, or undefined when the number is no step at all.
 *
 * @param code - The move number.
 * @returns The step, or undefined.
 *
 * @public
 */
export function decodeStep(code: number): Step | undefined {
	if (!Number.isInteger(code)) return undefined;
	if (code >= 1 && code <= POINTS) return { to: code - 1 };
	const from = Math.floor(code / 100);
	const to = code % 100;
	if (from < 1 || from > POINTS || to < 1 || to > POINTS || from === to) return undefined;
	return { from: from - 1, to: to - 1 };
}

/**
 * A step in words, 1-based: "place on 5", "5 to 6".
 *
 * @param step - The step.
 * @returns The text.
 *
 * @public
 */
export function stepText(step: Step): string {
	return step.from === undefined ? `place on ${String(step.to + 1)}` : `${String(step.from + 1)} to ${String(step.to + 1)}`;
}

/**
 * The lines of three as text, 1-based, for a briefing: "1-2-3, 4-5-6, ...".
 *
 * @returns The text.
 *
 * @public
 */
export function millsText(): string {
	return MILLS.map((mill) => mill.map((point) => String(point + 1)).join("-")).join(", ");
}

/**
 * The neighbours of every point as text, 1-based: "1: 2, 10; 2: 1, 3, 5; ...".
 *
 * @returns The text.
 *
 * @public
 */
export function neighboursText(): string {
	return NEIGHBOURS.map((list, point) => `${String(point + 1)}: ${list.map((p) => String(p + 1)).join(", ")}`).join("; ");
}

/**
 * The board as text: the three squares with their joints, a free point shown by its number, a piece by its side. Every label is two characters wide.
 *
 * @param board - The cells of the 24 points.
 * @returns The thirteen lines of the picture.
 *
 * @public
 */
export function renderBoard(board: readonly Cell[]): string {
	const label = (point: number): string => {
		const cell = board[point];
		return (cell === undefined || cell === "." ? String(point + 1) : cell).padStart(2, " ");
	};
	const rows = [
		"{0}----------{1}----------{2}",
		" |           |           |",
		" |  {3}------{4}------{5}   |",
		" |   |       |       |   |",
		" |   |  {6}--{7}--{8}   |   |",
		" |   |   |       |   |   |",
		"{9}--{10}--{11}      {12}--{13}--{14}",
		" |   |   |       |   |   |",
		" |   |  {15}--{16}--{17}   |   |",
		" |   |       |       |   |",
		" |  {18}------{19}------{20}   |",
		" |           |           |",
		"{21}----------{22}----------{23}",
	];
	return rows.map((row) => row.replace(/\{(\d+)\}/g, (_, point: string) => label(Number(point)))).join("\n");
}
