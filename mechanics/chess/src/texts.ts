// SPDX-License-Identifier: Apache-2.0
/** The texts of the `chess` mechanic: the position in its two views, the lines of a turn, the result line and the coach's review. */
import type { InputLine } from "@swarmtales/contracts";
import { StrategyBrainService } from "@swarmtales/mechanic-strategy-brain/contract";
import type { Chess } from "chess.js";
import type { ChessCtx, ChessState, GameRecord } from "./head.ts";
import { colourOf, loosePieces, materialOf, moveText, replay, scoreMove, type EndReason } from "./model.ts";
import { boardNow, capital, labelOf, moveNoOf, moverOf, sideOnMove, teamOf } from "./seats.ts";

type Ctx = ChessCtx;

/** How each end of a game reads in a sentence. */
export const REASON_TEXT: Readonly<Record<EndReason, string>> = {
	checkmate: "by checkmate",
	stalemate: "by stalemate",
	threefold_repetition: "by threefold repetition",
	fifty_moves: "by the fifty-move rule",
	insufficient_material: "by insufficient material",
	move_cap: "at the move cap, on material",
	forfeits: "on forfeits",
	resignation: "by resignation",
};

/**
 * Every move of a game with the spellings a brain might copy it in: SAN and from-to (`Nf3`, `g1f3`).
 *
 * @param moves - The moves of the game, in SAN.
 * @returns The spellings, move by move.
 */
export function spellingsOf(moves: readonly string[]): string[][] {
	const chess = replay([]);
	return moves.map((san) => {
		const move = chess.move(san);
		return [...new Set([san.replace(/[+#]$/, ""), move.lan, `${move.from}-${move.to}`])];
	});
}

/**
 * The game's public result in one line, for the next briefings.
 *
 * @param state - The state of the match.
 * @param record - The finished game.
 * @returns The line.
 */
export function summaryOf(state: Readonly<ChessState>, record: GameRecord): string {
	const moves = `after ${String(moveNoOf(record.plies - 1))} moves`;
	const how = REASON_TEXT[record.reason];
	const white = `${labelOf(state, record.white)} (White)`;
	const black = `${labelOf(state, record.black)} (Black)`;
	if (record.result === "1/2-1/2") return `${white} and ${black} drew ${how} ${moves}`;
	const [winner, loser] = record.result === "1-0" ? [white, black] : [black, white];
	return `${winner} beat ${loser} ${how} ${moves}`;
}

/**
 * The coach's private review of one game per side: the side's worst moves by the material baseline
 * (`scoreMove`, one ply with a static exchange: hanging pieces and missed free captures, no deeper
 * tactics), worst first. Forfeit moves count too: the seat let the clock play them.
 *
 * @param ctx - The mechanic's context.
 * @param record - The finished game.
 * @returns The review text by side.
 */
export function reviewsOf(ctx: Ctx, record: GameRecord): Record<string, string> {
	const scored = record.moves.map((san, index) => ({ index, san, scored: scoreMove(record.moves.slice(0, index), san) }));
	const reviews: Record<string, string> = {};
	for (const side of [record.white, record.black]) {
		const parity = side === record.white ? 0 : 1;
		const own = scored.filter((move) => move.index % 2 === parity);
		const losses = own.flatMap((move) => (move.scored !== undefined && move.scored.loss >= 1 ? [{ ...move, loss: move.scored.loss, best: move.scored.best }] : []));
		const worst = [...losses].sort((a, b) => b.loss - a.loss || a.index - b.index).slice(0, ctx.options.coachMoves);
		const moves = worst.map((move) => ctx.prompt("chess/coach-move", { moveNo: `${String(moveNoOf(move.index))}${parity === 0 ? "." : "..."}`, san: move.san, loss: move.loss >= 50 ? "a mate (missed or allowed)" : `${String(move.loss)} pawn${move.loss === 1 ? "" : "s"} of material`, best: move.best })).join("\n");
		const text = losses.length === 0 ? ctx.prompt("chess/coach-clean", { total: own.length }) : ctx.prompt("chess/coach-review", { count: losses.length, total: own.length, moves });
		reviews[side] = text;
		ctx.emit("coach_review", { game: record.game, side, losses: losses.length, text });
	}
	return reviews;
}

// The board as eight lines `8 r.bqkbnr`, rank 8 first: about a third of the tokens of the spaced grid.
function compactGrid(chess: Chess): string {
	const rows = chess.board().map((row, index) => `${String(8 - index)} ${row.map((square) => (square === null ? "." : square.color === "w" ? square.type.toUpperCase() : square.type)).join("")}`);
	return [...rows, "  abcdefgh"].join("\n");
}

// The last `count` half-moves, numbered: `Last moves (30 half-moves played): 13. cxd4 Nc6 14. Nb3 ...`.
function lastMovesLine(moves: readonly string[], count: number): string {
	if (moves.length === 0) return "Moves so far: none";
	const from = Math.max(0, moves.length - count);
	const parts: string[] = [];
	for (let index = from; index < moves.length; index += 1) {
		const san = moves[index] ?? "";
		const number = String(Math.floor(index / 2) + 1);
		if (index % 2 === 0) parts.push(`${number}. ${san}`);
		else parts.push(index === from ? `${number}... ${san}` : san);
	}
	return from === 0 ? `Moves so far: ${parts.join(" ")}` : `Last moves (${String(moves.length)} half-moves played): ${parts.join(" ")}`;
}

// The first line of the position: the game, the two sides, and the colour of the reader.
function headLine(ctx: Ctx, resident: string | undefined): string {
	const state = ctx.state;
	const team = teamOf(state, resident);
	const own = team === undefined ? undefined : team === state.white ? "white" : "black";
	return `Game ${String(state.game)} of ${String(ctx.options.games)}. White: ${labelOf(state, state.white)}. Black: ${labelOf(state, state.black)}.${own === undefined ? "" : ` You play ${capital(own)}.`}`;
}

// The board and the moves, in the spaced or the compact view.
function boardLines(ctx: Ctx, chess: Chess): string[] {
	const moves = ctx.state.moves;
	if (ctx.options.compactBoard) return ["The board (rank 8 at the top, files a-h left to right; upper case White, lower case Black, '.' empty):", compactGrid(chess), `FEN: ${chess.fen()}`, lastMovesLine(moves, ctx.options.compactMoves)];
	return ["The board (White at the bottom; upper case White, lower case Black, '.' empty):", chess.ascii().trimEnd(), `FEN: ${chess.fen()}`, `Moves so far: ${moves.length === 0 ? "none" : moveText(moves)}`];
}

// The reading aids under the position: each side's loose pieces (`showThreats`), and the legal moves for the seat on move (`showLegalMoves`).
function aidLines(ctx: Ctx, resident: string | undefined, chess: Chess): string[] {
	const lines: string[] = [];
	if (ctx.options.showThreats) {
		const list = (side: "w" | "b"): string => loosePieces(chess, side).join("; ") || "none";
		lines.push(ctx.prompt("chess/threats", { white: list("w"), black: list("b") }));
	}
	if (ctx.options.showLegalMoves && resident !== undefined && moverOf(ctx.state, chess) === resident) lines.push(ctx.prompt("chess/legal-moves", { moves: chess.moves().join(", ") }));
	return lines;
}

/**
 * The position for `resident`: the board, the moves, the material, and whose move it is.
 *
 * @param ctx - The mechanic's context.
 * @param resident - The reader, or undefined for a caller that is no resident.
 * @param chess - The position of the running game.
 * @returns The text.
 */
export function positionText(ctx: Ctx, resident: string | undefined, chess: Chess): string {
	const state = ctx.state;
	const material = materialOf(chess);
	const onMove = sideOnMove(state, chess);
	const captain = onMove === undefined || (state.members[onMove]?.length ?? 0) < 2 ? "" : ` Captain of this move: ${moverOf(state, chess) ?? ""}.`;
	const lines = [
		headLine(ctx, resident),
		...boardLines(ctx, chess),
		`Material: White ${String(material.white)}, Black ${String(material.black)}.`,
		`${capital(colourOf(chess))} to move (move ${String(moveNoOf(state.moves.length))})${chess.inCheck() ? ", in check" : ""}.${captain}`,
	];
	return [...lines, ...aidLines(ctx, resident, chess)].join("\n");
}

/**
 * What `viewBoard` answers: the position of the running game with the points, or where the match stands between games.
 *
 * @param ctx - The mechanic's context.
 * @param resident - The reader, or undefined for a caller that is no resident.
 * @returns The text.
 */
export function boardText(ctx: Ctx, resident: string | undefined): string {
	const state = ctx.state;
	const scores = state.seats.map((seat) => `${labelOf(state, seat)} ${String(state.scores[seat] ?? 0)}`).join(", ");
	if (state.finished) return `The match is over. Points: ${scores}.`;
	if (!state.running) return state.game === 0 ? "The first game has not started yet." : `Game ${String(state.game)} is over; the next one starts soon. Points: ${scores}.`;
	return `${positionText(ctx, resident, boardNow(state))}\nPoints so far: ${scores}.`;
}

/**
 * The rules of the running game for `resident`, with the line on the settled cap when it is on.
 *
 * @param ctx - The mechanic's context.
 * @param resident - The reader.
 * @returns One or two lines.
 */
export function rulesLines(ctx: Ctx, resident: string): string[] {
	const state = ctx.state;
	const white = (teamOf(state, resident) ?? resident) === state.white;
	const lines = [ctx.prompt("chess/rules", { game: state.game, games: ctx.options.games, colour: white ? "White" : "Black", opponent: labelOf(state, white ? state.black : state.white), maxMoves: Math.ceil(ctx.options.maxPlies / 2) })];
	if (ctx.options.settleCap) lines.push(ctx.prompt("chess/cap-settled", {}));
	return lines;
}

// The briefing of a fresh context (`freshContext`): the rules, the seat's strategy brain (through the
// strategy brain, when the game has one) and the note it gave with its last move.
function freshBriefing(ctx: Ctx, resident: string): string {
	const lines = [ctx.prompt("chess/fresh-context", {}), ...rulesLines(ctx, resident)];
	const brain = ctx.tryCall(StrategyBrainService, "briefing", { resident });
	if (brain !== undefined && brain.length > 0) lines.push(brain);
	const note = ctx.state.notes?.[resident];
	if (note !== undefined) lines.push(ctx.prompt("chess/last-note", { moveNo: note.moveNo, san: note.san, text: note.text }));
	return lines.join("\n\n");
}

/**
 * What the seat on move is told at its turn: the full position once per half-move, a short reminder after.
 *
 * @param ctx - The mechanic's context.
 * @param resident - The seat on move.
 * @param chess - The position of the running game.
 * @returns The lines, in order.
 */
export function moverLines(ctx: Ctx, resident: string, chess: Chess): InputLine[] {
	const state = ctx.state;
	const game = state.game;
	const moveNo = moveNoOf(state.moves.length);
	if (state.told.includes(resident)) {
		const lines = [ctx.prompt("chess/still-your-move", { game, moveNo })];
		const left = ctx.options.maxIdleTurns - state.idle;
		if (state.idle > 0) lines.push(ctx.prompt("chess/forfeit-warning", { left }));
		return lines;
	}
	state.told.push(resident);
	const lines: InputLine[] = [];
	if (ctx.options.freshContext) lines.push({ kind: "context-reset", text: freshBriefing(ctx, resident) });
	lines.push(ctx.prompt("chess/your-move", { game, moveNo, colour: capital(colourOf(chess)) }));
	const last = state.moves[state.moves.length - 1];
	if (last !== undefined) lines.push(ctx.prompt("chess/last-move", { san: last }));
	if (chess.inCheck()) lines.push(ctx.prompt("chess/check", {}));
	lines.push(positionText(ctx, resident, chess));
	lines.push(ctx.prompt("chess/how-to-move", {}));
	return lines;
}
