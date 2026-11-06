/**
 * The chess rules of the `chess` mechanic, all through chess.js: replaying a game from its move list,
 * reading a move the way a model writes it (SAN, long algebraic or UCI), the end of a game, material,
 * and the material baseline that scores a move for the human (a one-ply check, not an engine).
 */
import { Chess, type Move, type Square } from "chess.js";
import { Type, type Static } from "typebox";

export type Colour = "white" | "black";

export const Result = Type.Union([Type.Literal("1-0"), Type.Literal("0-1"), Type.Literal("1/2-1/2")]);
export type Result = Static<typeof Result>;

export const EndReason = Type.Union([
	Type.Literal("checkmate"),
	Type.Literal("stalemate"),
	Type.Literal("threefold_repetition"),
	Type.Literal("fifty_moves"),
	Type.Literal("insufficient_material"),
	Type.Literal("move_cap"),
	Type.Literal("forfeits"),
	Type.Literal("resignation"),
]);
export type EndReason = Static<typeof EndReason>;

const VALUE: Readonly<Record<string, number>> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** The position after `moves` (SAN, as chess.js wrote them), from the standard start. */
export function replay(moves: readonly string[]): Chess {
	const chess = new Chess();
	for (const san of moves) chess.move(san);
	return chess;
}

export const colourOf = (chess: Chess): Colour => (chess.turn() === "w" ? "white" : "black");

const UCI = /^([a-h][1-8])-?([a-h][1-8])=?([qrbnQRBN])?$/;

/** Annotations a model adds that chess.js does not read: check and mate signs, `!` and `?`, a trailing dot. */
function bare(text: string): string {
	return text
		.trim()
		.replace(/^\d+\.(\.\.)?\s*/, "")
		.replace(/[+#!?.]+$/, "")
		.replace(/^0-0-0$/, "O-O-O")
		.replace(/^0-0$/, "O-O")
		// `Pe4`: the pawn letter SAN leaves out; `nf3`: a piece letter in lower case (never `b`, a file).
		.replace(/^P(?=[a-h])/, "")
		.replace(/^([nrqk])(?=x?[a-h1-8])/, (letter) => letter.toUpperCase());
}

/** The legal move `text` names in `chess`, or undefined: SAN (also loosely written), `e2e4`, `e2-e4`, `e7e8q`. */
export function parseMove(chess: Chess, text: string): Move | undefined {
	const written = bare(text);
	if (written === "") return undefined;
	const legal = chess.moves({ verbose: true });
	const uci = UCI.exec(written);
	if (uci !== null) {
		const [, from, to, promotion] = uci;
		const found = legal.filter((move) => move.from === from && move.to === to && (move.promotion === undefined || move.promotion === (promotion ?? "q").toLowerCase()));
		if (found.length > 0) return found[0];
	}
	const bySan = legal.find((move) => bare(move.san) === written);
	if (bySan !== undefined) return bySan;
	// The permissive parser of chess.js (`Nb1c3`, `Pe4`, `exd6e.p.`), on a copy so nothing is played.
	const copy = new Chess(chess.fen());
	try {
		const move = copy.move(written, { strict: false });
		return legal.find((candidate) => candidate.san === move.san);
	} catch {
		return undefined;
	}
}

/** The material of each colour (pawn 1, knight and bishop 3, rook 5, queen 9). */
export function materialOf(chess: Chess): { readonly white: number; readonly black: number } {
	let white = 0;
	let black = 0;
	for (const row of chess.board()) {
		for (const square of row) {
			if (square === null) continue;
			const value = VALUE[square.type] ?? 0;
			if (square.color === "w") white += value;
			else black += value;
		}
	}
	return { white, black };
}

/** How the game in `chess` ended, or undefined while it runs (the move cap is the mechanic's, not chess.js's). */
export function endOf(chess: Chess): { readonly result: Result; readonly reason: EndReason } | undefined {
	if (chess.isCheckmate()) return { result: chess.turn() === "w" ? "0-1" : "1-0", reason: "checkmate" };
	if (chess.isStalemate()) return { result: "1/2-1/2", reason: "stalemate" };
	if (chess.isInsufficientMaterial()) return { result: "1/2-1/2", reason: "insufficient_material" };
	if (chess.isThreefoldRepetition()) return { result: "1/2-1/2", reason: "threefold_repetition" };
	if (chess.isDrawByFiftyMoves()) return { result: "1/2-1/2", reason: "fifty_moves" };
	return undefined;
}

/** The result at the move cap: the side ahead by at least `margin` in material wins, else a draw. */
export function adjudicate(chess: Chess, margin: number): Result {
	const { white, black } = materialOf(chess);
	if (white - black >= margin) return "1-0";
	if (black - white >= margin) return "0-1";
	return "1/2-1/2";
}

/** The game so far as numbered SAN: `1. e4 e5 2. Nf3`. */
export function moveText(moves: readonly string[]): string {
	const parts: string[] = [];
	moves.forEach((san, index) => {
		parts.push(index % 2 === 0 ? `${String(index / 2 + 1)}. ${san}` : san);
	});
	return parts.join(" ");
}

// ---------------------------------------------------------------------------------------------------
// The material baseline: one ply with a static exchange check, values in pawns for the mover. A move
// is worth what it captures (and a promotion adds) minus the most the opponent can then win at once on
// one square (a piece attacked and undefended, or attacked by a cheaper piece); a mate is worth MATE.
// It sees hanging pieces and missed free captures, nothing deeper (no pins, no forks, no plans): a
// baseline for the report, not an engine. chess.js builds two FENs per verbose move, so a real search
// on it is too slow for a live run.

const MATE = 100;

const valueAt = (chess: Chess, square: Square): number => {
	const piece = chess.get(square);
	return piece === undefined ? 0 : (VALUE[piece.type] ?? 0);
};

/** The most `by` can win with one capture now: the static exchange value of the best target, 0 when none. */
function threatOf(chess: Chess, by: "w" | "b"): number {
	const own = by === "w" ? "b" : "w";
	let worst = 0;
	for (const row of chess.board()) {
		for (const square of row) {
			if (square?.color !== own || square.type === "k") continue;
			const attackers = chess.attackers(square.square, by);
			if (attackers.length === 0) continue;
			const value = VALUE[square.type] ?? 0;
			const cheapest = Math.min(...attackers.map((from) => valueAt(chess, from)));
			const defended = chess.attackers(square.square, own).length > 0;
			const threat = defended ? Math.max(0, value - cheapest) : value;
			if (threat > worst) worst = threat;
		}
	}
	return worst;
}

const NAME: Readonly<Record<string, string>> = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };

/**
 * The pieces of `side` that the other side can win now: attacked and undefended, or attacked by a
 * cheaper piece. One line per piece, most valuable first: `queen g5 (attacked by knight f3, undefended)`.
 * The same static view as the baseline (no pins, no x-rays), meant as a reading aid for the seat.
 */
export function loosePieces(chess: Chess, side: "w" | "b"): string[] {
	const by = side === "w" ? "b" : "w";
	const found: { readonly value: number; readonly text: string }[] = [];
	for (const row of chess.board()) {
		for (const square of row) {
			if (square?.color !== side || square.type === "k") continue;
			const attackers = chess.attackers(square.square, by);
			if (attackers.length === 0) continue;
			const value = VALUE[square.type] ?? 0;
			const defended = chess.attackers(square.square, side).length > 0;
			const cheapest = attackers.reduce((low, from) => (valueAt(chess, from) < valueAt(chess, low) ? from : low));
			if (defended && valueAt(chess, cheapest) >= value) continue;
			const attacker = chess.get(cheapest);
			found.push({ value, text: `${NAME[square.type] ?? square.type} ${square.square} (attacked by ${attacker === undefined ? "?" : (NAME[attacker.type] ?? attacker.type)} ${cheapest}, ${defended ? "defended but worth more" : "undefended"})` });
		}
	}
	return found.sort((a, b) => b.value - a.value).map((entry) => entry.text);
}

function valueOfMove(chess: Chess, move: Move): number {
	const gain = (move.captured === undefined ? 0 : (VALUE[move.captured] ?? 0)) + (move.promotion === undefined ? 0 : (VALUE[move.promotion] ?? 0) - 1);
	chess.move({ from: move.from, to: move.to, ...(move.promotion === undefined ? {} : { promotion: move.promotion }) });
	const value = chess.isCheckmate() ? MATE : chess.isDraw() ? 0 : gain - threatOf(chess, chess.turn());
	chess.undo();
	return value;
}

export const MoveClass = Type.Union([Type.Literal("good"), Type.Literal("inaccuracy"), Type.Literal("mistake"), Type.Literal("blunder")]);
export type MoveClass = Static<typeof MoveClass>;

export interface ScoredMove {
	/** The baseline's best move (SAN) and its value in pawns for the mover. */
	readonly best: string;
	readonly bestValue: number;
	/** The played move's value in pawns for the mover. */
	readonly playedValue: number;
	/** Pawns lost against the best move, 0 or more. */
	readonly loss: number;
	readonly class: MoveClass;
}

function classOf(loss: number): MoveClass {
	if (loss >= 3) return "blunder";
	if (loss >= 2) return "mistake";
	if (loss >= 1) return "inaccuracy";
	return "good";
}

/** Scores `played` (SAN) in the position after `moves` with the material baseline. */
export function scoreMove(moves: readonly string[], played: string): ScoredMove | undefined {
	const chess = replay(moves);
	const legal = chess.moves({ verbose: true });
	if (legal.length < 2) return undefined;
	let best: Move | undefined;
	let bestValue = -Infinity;
	let playedValue: number | undefined;
	for (const move of legal) {
		const value = valueOfMove(chess, move);
		if (move.san === played) playedValue = value;
		if (value > bestValue) {
			bestValue = value;
			best = move;
		}
	}
	if (best === undefined || playedValue === undefined) return undefined;
	const loss = Math.max(0, bestValue - playedValue);
	return { best: best.san, bestValue, playedValue, loss, class: classOf(loss) };
}
