// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * A depth-limited alpha-beta search over whole morris turns (a step with its removal), with
 * iterative deepening under a node budget, and a static evaluation: pieces, mills about to close
 * and mobility. It is a reference, not an exact solver (nine men's morris is a draw with best play,
 * but an exact table is far too heavy for a test suite): the morris-referee scores moves with it, and
 * the morris mechanic's `engine` option plays one side with it.
 */
import { applyTurn, hasLost, legalSteps, legalTurns, MILLS, NEIGHBOURS, onBoard, other, type Position, type Side, type Turn } from "./rules.ts";

/**
 * The value of a won position; a quicker win is worth a little more.
 *
 * @public
 */
export const WIN = 100_000;
const PIECE = 100;
const OPEN_TWO = 12;
const MOBILITY = 2;
/** A piece of the placing side with no free neighbour: a step towards a blockade. */
const STUCK = 8;
/** A loss smaller than this is evaluation noise (one open two less), not a worse move. */
const NOISE = 12;

// Pieces in all (board and hand) of `side`.
const material = (position: Position, side: Side): number => onBoard(position.board, side) + position.inHand[side];

// Lines with two of `side`'s pieces and a free third point: a mill one step away.
function openTwos(position: Position, side: Side): number {
	let count = 0;
	for (const mill of MILLS) {
		let own = 0;
		let free = 0;
		for (const point of mill) {
			const cell = position.board[point];
			if (cell === side) own += 1;
			else if (cell === ".") free += 1;
		}
		if (own === 2 && free === 1) count += 1;
	}
	return count;
}

/**
 * The static value of a position for the side to move.
 *
 * @param position - The position.
 * @param flying - Whether a side with three pieces may fly.
 * @returns The value.
 *
 * @public
 */
export function evaluate(position: Position, flying: boolean): number {
	const me = position.side;
	const them = other(me);
	let value = PIECE * (material(position, me) - material(position, them)) + OPEN_TWO * (openTwos(position, me) - openTwos(position, them));
	if (position.inHand[me] === 0 && position.inHand[them] === 0) {
		const mine = legalSteps(position, flying).length;
		const theirs = legalSteps({ ...position, side: them }, flying).length;
		value += MOBILITY * (mine - theirs);
	} else {
		// While placing, the moves the pieces will have once placed count too: without this the search walled its own pieces in and lost blocked a few turns after the placing (P107).
		const mine = stepsOnBoard(position.board, me);
		const theirs = stepsOnBoard(position.board, them);
		value += MOBILITY * (mine.steps - theirs.steps) - STUCK * (mine.stuck - theirs.stuck);
	}
	return value;
}

// The moves `side`'s pieces on the board would have (steps to a free neighbour) and how many of them have none.
function stepsOnBoard(board: Position["board"], side: Side): { readonly steps: number; readonly stuck: number } {
	let steps = 0;
	let stuck = 0;
	board.forEach((cell, point) => {
		if (cell !== side) return;
		const free = (NEIGHBOURS[point] ?? []).filter((next) => board[next] === ".").length;
		steps += free;
		if (free === 0) stuck += 1;
	});
	return { steps, stuck };
}

interface Budget {
	nodes: number;
	readonly max: number;
}

class OutOfNodes extends Error {}

function negamax(position: Position, depth: number, alpha: number, beta: number, flying: boolean, budget: Budget): number {
	budget.nodes += 1;
	if (budget.nodes > budget.max) throw new OutOfNodes();
	if (hasLost(position, position.side, flying)) return -WIN - depth;
	if (depth === 0) return evaluate(position, flying);
	let best = -Infinity;
	let low = alpha;
	for (const turn of ordered(legalTurns(position, flying))) {
		const value = -negamax(applyTurn(position, turn), depth - 1, -beta, -low, flying, budget);
		if (value > best) best = value;
		if (value > low) low = value;
		if (low >= beta) break;
	}
	return best;
}

// Turns that close a mill first: they cut more of the search.
function ordered(turns: readonly Turn[]): readonly Turn[] {
	return [...turns.filter((turn) => turn.remove !== undefined), ...turns.filter((turn) => turn.remove === undefined)];
}

/**
 * The score of a played turn against every legal one.
 *
 * @public
 */
export interface TurnScore {
	/** The value of the best turn, for the side that moved. */
	readonly best: number;
	/** The value of the played turn, for the side that moved. */
	readonly played: number;
	/** The depth (whole turns) of the deepest search that finished in the budget. */
	readonly depth: number;
	/** How many legal turns there were. */
	readonly alternatives: number;
	/** A turn that closes a mill was legal, and the played one closed none. */
	readonly missedMill: boolean;
}

const sameTurn = (a: Turn, b: Turn): boolean => a.from === b.from && a.to === b.to && a.remove === b.remove;

// One pass of `scoreTurn` at `depth`: the best value of every legal turn and the value of the played one.
function valuesAt(position: Position, turns: readonly Turn[], played: Turn, depth: number, flying: boolean, budget: Budget): { best: number; played: number } {
	let best = -Infinity;
	let mine = -Infinity;
	for (const turn of turns) {
		const value = -negamax(applyTurn(position, turn), depth - 1, -Infinity, Infinity, flying, budget);
		if (value > best) best = value;
		if (sameTurn(turn, played)) mine = value;
	}
	return { best, played: mine };
}

/**
 * Scores `played` in `position` against every legal turn, searching `maxDepth` whole turns deep (deepening one turn at a time while the budget of `maxNodes` holds). Undefined when the turn was the only legal one or not legal at all.
 *
 * @param position - The position.
 * @param played - The turn that was played.
 * @param flying - Whether a side with three pieces may fly.
 * @param maxDepth - Whole turns the search looks ahead at most.
 * @param maxNodes - Positions one search depth may visit.
 * @returns The score, or undefined.
 * @throws Whatever the search throws besides its own budget signal.
 *
 * @public
 */
export function scoreTurn(position: Position, played: Turn, flying: boolean, maxDepth: number, maxNodes: number): TurnScore | undefined {
	const turns = legalTurns(position, flying);
	if (turns.length < 2 || !turns.some((turn) => sameTurn(turn, played))) return undefined;
	let result: { best: number; played: number; depth: number } | undefined;
	for (let depth = 1; depth <= maxDepth; depth++) {
		const budget: Budget = { nodes: 0, max: maxNodes };
		try {
			result = { ...valuesAt(position, turns, played, depth, flying, budget), depth };
		} catch (error) {
			if (error instanceof OutOfNodes) break;
			throw error;
		}
	}
	if (result === undefined) return undefined;
	const millPossible = turns.some((turn) => turn.remove !== undefined);
	return { ...result, alternatives: turns.length, missedMill: millPossible && played.remove === undefined };
}

/**
 * The class of a scored turn.
 *
 * @public
 */
export type MoveClass = "best" | "inaccuracy" | "blunder" | "missed_win";

/**
 * The class of a scored turn: a missed forced win, a loss of a piece or worse (blunder), a smaller loss, or the best value (within the noise).
 *
 * @param score - The scored turn.
 * @returns The class.
 *
 * @public
 */
export function classify(score: TurnScore): MoveClass {
	const loss = score.best - score.played;
	if (loss < NOISE) return "best";
	if (score.best >= WIN / 2 && score.played < WIN / 2) return "missed_win";
	if (loss >= PIECE || score.played <= -WIN / 2) return "blunder";
	return "inaccuracy";
}

/**
 * The best whole turns in `position` (every turn whose value is the best one), searching `maxDepth` whole turns deep while the budget of `maxNodes` holds per depth. All legal turns when not even depth 1 fits the budget; empty when there is no legal turn.
 *
 * @param position - The position.
 * @param flying - Whether a side with three pieces may fly.
 * @param maxDepth - Whole turns the search looks ahead at most.
 * @param maxNodes - Positions one search depth may visit.
 * @returns The best turns.
 * @throws Whatever the search throws besides its own budget signal.
 *
 * @public
 */
export function bestTurns(position: Position, flying: boolean, maxDepth: number, maxNodes: number): readonly Turn[] {
	const turns = legalTurns(position, flying);
	if (turns.length < 2) return turns;
	let best: readonly Turn[] = turns;
	for (let depth = 1; depth <= maxDepth; depth++) {
		const budget: Budget = { nodes: 0, max: maxNodes };
		try {
			const values = turns.map((turn) => -negamax(applyTurn(position, turn), depth - 1, -Infinity, Infinity, flying, budget));
			const top = Math.max(...values);
			best = turns.filter((_, index) => (values[index] ?? -Infinity) >= top);
		} catch (error) {
			if (error instanceof OutOfNodes) break;
			throw error;
		}
	}
	return best;
}
