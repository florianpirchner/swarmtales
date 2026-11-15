// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The flow of the `chess` mechanic: games, moves and their refusals, the end of a game, and the forfeit clock. */
import type { InputLine, Refusal, ToolSuccess } from "@swarmtales/contracts";
import { StrategyBrainService } from "@swarmtales/mechanic-strategy-brain/contract";
import { TeamChannelService } from "@swarmtales/mechanic-team-channel/contract";
import { refuse, reply } from "@swarmtales/sdk";
import type { Chess } from "chess.js";
import type { ChessCtx, ChessToolCtx, GameRecord } from "./head.ts";
import { adjudicate, colourOf, endOf, parseMove, scoreMove, type EndReason, type Result } from "./model.ts";
import { boardNow, capital, moveNoOf, moverOf, sideOnMove, teamOf } from "./seats.ts";
import { moverLines, positionText, REASON_TEXT, reviewsOf, rulesLines, spellingsOf, summaryOf } from "./texts.ts";

/** The bare names of the two locked tools. */
export const TOOLS = { play: "playMove", resign: "resign" } as const;

type Ctx = ChessCtx;

// Opens `playMove` and `resign` for the seat on move and closes them for the other.
function refreshLocks(ctx: Ctx, chess: Chess): void {
	const mover = moverOf(ctx.state, chess);
	for (const resident of ctx.residents.ids) {
		for (const tool of [TOOLS.play, TOOLS.resign]) {
			if (resident === mover) ctx.access.unlock(resident, tool);
			else ctx.access.lock(resident, tool);
		}
	}
}

function startGame(ctx: Ctx, game: number): void {
	const state = ctx.state;
	const [first, second] = state.seats;
	if (first === undefined || second === undefined) return;
	const swap = ctx.options.alternateColours && game % 2 === 0;
	state.game = game;
	state.white = swap ? second : first;
	state.black = swap ? first : second;
	state.moves = [];
	state.idle = 0;
	state.turnPly = -1;
	state.told = [];
	state.briefed = [];
	state.illegal = {};
	state.forfeits = {};
	state.taken = Object.fromEntries(state.seats.map((team) => [team, 0]));
	state.running = true;
	ctx.emit("game_started", { game, white: state.white, black: state.black });
	// A new game, a new chat: the teams' channels show nothing of the games before.
	for (const team of state.seats) ctx.tryCall(TeamChannelService, "newEpoch", { team });
	ctx.tryCall(TeamChannelService, "resetCap", { team: state.white });
	ctx.tryCall(StrategyBrainService, "gameStarted", { game, first: "" });
	refreshLocks(ctx, boardNow(state));
}

/**
 * Starts the next game, or marks it due when another mechanic holds it back.
 *
 * @param ctx - The mechanic's context.
 */
export function startNext(ctx: Ctx): void {
	const state = ctx.state;
	if (state.finished || state.running) return;
	if (state.held) {
		state.due = true;
		return;
	}
	state.due = false;
	startGame(ctx, state.game + 1);
}

// The points of White and of Black for a result.
const pointsOf = (result: Result): readonly [number, number] => (result === "1-0" ? [1, 0] : result === "0-1" ? [0, 1] : [0.5, 0.5]);

/**
 * Ends the running game: the record, the points, `game_ended` with the PGN, the notice to the strategy brain, and the
 * next game or the end of the match.
 *
 * @param ctx - The mechanic's context.
 * @param result - The result.
 * @param reason - How the game ended.
 * @param resigned - The resident who resigned, when one did.
 */
export function endGame(ctx: Ctx, result: Result, reason: EndReason, resigned?: string): void {
	const state = ctx.state;
	const record: GameRecord = {
		game: state.game,
		white: state.white,
		black: state.black,
		result,
		reason,
		plies: state.moves.length,
		moves: [...state.moves],
		illegal: { ...state.illegal },
		forfeits: { ...state.forfeits },
		...(resigned === undefined ? {} : { resigned }),
	};
	state.results.push(record);
	const [white, black] = pointsOf(result);
	state.scores[state.white] = (state.scores[state.white] ?? 0) + white;
	state.scores[state.black] = (state.scores[state.black] ?? 0) + black;
	state.running = false;
	state.told = [];
	state.notes = {};
	const chess = boardNow(state);
	chess.setHeader("White", state.white);
	chess.setHeader("Black", state.black);
	chess.setHeader("Round", String(state.game));
	chess.setHeader("Result", result);
	ctx.emit("game_ended", { ...record, moves: [...record.moves], illegal: { ...record.illegal }, forfeits: { ...record.forfeits }, pgn: chess.pgn() });
	refreshLocks(ctx, chess);
	const last = state.game >= ctx.options.games;
	if (last) state.finished = true;
	const review = ctx.options.coach && !last ? reviewsOf(ctx, record) : undefined;
	ctx.tryCall(StrategyBrainService, "gameEnded", { game: state.game, summary: summaryOf(state, record), line: spellingsOf(record.moves), ...(review === undefined ? {} : { review }) });
	if (last) ctx.emit("match_ended", { scores: { ...state.scores } });
	else ctx.schedule.at(ctx.tick + 1, "nextGame");
}

// What the mover is told after its move `san`: the end of the game by chess.js or at the cap, or undefined while the game runs.
function endedAfter(ctx: Ctx, chess: Chess, san: string): string | undefined {
	const state = ctx.state;
	const end = endOf(chess);
	if (end !== undefined) {
		endGame(ctx, end.result, end.reason);
		return end.reason === "checkmate" ? `${san} is checkmate. You win game ${String(state.game)}.` : `${san} played. Game ${String(state.game)} is drawn ${REASON_TEXT[end.reason]}.`;
	}
	if (state.moves.length < ctx.options.maxPlies) return undefined;
	const result = adjudicate(chess, ctx.options.adjudicateMargin, ctx.options.settleCap);
	endGame(ctx, result, "move_cap");
	return `${san} played. Game ${String(state.game)} reached the move cap and is scored on material: ${result}.`;
}

// Plays the (legal) move `san` for the seat on move, scores it, and ends the game when it is over.
function applyMove(ctx: Ctx, san: string, written: string, forfeit: boolean): string {
	const state = ctx.state;
	const before = [...state.moves];
	const chess = boardNow(state);
	const colour = colourOf(chess);
	const by = moverOf(state, chess) ?? "";
	const side = sideOnMove(state, chess);
	const scored = ctx.options.score ? scoreMove(before, san) : undefined;
	chess.move(san);
	state.moves.push(san);
	if (side !== undefined) state.taken[side] = (state.taken[side] ?? 0) + 1;
	state.idle = 0;
	state.told = [];
	const ply = state.moves.length;
	ctx.emit("move_played", { game: state.game, ply, colour, by, san, written, fen: chess.fen(), forfeit });
	if (scored !== undefined) ctx.emit("move_scored", { game: state.game, ply, colour, by, san, ...scored });
	const ended = endedAfter(ctx, chess, san);
	if (ended !== undefined) return ended;
	refreshLocks(ctx, chess);
	const next = sideOnMove(state, chess);
	if (next !== undefined) ctx.tryCall(TeamChannelService, "resetCap", { team: next });
	return `${san} played${chess.inCheck() ? " (check)" : ""}. Now it is your opponent's move; end your turn.`;
}

/**
 * Why `resident` may not move now (not the move's legality), or undefined.
 *
 * @param ctx - The mechanic's context.
 * @param resident - The caller, or undefined when it is no resident.
 * @returns The refusal, or undefined when the resident is the captain of the side on move.
 */
export function problemWith(ctx: Ctx, resident: string | undefined): Refusal | undefined {
	const state = ctx.state;
	if (state.finished) return refuse("MATCH_OVER", "The match is over.");
	if (!state.running) return refuse("NO_GAME", "No game is running right now; wait for the next one.");
	const team = teamOf(state, resident);
	if (resident === undefined || team === undefined) return refuse("NOT_A_SEAT", "You have no seat at this board.");
	const chess = boardNow(state);
	if (sideOnMove(state, chess) !== team) return refuse("NOT_YOUR_MOVE", "It is not your move; wait for your opponent.");
	const captain = moverOf(state, chess);
	if (captain !== resident) return refuse("NOT_CAPTAIN", `${captain ?? "Your captain"} plays this move for your side; advise in the team chat.`);
	return undefined;
}

// What a refused move is told: with `showLegalMoves` every legal move; otherwise only the legal moves of
// the piece the text names (its from-square, or its piece letter), so an illegal try cannot fetch the
// whole list the arm without it is meant to withhold (chess-02a-006).
function refusalHint(ctx: Ctx, chess: Chess, written: string): string {
	const legal = chess.moves({ verbose: true });
	if (ctx.options.showLegalMoves) return `Legal moves: ${legal.map((move) => move.san).join(", ")}.`;
	const from = /^\s*([a-h][1-8])/.exec(written)?.[1];
	const letter = /^\s*([KQRBN])/.exec(written)?.[1]?.toLowerCase();
	const own = legal.filter((move) => (from !== undefined ? move.from === from : letter !== undefined ? move.piece === letter : false));
	if (from === undefined && letter === undefined) return "Write the move as SAN (Nf3) or from and to squares (g1f3).";
	return own.length === 0 ? "That piece has no legal move now." : `Legal moves of that piece: ${own.map((move) => move.san).join(", ")}.`;
}

// Counts a move that chess.js does not read as legal and refuses it; the board stays as it was.
function illegal(ctx: Ctx, resident: string, chess: Chess, written: string): Refusal {
	const state = ctx.state;
	const count = (state.illegal[resident] ?? 0) + 1;
	state.illegal[resident] = count;
	ctx.emit("move_refused", { game: state.game, ply: state.moves.length + 1, colour: colourOf(chess), by: resident, written, count });
	return refuse("ILLEGAL_MOVE", `"${written}" is not a legal move in this position (${capital(colourOf(chess))} to move). The board is unchanged. ${refusalHint(ctx, chess, written)}`);
}

// A fresh context shows the seat the reason it gave with its last move of the running game.
const keepsNote = (ctx: Ctx, note: string): boolean => ctx.options.freshContext && note.length > 0 && ctx.state.running;

const NO_SEAT = (): Refusal => refuse("NOT_A_SEAT", "You have no seat at this board.");

/**
 * The tool `playMove`: plays the move a resident wrote, or refuses it and leaves the board as it was.
 *
 * @param ctx - The tool's context.
 * @param written - The move as the resident wrote it.
 * @param reason - The reason the resident gave, if any; a fresh context shows it at the next move.
 * @returns The reply, which ends the turn, or the refusal.
 */
export function play(ctx: ChessToolCtx, written: string, reason: string | undefined): ToolSuccess | Refusal {
	const refusal = problemWith(ctx, ctx.resident);
	if (refusal !== undefined || ctx.resident === undefined) return refusal ?? NO_SEAT();
	const state = ctx.state;
	const chess = boardNow(state);
	const move = parseMove(chess, written);
	if (move === undefined) return illegal(ctx, ctx.resident, chess, written);
	const moveNo = moveNoOf(state.moves.length);
	const resident = ctx.resident;
	const text = applyMove(ctx, move.san, written, false);
	const note = reason?.trim() ?? "";
	if (keepsNote(ctx, note)) state.notes = { ...(state.notes ?? {}), [resident]: { moveNo, san: move.san, text: note } };
	return reply(text, { endsTurn: true });
}

/**
 * The tool `resign`: the caller's side loses the running game.
 *
 * @param ctx - The tool's context.
 * @returns The reply, which ends the turn, or the refusal.
 */
export function resign(ctx: ChessToolCtx): ToolSuccess | Refusal {
	const refusal = problemWith(ctx, ctx.resident);
	if (refusal !== undefined || ctx.resident === undefined) return refusal ?? NO_SEAT();
	const game = ctx.state.game;
	endGame(ctx, teamOf(ctx.state, ctx.resident) === ctx.state.white ? "0-1" : "1-0", "resignation", ctx.resident);
	return reply(`You resigned game ${String(game)}.`, { endsTurn: true });
}

// What a member of the side on move who is not its captain is told once per half-move with `wakeTeam`: to advise, and the position.
function adviceLines(ctx: Ctx, resident: string, chess: Chess, captain: string): string[] {
	if (!ctx.options.wakeTeam || ctx.state.told.includes(resident)) return [];
	ctx.state.told.push(resident);
	return [ctx.prompt("chess/advise", { colour: capital(colourOf(chess)), captain }), positionText(ctx, resident, chess)];
}

/**
 * The lines chess adds to a resident's turn: the rules once per game, the position for the seat on move, and the
 * request to advise for the other members of its side (`wakeTeam`).
 *
 * @param resident - The resident whose turn opens.
 * @param ctx - The mechanic's context.
 * @returns The lines, in order.
 */
export function turnLines(resident: string, ctx: Ctx): InputLine[] {
	const state = ctx.state;
	const team = teamOf(state, resident);
	if (!state.running || team === undefined) return [];
	const chess = boardNow(state);
	const mover = moverOf(state, chess);
	const lines: InputLine[] = [];
	if (!state.briefed.includes(resident)) {
		state.briefed.push(resident);
		// A fresh context carries the rules in its briefing on every half-move.
		if (!ctx.options.freshContext || mover !== resident) lines.push(...rulesLines(ctx, resident));
	}
	if (mover === resident) lines.push(...moverLines(ctx, resident, chess));
	else if (sideOnMove(state, chess) === team) lines.push(...adviceLines(ctx, resident, chess, mover ?? ""));
	return lines;
}

/**
 * The forfeit clock, when a turn opens: notes the half-move at which the seat on move was activated.
 *
 * @param resident - The resident whose activation opened.
 * @param ctx - The mechanic's context.
 */
export function turnOpened(resident: string, ctx: Ctx): void {
	const state = ctx.state;
	if (state.running && moverOf(state, boardNow(state)) === resident) state.turnPly = state.moves.length;
}

/**
 * The forfeit clock, when a turn ends: a turn on move that ended without a move counts; after `maxIdleTurns` such
 * turns a seeded random legal move is played for the seat, and `maxForfeits` such moves lose the game.
 *
 * @param resident - The resident whose activation ends.
 * @param ctx - The mechanic's context.
 */
export function turnEnded(resident: string, ctx: Ctx): void {
	const state = ctx.state;
	if (!state.running || state.turnPly !== state.moves.length) return;
	const chess = boardNow(state);
	if (moverOf(state, chess) !== resident) return;
	state.turnPly = -1;
	state.idle += 1;
	if (state.idle < ctx.options.maxIdleTurns) return;
	const team = teamOf(state, resident) ?? resident;
	const forfeits = (state.forfeits[team] ?? 0) + 1;
	state.forfeits[team] = forfeits;
	if (ctx.options.maxForfeits > 0 && forfeits >= ctx.options.maxForfeits) {
		endGame(ctx, team === state.white ? "0-1" : "1-0", "forfeits");
		return;
	}
	// A running game always has a legal move: chess.js ends it at mate or stalemate.
	applyMove(ctx, ctx.rng("chess", "forfeit", state.game, state.moves.length).pick(chess.moves()), "", true);
}
