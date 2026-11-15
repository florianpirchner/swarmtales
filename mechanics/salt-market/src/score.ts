// SPDX-License-Identifier: Apache-2.0
/**
 * The end of a game: every trader's points and contract, the reference of `market_game_scored` against the optimum
 * (for the human only: efficiency, the gain over idle play, fairness, the promises kept), the result line for the
 * strategy brain, and the next game or the end of the match.
 */
import { StrategyBrainService } from "@swarmtales/mechanic-strategy-brain/contract";
import type { SaltMarketCtx } from "./head.ts";
import { holdingOf, statsOf } from "./market.ts";
import { bundleLine, empty, gini, goodsOf, idleHolding, optimumOf, plus, scoreOf, type MarketState, type Profile, type Reference, type Rules } from "./model.ts";
import { scoreLine } from "./texts.ts";

type Ctx = SaltMarketCtx;
type SeatReference = Reference["seats"][string];

const rulesOf = (ctx: Ctx): Rules => ({ contractBonus: ctx.options.contractBonus });
const round3 = (value: number): number => Math.round(value * 1000) / 1000;
const NO_PROFILE: Profile = { values: empty(), contract: empty(), start: empty(), shipment: empty(), arrives: 0 };

// One trader's line of the reference: its start and end score, its counters and its plain promises.
function seatReference(state: MarketState, seat: string, profile: Profile, rules: Rules): SeatReference {
	const start = scoreOf(profile, goodsOf(profile), rules).total;
	const end = scoreOf(profile, holdingOf(state, seat), rules);
	const stats = statsOf(state, seat);
	const promises = state.pledges.filter((pledge) => pledge.from === seat && !pledge.escrow);
	return {
		start,
		score: end.total,
		surplus: end.total - start,
		met: end.met,
		trades: stats.trades,
		offers: stats.offers,
		says: stats.says,
		taxPaid: stats.taxPaid,
		feesPaid: stats.feesPaid,
		spoiled: state.spoiled[seat] ?? 0,
		promises: promises.length,
		escrows: state.pledges.filter((pledge) => pledge.from === seat && pledge.escrow).length,
		kept: promises.filter((pledge) => pledge.status === "kept").length,
		broken: promises.filter((pledge) => pledge.status === "broken").length,
	};
}

/**
 * The game's reference: every trader's line, and the joint score against the optimum of the start supply, of the end
 * supply and of idle play.
 *
 * @param ctx - The context of the mechanic, at the game's end.
 * @returns The reference.
 *
 * @public
 */
export function referenceOf(ctx: Ctx): Reference {
	const state = ctx.state;
	const rules = rulesOf(ctx);
	const startSupply = state.seats.reduce((sum, seat) => plus(sum, goodsOf(state.profiles[seat] ?? NO_PROFILE)), empty());
	// Goods held in escrow at the end were delivered before scoring; nothing is still in the bank.
	const endSupply = state.seats.reduce((sum, seat) => plus(sum, holdingOf(state, seat)), empty());
	const optimum = optimumOf(state.profiles, startSupply, rules);
	const endOptimum = optimumOf(state.profiles, endSupply, rules);
	const seats: Record<string, SeatReference> = {};
	for (const seat of state.seats) {
		const profile = state.profiles[seat];
		if (profile !== undefined) seats[seat] = seatReference(state, seat, profile, rules);
	}
	const startTotal = Object.values(seats).reduce((sum, seat) => sum + seat.start, 0);
	const total = Object.values(seats).reduce((sum, seat) => sum + seat.score, 0);
	const gains = optimum.total - startTotal;
	const idleTotal = state.seats.reduce((sum, seat) => {
		const profile = state.profiles[seat];
		return profile === undefined ? sum : sum + scoreOf(profile, idleHolding(profile, state.spoilLog), rules).total;
	}, 0);
	return {
		seats,
		startTotal,
		total,
		optimum: optimum.total,
		optimumContracts: [...optimum.contracts],
		endOptimum: endOptimum.total,
		efficiency: gains <= 0 ? 0 : round3((total - startTotal) / gains),
		idleTotal,
		gainOverIdle: optimum.total - idleTotal <= 0 ? 0 : round3((total - idleTotal) / (optimum.total - idleTotal)),
		allocative: endOptimum.total <= 0 ? 0 : round3(total / endOptimum.total),
		gini: gini(Object.values(seats).map((seat) => seat.surplus)),
		contractsMet: Object.values(seats).filter((seat) => seat.met).length,
		trades: state.offers.filter((offer) => offer.status === "accepted").length,
	};
}

// Every trader's points of this game, added to the match; returns the traders who filled their contract.
function scoreGame(ctx: Ctx): string[] {
	const state = ctx.state;
	const rules = rulesOf(ctx);
	const met: string[] = [];
	for (const seat of state.seats) {
		const profile = state.profiles[seat];
		const result = profile === undefined ? { total: 0, met: false } : scoreOf(profile, holdingOf(state, seat), rules);
		state.gameScores[seat] = result.total;
		if (result.met) met.push(seat);
		state.scores[seat] = (state.scores[seat] ?? 0) + result.total;
	}
	return met;
}

/**
 * Ends the game: the scores, `market_game_ended` and `market_game_scored`, the result line for the strategy brain,
 * then `market_match_ended` after the last game or the job `nextGame` at the next tick.
 *
 * @param ctx - The context of the mechanic.
 *
 * @public
 */
export function endGame(ctx: Ctx): void {
	const state = ctx.state;
	state.running = false;
	const met = scoreGame(ctx);
	ctx.emit("market_game_ended", { game: state.game, holdings: structuredClone(state.holdings), profiles: structuredClone(state.profiles), scores: { ...state.gameScores }, met, totals: { ...state.scores } });
	ctx.emit("market_game_scored", { game: state.game, reference: referenceOf(ctx) });
	const contracts = state.seats.map((seat) => `${seat} wanted ${bundleLine(state.profiles[seat]?.contract ?? empty())} (${met.includes(seat) ? "filled" : "not filled"})`).join("; ");
	const broken = state.pledges.filter((pledge) => pledge.status === "broken").map((pledge) => `${pledge.from} to ${pledge.to}`);
	state.lastResult = `points ${scoreLine(state.gameScores, state.seats)}; contracts: ${contracts}; trades ${String(state.offers.filter((offer) => offer.status === "accepted").length)}; broken promises: ${broken.length === 0 ? "none" : broken.join(", ")}`;
	const last = state.game >= ctx.options.games;
	if (last) state.finished = true;
	ctx.tryCall(StrategyBrainService, "gameEnded", { game: state.game, summary: state.lastResult });
	if (last) ctx.emit("market_match_ended", { scores: { ...state.scores } });
	else ctx.schedule.at(ctx.tick + 1, "nextGame");
}
