// SPDX-License-Identifier: Apache-2.0
/** The flow of the `morris` mechanic: games, moves and their refusals, the engine's turn and the end of a game. */
import type { Refusal, ToolSuccess } from "@swarmtales/contracts";
import { ConsensusService } from "@swarmtales/mechanic-consensus/contract";
import { StrategyBrainService } from "@swarmtales/mechanic-strategy-brain/contract";
import { TeamChannelService } from "@swarmtales/mechanic-team-channel/contract";
import { refuse, reply } from "@swarmtales/sdk";
import type { MorrisCtx } from "./head.ts";
import { captainOf, ENGINE, legalCodes, positionOf, tallyOf, type EndReason, type GameRecord, type MorrisState } from "./model.ts";
import { applyRemove, applyStep, decodeStep, emptyBoard, hasLost, onBoard, other, positionKey, removable, stageOf, stepCode, stepText, type Result, type Side, type Stage } from "./rules.ts";
import { bestTurns } from "./search.ts";
import { summaryOf } from "./texts.ts";

/** The bare name of the locked tool. */
export const PLAY_MOVE = "playMove";

type Ctx = MorrisCtx;

/**
 * Opens `playMove` for the captain and closes it for everybody else.
 *
 * @param ctx - The mechanic's context.
 */
export function refreshLocks(ctx: Ctx): void {
	const captain = captainOf(ctx.state);
	for (const resident of ctx.residents.ids) {
		if (resident === captain) ctx.access.unlock(resident, PLAY_MOVE);
		else ctx.access.lock(resident, PLAY_MOVE);
	}
}

function startGame(ctx: Ctx, game: number): void {
	const state = ctx.state;
	state.game = game;
	state.board = emptyBoard();
	state.inHand = { X: ctx.options.pieces, O: ctx.options.pieces };
	state.moves = [];
	state.turnNo = 0;
	state.removing = false;
	state.quiet = 0;
	state.seen = {};
	state.startingSide = ctx.options.alternateStart && game % 2 === 0 ? "O" : "X";
	state.side = state.startingSide;
	state.running = true;
	ctx.emit("game_started", { game, startingSide: state.startingSide, xTeam: [...state.teams.X], oTeam: [...state.teams.O], pieces: ctx.options.pieces, flying: ctx.options.flying });
	refreshLocks(ctx);
	ctx.tryCall(ConsensusService, "reset", {});
	// A new game, a new chat: the teams' channels show nothing of the games before.
	ctx.tryCall(TeamChannelService, "newEpoch", { team: "X" });
	ctx.tryCall(TeamChannelService, "newEpoch", { team: "O" });
	ctx.tryCall(TeamChannelService, "resetCap", { team: state.side });
	ctx.tryCall(StrategyBrainService, "gameStarted", { game, first: state.startingSide });
	engineTurn(ctx);
}

/**
 * Starts the next game, or marks it due when the strategy brain holds it back.
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

function endGame(ctx: Ctx, result: Result, reason: EndReason): string {
	const state = ctx.state;
	const moves = [...state.moves];
	const record: GameRecord = { game: state.game, result, reason, turns: state.turnNo, moves };
	state.running = false;
	state.removing = false;
	state.results.push(record);
	const pieces = { X: onBoard(state.board, "X") + state.inHand.X, O: onBoard(state.board, "O") + state.inHand.O };
	ctx.emit("game_ended", { game: state.game, result, reason, turns: state.turnNo, pieces, moves });
	refreshLocks(ctx);
	const summary = summaryOf(record);
	ctx.tryCall(StrategyBrainService, "gameEnded", { game: state.game, summary, moves });
	if (state.game < ctx.options.games) ctx.schedule.at(ctx.tick + 1, "nextGame");
	else {
		state.finished = true;
		ctx.emit("match_ended", { tally: tallyOf(state.results) });
	}
	return `Game ${String(state.game)} is over: ${summary}.`;
}

/**
 * Why `code` may not be played by `resident` now, or undefined.
 *
 * @param state - The state.
 * @param resident - The caller.
 * @param code - The move number.
 * @param flying - Whether a side with three pieces may fly.
 * @returns The refusal, or undefined when the move may be played.
 */
export function problemWith(state: Readonly<MorrisState>, resident: string | undefined, code: number, flying: boolean): Refusal | undefined {
	if (state.finished) return refuse("MATCH_OVER", "The match is over.");
	if (!state.running) return refuse("NO_GAME", "No game is running right now; wait for the next one.");
	const captain = captainOf(state);
	if (resident === undefined || resident !== captain) return refuse("NOT_CAPTAIN", `Only the captain of the turn (${captain ?? "nobody"}, side ${state.side}) may play a move.`);
	if (legalCodes(state, flying).includes(code)) return undefined;
	return illegal(state, code, flying);
}

// The refusal of a move number that is not legal now, with what the side may play instead.
function illegal(state: Readonly<MorrisState>, code: number, flying: boolean): Refusal {
	if (state.removing) return refuse("ILLEGAL_REMOVAL", `Your side closed a mill: name the point of an opposing piece to remove, one of ${removable(state.board, other(state.side)).map((point) => String(point + 1)).join(", ")}.`);
	const stage = stageOf(positionOf(state), state.side, flying);
	const step = decodeStep(code);
	const hint: Readonly<Record<Stage, string>> = {
		place: "you are placing: the move number is a free point (1-24)",
		move: "you are moving: the move number is from * 100 + to, from your piece to a free neighbouring point",
		fly: "you have three pieces and fly: the move number is from * 100 + to, from your piece to any free point",
	};
	return refuse("ILLEGAL_MOVE", `${step === undefined ? `${String(code)} is no move` : `${stepText(step)} is not legal now`}; ${hint[stage]}. viewBoard lists the legal moves.`);
}

// The engine's whole turn when it is on move (the step, then the removal of a mill): the text of what it played, or undefined.
function engineTurn(ctx: Ctx): string | undefined {
	const state = ctx.state;
	const engine = ctx.options.engine;
	if (engine === undefined || !state.running || state.side !== engine.side) return undefined;
	const choices = bestTurns(positionOf(state), ctx.options.flying, engine.depth, engine.maxNodes);
	const turn = choices.length === 0 ? undefined : ctx.rng("morris", "engine", state.game, state.turnNo).pick(choices);
	if (turn === undefined) return undefined;
	const side = state.side;
	const stepped = applyMove(ctx, stepCode(turn), false).reply;
	if (!state.removing || turn.remove === undefined) return `The ${ENGINE} (${side}): ${stepped}`;
	return `The ${ENGINE} (${side}): played ${stepText(turn)} and closed a mill. ${applyMove(ctx, turn.remove + 1, false).reply}`;
}

// How the game ends now that `mover` finished its turn and the other side is on move, or undefined when it goes on.
function endOf(ctx: Ctx, mover: Side, placing: boolean): { readonly result: Result; readonly reason: EndReason } | undefined {
	const state = ctx.state;
	const position = positionOf(state);
	if (hasLost(position, state.side, ctx.options.flying)) return { result: mover, reason: onBoard(state.board, state.side) + state.inHand[state.side] < 3 ? "pieces" : "blocked" };
	if (!placing) {
		const key = positionKey(position);
		const seen = (state.seen[key] ?? 0) + 1;
		state.seen[key] = seen;
		if (seen >= ctx.options.repetitions) return { result: "draw", reason: "repetition" };
		if (state.quiet >= ctx.options.maxQuietTurns) return { result: "draw", reason: "quiet" };
	}
	return state.turnNo >= ctx.options.maxTurns ? { result: "draw", reason: "turn_limit" } : undefined;
}

// Ends a whole turn: the other side moves next, unless the game is over.
function finishTurn(ctx: Ctx, removed: boolean): string {
	const state = ctx.state;
	const mover = state.side;
	if (!ctx.options.fixedCaptain) state.taken[mover] += 1;
	const placing = state.inHand.X > 0 || state.inHand.O > 0;
	if (removed) state.quiet = 0;
	else if (!placing) state.quiet += 1;
	state.side = other(mover);
	const end = endOf(ctx, mover, placing);
	if (end !== undefined) return endGame(ctx, end.result, end.reason);
	refreshLocks(ctx);
	ctx.tryCall(TeamChannelService, "resetCap", { team: state.side });
	return engineTurn(ctx) ?? `${state.side} to move; captain ${captainOf(state) ?? "nobody"}.`;
}

// Removes the opposing piece on the point `code` for the side that closed a mill, which ends its turn.
function applyRemoval(ctx: Ctx, code: number, by: string, forfeit: boolean): ToolSuccess {
	const state = ctx.state;
	const side = state.side;
	state.board = [...applyRemove(positionOf(state), code - 1).board];
	state.removing = false;
	state.moves.push(code);
	ctx.emit("move_played", { game: state.game, side, by, kind: "remove", code, to: code, mill: false, turnNo: state.turnNo, forfeit });
	return reply(`Removed the ${other(side)} piece on ${String(code)}. ${finishTurn(ctx, true)}`);
}

/**
 * Plays `code` for the side to move (already checked); the reply tells the outcome.
 *
 * @param ctx - The mechanic's context.
 * @param code - The move number.
 * @param forfeit - Whether the move timer plays the move for the team.
 * @returns The reply to the caller.
 */
export function applyMove(ctx: Ctx, code: number, forfeit: boolean): ToolSuccess {
	const state = ctx.state;
	const side = state.side;
	const by = ctx.options.engine?.side === side ? ENGINE : (captainOf(state) ?? "");
	if (state.removing) return applyRemoval(ctx, code, by, forfeit);
	const step = decodeStep(code);
	if (step === undefined) return reply("No move played.");
	const kind = stageOf(positionOf(state), side, ctx.options.flying);
	const after = applyStep(positionOf(state), step);
	state.board = [...after.position.board];
	state.inHand = { ...after.position.inHand };
	state.turnNo += 1;
	state.moves.push(code);
	const targets = after.mill ? removable(state.board, other(side)) : [];
	const mill = targets.length > 0;
	ctx.emit("move_played", { game: state.game, side, by, kind, code, ...(step.from === undefined ? {} : { from: step.from + 1 }), to: step.to + 1, mill, turnNo: state.turnNo, forfeit });
	if (mill) {
		state.removing = true;
		return reply(`Played ${stepText(step)}. Mill! Your team now removes one ${other(side)} piece: agree on its point (one of ${targets.map((point) => String(point + 1)).join(", ")}) and play it as the next move.`);
	}
	return reply(`Played ${stepText(step)}. ${finishTurn(ctx, false)}`);
}
