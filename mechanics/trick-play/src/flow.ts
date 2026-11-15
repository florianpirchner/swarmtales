// SPDX-License-Identifier: Apache-2.0
/** The flow of trick play: games and rounds start and end, a seat bids, names trump, plays or vetoes, and the move timer. */
import type { ToolSuccess } from "@swarmtales/contracts";
import { reply } from "@swarmtales/sdk";
import { CardTableService, suitOf } from "@swarmtales/mechanic-card-table/contract";
import { StrategyBrainService } from "@swarmtales/mechanic-strategy-brain/contract";
import type { TrickPlayCtx } from "./head.ts";
import { legalCards, orderAfter, roundPoints, trickWinner, trumpNamer, type Trick, type TrickState } from "./model.ts";
import { expectedTricks } from "./reference.ts";

type Ctx = TrickPlayCtx;
type Scores = Record<string, number>;

const zeros = (seats: readonly string[]): Scores => Object.fromEntries(seats.map((seat) => [seat, 0]));
const nextSeat = (seats: readonly string[], seat: string): string => seats[(seats.indexOf(seat) + 1) % seats.length] ?? "";

/**
 * A copy of a record keyed by seat, with its keys in the given order: an event shows a record in the order of the
 * straight run also after a resume from a snapshot file, which sorts the keys (A43).
 *
 * @param record - The record.
 * @param keys - The seats in the order to keep (bids: the bidding order; else the table order).
 * @returns The copy; keys the list does not name are left out.
 *
 * @public
 */
export const inOrder = (record: Readonly<Scores>, keys: readonly string[]): Scores => Object.fromEntries(keys.filter((key) => key in record).map((key) => [key, record[key] ?? 0]));

/**
 * Cards dealt to each seat in the running round.
 *
 * @param ctx - The context.
 * @returns The count; 0 before the first round.
 *
 * @public
 */
export const cardsOf = (ctx: Ctx): number => ctx.options.rounds[ctx.state.round - 1] ?? 0;

/**
 * A seat's hand at the card table.
 *
 * @param ctx - The context.
 * @param seat - The seat.
 * @returns The hand, sorted.
 *
 * @public
 */
export const handOf = (ctx: Ctx, seat: string): string[] => ctx.call(CardTableService, "hand", { resident: seat });

/**
 * The names of the deck's suits.
 *
 * @param ctx - The context.
 * @returns The names in deck order.
 *
 * @public
 */
export const suitNames = (ctx: Ctx): string[] => ctx.call(CardTableService, "suits", {}).map((suit) => suit.name);

/**
 * The trick on the table.
 *
 * @param state - The state.
 * @returns The last trick of the round, or undefined.
 *
 * @public
 */
export const currentTrick = (state: Readonly<TrickState>): Trick | undefined => state.tricks.at(-1);

/**
 * The suit led in the trick on the table.
 *
 * @param state - The state.
 * @returns The suit, or undefined before the lead.
 *
 * @public
 */
export function ledSuit(state: Readonly<TrickState>): string | undefined {
	const lead = currentTrick(state)?.plays[0];
	return lead === undefined ? undefined : suitOf(lead.card);
}

/**
 * What the move timer watches: the same key at a tick's start and end means nothing happened in it.
 *
 * @param state - The state.
 * @returns The key of the open action; empty while nobody acts.
 *
 * @public
 */
export function actionKey(state: Readonly<TrickState>): string {
	return state.actor === null ? "" : `${String(state.game)}:${String(state.round)}:${state.phase}:${state.actor}:${String(state.tricks.length)}:${String(currentTrick(state)?.plays.length ?? 0)}`;
}

function startGame(ctx: Ctx, game: number): void {
	const state = ctx.state;
	state.game = game;
	state.debrief = [];
	state.totals = zeros(state.seats);
	state.vetoes = Object.fromEntries(state.seats.map((seat) => [seat, ctx.options.vetoTokens]));
	state.rounds = [];
	const firstDealer = state.seats[(game - 1) % state.seats.length] ?? "";
	const first = orderAfter(state.seats, firstDealer)[0] ?? "";
	ctx.emit("game_started", { game, seats: [...state.seats], startingSide: first });
	ctx.tryCall(StrategyBrainService, "gameStarted", { game, first });
	startRound(ctx, 1);
}

function startRound(ctx: Ctx, round: number): void {
	const state = ctx.state;
	state.round = round;
	state.dealer = state.seats[(state.game - 1 + round - 1) % state.seats.length] ?? "";
	state.order = orderAfter(state.seats, state.dealer);
	state.bids = {};
	state.trump = null;
	state.namer = null;
	state.tricks = [];
	state.won = zeros(state.seats);
	const cards = cardsOf(ctx);
	ctx.call(CardTableService, "deal", { cards });
	if (ctx.options.reference === "off") delete state.worth;
	else state.worth = handWorth(ctx, cards);
	state.phase = "bid";
	state.actor = state.order[0] ?? null;
	ctx.emit("round_started", { game: state.game, round, cards, dealer: state.dealer, order: [...state.order] });
	if (round > 1 && ctx.options.briefEveryRound) ctx.tryCall(StrategyBrainService, "gameStarted", { game: state.game, first: state.actor ?? "" });
}

// Each seat's Monte Carlo worth of its fresh hand, one decimal, from its own seeded stream (the deal is not touched).
function handWorth(ctx: Ctx, cards: number): Scores {
	const state = ctx.state;
	const suits = ctx.call(CardTableService, "suits", {});
	return Object.fromEntries(
		state.order.map((seat, index) => {
			const rng = ctx.rng("trick-play", "reference", state.game, state.round, seat);
			const worth = expectedTricks(handOf(ctx, seat), index, cards, suits, () => rng.next(), ctx.options.referenceSamples, state.order.length);
			return [seat, Math.round(worth * 10) / 10];
		}),
	);
}

/**
 * Starts the next game, or marks it due when another mechanic holds it back.
 *
 * @param ctx - The context.
 *
 * @public
 */
export function startNext(ctx: Ctx): void {
	const state = ctx.state;
	if (state.finished || state.phase !== "idle") return;
	if (state.held) {
		state.due = true;
		return;
	}
	state.due = false;
	startGame(ctx, state.game + 1);
}

function beginPlay(ctx: Ctx): void {
	const state = ctx.state;
	const leader = state.order[0] ?? "";
	state.phase = "play";
	state.tricks = [{ leader, plays: [] }];
	state.actor = leader;
}

/**
 * Places a bid of the actor; the caller has checked it.
 *
 * @param ctx - The context.
 * @param seat - The bidder.
 * @param bid - The tricks bid.
 * @param forfeit - True for an action of the move timer.
 * @returns The reply for the bidder.
 *
 * @public
 */
export function applyBid(ctx: Ctx, seat: string, bid: number, forfeit: boolean): ToolSuccess {
	const state = ctx.state;
	state.bids[seat] = bid;
	ctx.emit("bid_placed", { game: state.game, round: state.round, seat, bid, forfeit });
	const next = state.order[state.order.indexOf(seat) + 1];
	if (next !== undefined) {
		state.actor = next;
		return reply(`Bid ${String(bid)} placed. ${next} bids next.`);
	}
	if (ctx.options.trump === "none") {
		beginPlay(ctx);
		return reply(`Bid ${String(bid)} placed. Every bid is in; no trump this round. ${state.actor ?? ""} leads.`);
	}
	const namer = trumpNamer(state.order, state.bids);
	state.namer = namer;
	state.phase = "trump";
	state.actor = namer;
	return reply(`Bid ${String(bid)} placed. Every bid is in; ${namer} (lowest bid) names the trump.`);
}

/**
 * Names the trump for the actor; the caller has checked it.
 *
 * @param ctx - The context.
 * @param seat - The namer.
 * @param suit - The suit, as the deck spells it.
 * @param forfeit - True for an action of the move timer.
 * @returns The reply for the namer.
 *
 * @public
 */
export function applyTrump(ctx: Ctx, seat: string, suit: string, forfeit: boolean): ToolSuccess {
	const state = ctx.state;
	state.trump = suit;
	ctx.emit("trump_named", { game: state.game, round: state.round, seat, suit, forfeit });
	beginPlay(ctx);
	return reply(`Trump is ${suit}. ${state.actor ?? ""} leads the first trick.`);
}

/**
 * Plays a card of the actor; the caller has checked it.
 *
 * @param ctx - The context.
 * @param seat - The player.
 * @param card - The card.
 * @param forfeit - True for an action of the move timer.
 * @returns The reply for the player.
 * @throws RangeError when no trick is on the table or the card table does not hold the card.
 *
 * @public
 */
export function applyPlay(ctx: Ctx, seat: string, card: string, forfeit: boolean): ToolSuccess {
	const state = ctx.state;
	const trick = currentTrick(state);
	if (trick === undefined || !ctx.call(CardTableService, "take", { resident: seat, card })) throw new RangeError(`trick-play: ${seat} cannot play ${card}`);
	trick.plays.push({ seat, card });
	const number = state.tricks.length;
	ctx.emit("card_played", { game: state.game, round: state.round, trick: number, seat, card, forfeit });
	if (trick.plays.length < state.seats.length) {
		state.actor = nextSeat(state.seats, seat);
		return reply(`You played ${card}. ${state.actor} plays next.`);
	}
	const winner = trickWinner(trick.plays, state.trump);
	trick.winner = winner;
	state.won[winner] = (state.won[winner] ?? 0) + 1;
	ctx.emit("trick_won", { game: state.game, round: state.round, trick: number, seat: winner, plays: trick.plays.map((play) => ({ ...play })) });
	if (number < cardsOf(ctx)) {
		state.tricks.push({ leader: winner, plays: [] });
		state.actor = winner;
		return reply(`You played ${card}. ${winner} wins trick ${String(number)} and leads the next.`);
	}
	scoreRound(ctx);
	return reply(`You played ${card}. ${winner} wins trick ${String(number)}; the round is over and scored.`);
}

/**
 * Spends the veto token of the seat after the leader; the caller has checked it.
 *
 * @param ctx - The context.
 * @param seat - The seat that vetoes.
 * @returns The reply for that seat.
 * @throws RangeError when no lead is on the table.
 *
 * @public
 */
export function applyVeto(ctx: Ctx, seat: string): ToolSuccess {
	const state = ctx.state;
	const trick = currentTrick(state);
	const lead = trick?.plays[0];
	if (trick === undefined || lead === undefined) throw new RangeError("trick-play: no lead to veto");
	const suit = suitOf(lead.card);
	ctx.call(CardTableService, "give", { resident: lead.seat, card: lead.card });
	trick.plays = [];
	trick.vetoed = suit;
	state.vetoes[seat] = (state.vetoes[seat] ?? 0) - 1;
	state.actor = lead.seat;
	ctx.emit("lead_vetoed", { game: state.game, round: state.round, trick: state.tricks.length, seat, leader: lead.seat, suit });
	return reply(`Veto spent: ${lead.seat} takes ${lead.card} back and must lead a suit other than ${suit}.`);
}

function scoreRound(ctx: Ctx): void {
	const state = ctx.state;
	const bids = inOrder(state.bids, state.order);
	const won = inOrder(state.won, state.seats);
	const points = Object.fromEntries(state.seats.map((seat) => [seat, roundPoints(state.bids[seat] ?? 0, state.won[seat] ?? 0, ctx.options.scoring)]));
	for (const seat of state.seats) state.totals[seat] = (state.totals[seat] ?? 0) + (points[seat] ?? 0);
	state.rounds.push({ round: state.round, cards: cardsOf(ctx), dealer: state.dealer, trump: state.trump, namer: state.namer, bids: { ...bids }, tricks: { ...won }, points, ...(state.worth === undefined ? {} : { worth: inOrder(state.worth, state.order) }) });
	ctx.emit("round_scored", { game: state.game, round: state.round, trump: state.trump, bids, tricks: won, points, totals: inOrder(state.totals, state.seats) });
	if (state.round < ctx.options.rounds.length) {
		startRound(ctx, state.round + 1);
		return;
	}
	endGame(ctx);
}

function leadersOf(totals: Readonly<Scores>, seats: readonly string[]): string {
	const best = Math.max(...seats.map((seat) => totals[seat] ?? 0));
	return seats.filter((seat) => (totals[seat] ?? 0) === best).join("+");
}

/**
 * The match so far: the games each seat won alone, and every seat's points summed over the games.
 *
 * @param state - The state.
 * @returns The wins and the points, in table order.
 *
 * @public
 */
export function matchPoints(state: Readonly<TrickState>): { wins: Scores; points: Scores } {
	const wins = zeros(state.seats);
	const points = zeros(state.seats);
	for (const record of state.results) {
		const winners = record.result.split("+");
		if (winners.length === 1 && winners[0] !== undefined) wins[winners[0]] = (wins[winners[0]] ?? 0) + 1;
		for (const seat of state.seats) points[seat] = (points[seat] ?? 0) + (record.totals[seat] ?? 0);
	}
	return { wins, points };
}

function endGame(ctx: Ctx): void {
	const state = ctx.state;
	const result = leadersOf(state.totals, state.seats);
	const totals = inOrder(state.totals, state.seats);
	state.results.push({ game: state.game, result, totals: { ...totals }, rounds: state.rounds.map((record) => ({ ...record })) });
	state.phase = "idle";
	state.actor = null;
	state.debrief = [...state.seats];
	ctx.emit("game_ended", { game: state.game, result, totals });
	const others = state.seats.filter((seat) => !result.split("+").includes(seat)).map((seat) => `${seat} ${String(state.totals[seat] ?? 0)}`);
	ctx.tryCall(StrategyBrainService, "gameEnded", { game: state.game, summary: `${result} won with ${String(state.totals[result.split("+")[0] ?? ""] ?? 0)} (${others.join(", ")})` });
	if (state.game < ctx.options.games) {
		ctx.schedule.at(ctx.tick + 1, "nextGame");
		return;
	}
	state.finished = true;
	ctx.emit("match_ended", matchPoints(state));
}

/**
 * The move timer acts for the seat on turn: a random legal bid, suit or card from the seeded stream
 * `("trick-play", "forfeit", <action key>)`; too many in a row end the match as invalid.
 *
 * @param ctx - The context.
 *
 * @public
 */
export function forfeit(ctx: Ctx): void {
	const state = ctx.state;
	const seat = state.actor;
	if (seat === null) return;
	const rng = ctx.rng("trick-play", "forfeit", actionKey(state));
	state.forfeits += 1;
	if (state.phase === "bid") applyBid(ctx, seat, rng.int(0, cardsOf(ctx)), true);
	else if (state.phase === "trump") applyTrump(ctx, seat, rng.pick(suitNames(ctx)), true);
	else if (state.phase === "play") applyPlay(ctx, seat, rng.pick(legalCards(handOf(ctx, seat), ledSuit(state), currentTrick(state)?.vetoed)), true);
	const limit = ctx.options.maxConsecutiveForfeits;
	if (limit > 0 && state.forfeits >= limit && !state.finished) {
		state.finished = true;
		state.invalid = true;
		state.phase = "idle";
		state.actor = null;
		ctx.emit("match_ended", { ...matchPoints(state), invalid: true });
	}
}
