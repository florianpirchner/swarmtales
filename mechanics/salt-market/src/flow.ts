// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The start of a game and of its rounds: the seeded deal (rotated by default), the holdings, the counters, the good
 * announced to spoil, and the next game once the strategy brain lets it start. The end of a round (shipments,
 * deliveries, the offers that expire, the spoils) and of a game build on it.
 */
import { StrategyBrainService } from "@swarmtales/mechanic-strategy-brain/contract";
import type { SaltMarketCtx } from "./head.ts";
import { copyBundle, dealOf, empty, PERISHABLE, rotated } from "./model.ts";

type Ctx = SaltMarketCtx;

/**
 * Opens a round: the message counters start anew and the good that spoils at its end is drawn from the stream
 * `("salt-market", "spoil", game, round)` (nothing spoils in the last round or without `spoil`).
 *
 * @param ctx - The context of the mechanic.
 * @param round - The round, from 1.
 * @param tick - The tick the round opens at.
 *
 * @public
 */
export function startRound(ctx: Ctx, round: number, tick: number): void {
	const state = ctx.state;
	state.round = round;
	state.opened = tick;
	state.says = Object.fromEntries(state.seats.map((seat) => [seat, 0]));
	state.spoils = ctx.options.spoil && round < ctx.options.rounds ? ctx.rng("salt-market", "spoil", state.game, round).pick(PERISHABLE) : "";
	ctx.emit("market_round_started", { game: state.game, round, spoils: state.spoils });
}

function startGame(ctx: Ctx, game: number): void {
	const state = ctx.state;
	state.game = game;
	const n = state.seats.length;
	const cycle = ctx.options.rotate ? Math.floor((game - 1) / n) + 1 : game;
	const base = dealOf(state.seats, ctx.rng("salt-market", "deal", cycle), { salt: ctx.options.salt, saltValue: ctx.options.saltValue, slack: ctx.options.slack, rounds: ctx.options.rounds, shipShare: ctx.options.shipShare });
	state.profiles = ctx.options.rotate ? rotated(base, state.seats, (game - 1) % n) : base;
	state.reserved = Object.fromEntries(state.seats.map((seat) => [seat, empty()]));
	state.arrived = [];
	state.spoilLog = [];
	state.holdings = Object.fromEntries(state.seats.map((seat) => [seat, copyBundle(state.profiles[seat]?.start ?? empty())]));
	state.offers = [];
	state.pledges = [];
	state.counter = 0;
	state.spoiled = Object.fromEntries(state.seats.map((seat) => [seat, 0]));
	state.stats = Object.fromEntries(state.seats.map((seat) => [seat, { trades: 0, offers: 0, says: 0, taxPaid: 0, feesPaid: 0 }]));
	state.inbox = {};
	state.briefed = [];
	state.told = {};
	state.gameScores = {};
	state.running = true;
	ctx.emit("market_game_started", { game, seats: [...state.seats], profiles: structuredClone(state.profiles) });
	ctx.tryCall(StrategyBrainService, "gameStarted", { game, first: "" });
	startRound(ctx, 1, ctx.tick);
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
