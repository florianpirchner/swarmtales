// SPDX-License-Identifier: Apache-2.0
/** The flow of a match: games with their seeded deals, the lots one after another, the lock of `bid`, the resolution of a lot and the lot timer. */
import { StrategyBrainService } from "@swarmtales/mechanic-strategy-brain/contract";
import { inSchemaOrder } from "@swarmtales/sdk";
import type { SealedAuctionCtx } from "./head.ts";
import { scoreLine } from "./model.ts";
import { referenceOf } from "./reference.ts";
import { dealLots, Lot, LotResult, resolveLot, type Rules } from "./rules.ts";

type Ctx = SealedAuctionCtx;

/**
 * The rules of the auction from the mechanic's options.
 *
 * @param ctx - The context of the mechanic.
 * @returns The rules.
 *
 * @public
 */
export const rulesOf = (ctx: Ctx): Rules => ({
	purse: ctx.options.purse,
	valueMin: ctx.options.valueMin,
	valueMax: ctx.options.valueMax,
	worthMin: ctx.options.worthMin,
	worthMax: ctx.options.worthMax,
	noise: ctx.options.noise,
	reserve: ctx.options.reserve,
});

/**
 * The open lot, or undefined while none is open.
 *
 * @param ctx - The context of the mechanic.
 * @returns The lot.
 *
 * @public
 */
export function lotNow(ctx: Ctx): Lot | undefined {
	return ctx.state.open ? ctx.state.lots[ctx.state.lot - 1] : undefined;
}

/**
 * Opens `bid` for every resident that owes a bid on the open lot and closes it for everybody else.
 *
 * @param ctx - The context of the mechanic.
 *
 * @public
 */
export function refreshLocks(ctx: Ctx): void {
	for (const resident of ctx.residents.ids) {
		if (ctx.state.open && ctx.state.owing.includes(resident)) ctx.access.unlock(resident, "bid");
		else ctx.access.lock(resident, "bid");
	}
}

function openLot(ctx: Ctx, tick: number): void {
	const state = ctx.state;
	state.lot += 1;
	const lot = state.lots[state.lot - 1];
	if (lot === undefined) return;
	state.open = true;
	state.opened = tick;
	state.bids = {};
	state.reasons = {};
	state.owing = [...state.seats];
	state.told = [];
	ctx.emit("lot_opened", { game: state.game, lot: lot.number, kind: lot.kind });
	refreshLocks(ctx);
}

function startGame(ctx: Ctx, game: number): void {
	const state = ctx.state;
	state.game = game;
	state.lot = 0;
	state.results = [];
	state.briefed = [];
	const dealt = dealLots(ctx.options.lots, state.seats, rulesOf(ctx), ctx.rng("sealed-auction", "deal", game));
	// The state keeps the schema's key order, so that a resumed kernel writes the same snapshot (A43); the event
	// keeps the deal's own order (a shared-worth lot names its worth before the estimates), as the old platform wrote it.
	state.lots = dealt.map((lot) => inSchemaOrder(Lot, lot));
	state.coins = Object.fromEntries(state.seats.map((seat) => [seat, ctx.options.purse]));
	state.gameScores = Object.fromEntries(state.seats.map((seat) => [seat, 0]));
	state.running = true;
	ctx.emit("game_started", { game, lots: [...ctx.options.lots], purse: ctx.options.purse, seats: [...state.seats] });
	ctx.emit("lots_dealt", { game, lots: dealt.map((lot) => ({ ...lot, values: { ...lot.values } })) });
	ctx.tryCall(StrategyBrainService, "gameStarted", { game, first: "" });
	openLot(ctx, ctx.tick);
}

/**
 * Starts the next game, or marks it due when the strategy brain holds it back.
 *
 * @param ctx - The context of the mechanic.
 *
 * @public
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

function endGame(ctx: Ctx): void {
	const state = ctx.state;
	state.running = false;
	state.open = false;
	state.owing = [];
	refreshLocks(ctx);
	ctx.emit("game_ended", { game: state.game, scores: { ...state.gameScores }, totals: { ...state.scores }, coins: { ...state.coins } });
	ctx.emit("game_scored", { game: state.game, reference: referenceOf(state.lots, state.results, state.seats, rulesOf(ctx), state.coins) });
	const last = state.game >= ctx.options.games;
	if (last) state.finished = true;
	ctx.tryCall(StrategyBrainService, "gameEnded", { game: state.game, summary: `points ${scoreLine(state.gameScores, state.seats)}` });
	if (last) ctx.emit("match_ended", { scores: { ...state.scores } });
	else ctx.schedule.at(ctx.tick + 1, "nextGame");
}

/**
 * Resolves the open lot from the sealed bids, pays the winner, and opens the next lot or ends the game.
 *
 * @param ctx - The context of the mechanic.
 * @param tick - The tick the next lot's deadline counts from.
 * @param missed - The seats that did not bid in time.
 *
 * @public
 */
export function resolve(ctx: Ctx, tick: number, missed: readonly string[]): void {
	const state = ctx.state;
	const lot = lotNow(ctx);
	if (lot === undefined) return;
	const draw = ctx.rng("sealed-auction", "tie", state.game, lot.number);
	const result = resolveLot(lot, state.bids, state.seats, rulesOf(ctx), missed, (tied) => draw.pick(tied));
	state.results.push(inSchemaOrder(LotResult, result));
	if (result.winner !== undefined) {
		state.coins[result.winner] = (state.coins[result.winner] ?? 0) - result.price;
		state.scores[result.winner] = (state.scores[result.winner] ?? 0) + result.profit;
		state.gameScores[result.winner] = (state.gameScores[result.winner] ?? 0) + result.profit;
	}
	ctx.emit("lot_resolved", { game: state.game, ...result, ...(lot.kind === "common" && result.winner !== undefined && lot.worth !== undefined ? { worth: lot.worth } : {}) });
	state.open = false;
	state.owing = [];
	if (state.lot < state.lots.length) openLot(ctx, tick);
	else endGame(ctx);
}

/**
 * The end of a tick: once the open lot's deadline has passed, every missing bid is a pass and the lot resolves.
 *
 * @param ctx - The context of the mechanic.
 *
 * @public
 */
export function closeLate(ctx: Ctx): void {
	const state = ctx.state;
	if (!state.running || !state.open || ctx.tick - state.opened + 1 < ctx.options.deadline) return;
	const missed = [...state.owing];
	state.owing = [];
	refreshLocks(ctx);
	resolve(ctx, ctx.tick + 1, missed);
}
