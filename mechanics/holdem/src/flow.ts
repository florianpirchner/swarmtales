// SPDX-License-Identifier: Apache-2.0
/** The flow of a match: games and hands with their seeded duplicate deals, the lock of `act`, the record as events, the score of a decision, and the move of a seat that did not act in time. */
import { StrategyBrainService } from "@swarmtales/mechanic-strategy-brain/contract";
import { DECK, equity, rangeEquity } from "./cards.ts";
import { ACT, type HoldemCtx } from "./head.ts";
import { baselineOf, evLossOf, newHand, options as optionsOf, play, rangesOf, settle, statsOf, type Hand, type Limits, type Scored, type Street } from "./model.ts";

type Ctx = HoldemCtx;

/**
 * The limits of the betting from the mechanic's options.
 *
 * @param ctx - The context of the mechanic.
 * @returns The limits.
 *
 * @public
 */
export const limitsOf = (ctx: Ctx): Limits => ({ smallBlind: ctx.options.smallBlind, bigBlind: ctx.options.bigBlind, smallBet: ctx.options.smallBet, bigBet: ctx.options.bigBet, cap: ctx.options.cap });

/**
 * A number with its sign (`+2`, `0`, `-2`).
 *
 * @param value - The number.
 * @returns The text.
 *
 * @public
 */
export const signed = (value: number): string => (value > 0 ? `+${String(value)}` : String(value));

/**
 * The points of every seat in one line (`A01 +2, A02 -2`).
 *
 * @param scores - The points per seat.
 * @param seats - The seats in table order.
 * @returns The line.
 *
 * @public
 */
export function scoreLine(scores: Readonly<Record<string, number>>, seats: readonly string[]): string {
	return seats.map((seat) => `${seat} ${signed(scores[seat] ?? 0)}`).join(", ");
}

function refreshLocks(ctx: Ctx): void {
	const hand = ctx.state.hand;
	for (const seat of ctx.state.seats) {
		if (ctx.state.running && hand !== undefined && !hand.over && hand.toAct === seat) ctx.access.unlock(seat, ACT);
		else ctx.access.lock(seat, ACT);
	}
}

// The deal of hand `number` of game `game`: hole cards by position (button first, one card at a time
// as at a table) and the five board cards. With `duplicate` the deal does not depend on the game.
function dealOf(ctx: Ctx, game: number, number: number): { readonly holes: string[][]; readonly runout: string[] } {
	const n = ctx.state.seats.length;
	const shuffled = ctx.rng("holdem", "deal", ctx.options.duplicate ? 0 : game, number).shuffle(DECK);
	const holes = Array.from({ length: n }, (_, position) => [shuffled[position] ?? "", shuffled[position + n] ?? ""]);
	return { holes, runout: shuffled.slice(2 * n, 2 * n + 5) };
}

// Emits the hand's record from `from` on: actions and board cards.
function publish(ctx: Ctx, hand: Hand, from: number): void {
	// The pot after each entry: replay the record (an action's `to` is the seat's street total).
	let pot = 0;
	let street: Street = "preflop";
	let streetIn = new Map<string, number>();
	hand.log.forEach((entry, index) => {
		if (entry.kind === "board") {
			street = entry.street;
			streetIn = new Map();
			if (index >= from) ctx.emit("board_dealt", { game: ctx.state.game, hand: hand.number, street: entry.street, cards: [...entry.cards] });
			return;
		}
		if (entry.street !== street) {
			street = entry.street;
			streetIn = new Map();
		}
		const before = streetIn.get(entry.seat) ?? 0;
		streetIn.set(entry.seat, entry.to);
		pot += entry.to - before;
		if (index >= from) ctx.emit("action_taken", { game: ctx.state.game, hand: hand.number, seat: entry.seat, done: entry.done, to: entry.to, street: entry.street, pot, ...(entry.missed === true ? { missed: true } : {}) });
	});
}

function startHand(ctx: Ctx, number: number): void {
	const state = ctx.state;
	const n = state.seats.length;
	const { holes, runout } = dealOf(ctx, state.game, number);
	const button = (number - 1 + state.game - 1) % n;
	const hand = newHand(number, state.seats, button, holes, runout, limitsOf(ctx));
	state.hand = hand;
	state.opened = ctx.tick;
	state.told = false;
	ctx.emit("hand_started", { game: state.game, hand: number, button: state.seats[button] ?? "", seats: [...state.seats] });
	ctx.emit("cards_dealt", { game: state.game, hand: number, holes: Object.fromEntries(Object.entries(hand.holes).map(([seat, cards]) => [seat, [...cards]])), runout: [...runout] });
	publish(ctx, hand, 0);
	refreshLocks(ctx);
}

function startGame(ctx: Ctx, game: number): void {
	const state = ctx.state;
	state.game = game;
	state.results = [];
	state.decisions = [];
	state.briefed = [];
	state.seenHand = {};
	state.seenLog = {};
	state.seenResults = {};
	state.gameScores = Object.fromEntries(state.seats.map((seat) => [seat, 0]));
	state.running = true;
	ctx.emit("game_started", { game, hands: ctx.options.hands, seats: [...state.seats] });
	ctx.tryCall(StrategyBrainService, "gameStarted", { game, first: "" });
	startHand(ctx, 1);
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
	delete state.hand;
	refreshLocks(ctx);
	ctx.emit("game_ended", { game: state.game, scores: { ...state.gameScores }, totals: { ...state.scores } });
	ctx.emit("game_scored", { game: state.game, stats: statsOf(state.seats, state.decisions, state.results) });
	const last = state.game >= ctx.options.games;
	if (last) state.finished = true;
	ctx.tryCall(StrategyBrainService, "gameEnded", { game: state.game, summary: `${String(state.results.length)} hands, points ${scoreLine(state.gameScores, state.seats)}` });
	if (last) ctx.emit("match_ended", { scores: { ...state.scores } });
	else ctx.schedule.at(ctx.tick + 1, "nextGame");
}

function endHand(ctx: Ctx, hand: Hand): void {
	const state = ctx.state;
	const result = settle(hand);
	for (const [seat, net] of Object.entries(result.net)) {
		state.scores[seat] = (state.scores[seat] ?? 0) + net;
		state.gameScores[seat] = (state.gameScores[seat] ?? 0) + net;
	}
	state.results.push(result);
	ctx.emit("hand_ended", { game: state.game, ...result });
	if (hand.number < ctx.options.hands) startHand(ctx, hand.number + 1);
	else endGame(ctx);
}

/**
 * Scores the decision of the seat to act against the equity baseline and records it.
 *
 * @param ctx - The context of the mechanic.
 * @param hand - The hand being played.
 * @param done - What the seat does.
 * @param missed - Whether the seat did not act in time.
 * @param reason - The reason the seat gave; it goes to the human only.
 *
 * @public
 */
export function score(ctx: Ctx, hand: Hand, done: Scored["done"], missed: boolean, reason: string | undefined): void {
	const state = ctx.state;
	const seat = hand.toAct;
	const { toCall, canRaise, pot } = optionsOf(hand, limitsOf(ctx));
	const opponents = hand.seats.filter((other) => other !== seat && !hand.folded.includes(other)).length;
	const round = (value: number): number => Math.round(value * 1000) / 1000;
	const hole = hand.holes[seat] ?? [];
	const value = round(equity(hole, hand.board, opponents, ctx.options.equitySamples, ctx.rng("holdem", "equity", state.game, hand.number, state.decisions.length)));
	const ranged = round(rangeEquity(hole, hand.board, rangesOf(hand, seat), ctx.options.equitySamples, ctx.rng("holdem", "range-equity", state.game, hand.number, state.decisions.length)));
	const { baseline, potOdds } = baselineOf(ranged, toCall, pot, opponents + 1, canRaise);
	const scored: Scored = { game: state.game, hand: hand.number, street: hand.street, resident: seat, done, toCall, pot, opponents, equity: value, rangeEquity: ranged, potOdds: round(potOdds), baseline, evLoss: evLossOf(done, ranged, toCall, pot), missed };
	state.decisions.push(scored);
	ctx.emit("decision_scored", { ...scored, ...(reason === undefined || reason.trim() === "" ? {} : { reason: reason.trim() }) });
}

/**
 * Plays `done` for the seat to act, publishes the record and moves on (the next seat, street, hand or game).
 *
 * @param ctx - The context of the mechanic.
 * @param hand - The hand being played.
 * @param done - What the seat does (already checked).
 * @param missed - Whether the seat did not act in time.
 * @param tick - The tick the next seat's deadline counts from.
 *
 * @public
 */
export function proceed(ctx: Ctx, hand: Hand, done: Scored["done"], missed: boolean, tick: number): void {
	const from = hand.log.length;
	const seat = hand.toAct;
	play(hand, done, limitsOf(ctx), missed);
	publish(ctx, hand, from);
	// The seat knows its own action: its next turn reports only what came after it.
	if (ctx.state.seenHand[seat] === hand.number) ctx.state.seenLog[seat] = from + 1;
	ctx.state.opened = tick;
	ctx.state.told = false;
	if (hand.over) endHand(ctx, hand);
	refreshLocks(ctx);
}

/**
 * The end of a tick: a seat that did not act by its deadline checks, or folds when it faces a bet.
 *
 * @param ctx - The context of the mechanic.
 *
 * @public
 */
export function actForLate(ctx: Ctx): void {
	const state = ctx.state;
	const hand = state.hand;
	if (!state.running || hand === undefined || hand.over || ctx.tick - state.opened + 1 < ctx.options.deadline) return;
	const done = optionsOf(hand, limitsOf(ctx)).toCall === 0 ? "check" : "fold";
	score(ctx, hand, done, true, undefined);
	proceed(ctx, hand, done, true, ctx.tick + 1);
}
