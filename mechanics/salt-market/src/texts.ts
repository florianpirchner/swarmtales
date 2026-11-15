// SPDX-License-Identifier: Apache-2.0
/**
 * What a trader reads: the rules, the round (its own goods and secrets, the open book, the shipments to come, the
 * offers and deliveries), the answer of `viewMarket`, and the lines of its next turn with the inbox since the last.
 */
import type { SaltMarketCtx } from "./head.ts";
import { ALL, bookLine, holdingOf, who } from "./market.ts";
import { bundleLine, empty, GOODS, minus, size, type MarketState, type Offer } from "./model.ts";
import { offerIdsText, offersText } from "./own.ts";

type Ctx = SaltMarketCtx;

/**
 * The points of every trader, in seat order: `A01 12, A02 30`.
 *
 * @param scores - Points by trader.
 * @param seats - The traders.
 * @returns The line.
 *
 * @public
 */
export function scoreLine(scores: Readonly<Record<string, number>>, seats: readonly string[]): string {
	return seats.map((seat) => `${seat} ${String(scores[seat] ?? 0)}`).join(", ");
}

// The shipments still to come, public: `A02 (you) 3 spice at the end of round 3 (1 spice held for escrow)`.
function shipmentsLine(state: MarketState, reader: string | undefined): string {
	const coming = state.seats.filter((seat) => !state.arrived.includes(seat) && size(state.profiles[seat]?.shipment ?? empty()) > 0);
	if (coming.length === 0) return "none";
	return coming
		.map((seat) => {
			const profile = state.profiles[seat];
			const reserved = state.reserved[seat] ?? empty();
			return `${who(seat, reader)} ${bundleLine(profile?.shipment ?? empty())} at the end of round ${String(profile?.arrives ?? 0)}${size(reserved) > 0 ? ` (${bundleLine(reserved)} held for escrow)` : ""}`;
		})
		.join("; ");
}

// The offers `reader` can act on or made itself.
function openOffersFor(state: MarketState, reader: string): Offer[] {
	return state.offers.filter((offer) => offer.status === "open" && (offer.from === reader || offer.to === reader || offer.to === ALL));
}

function pledgesLine(state: MarketState, reader: string): string {
	const mine = state.pledges.filter((pledge) => pledge.status === "pending" && (pledge.from === reader || pledge.to === reader));
	if (mine.length === 0) return "none";
	return mine
		.map((pledge) => {
			const left = pledge.escrow ? pledge.goods : minus(pledge.goods, pledge.delivered);
			return `${pledge.id}: ${who(pledge.from, reader)} owes ${who(pledge.to, reader)} ${bundleLine(left)} by the end of round ${String(pledge.due)} (${pledge.escrow ? "escrow" : "promise"})`;
		})
		.join("; ");
}

function privateLine(state: MarketState, seat: string): string {
	const profile = state.profiles[seat];
	if (profile === undefined) return "";
	const values = GOODS.map((good) => `${good} ${String(profile.values[good])}`).join(", ");
	return `Secret, only you know this: each unit is worth to you ${values} points. Your contract: hold at least ${bundleLine(profile.contract)} when the game ends.`;
}

/**
 * The rules of the match, from the prompt `salt-market/rules`.
 *
 * @param ctx - The context of the mechanic.
 * @returns The text.
 *
 * @public
 */
export function rulesText(ctx: Ctx): string {
	const { games, rounds, salt, contractBonus, taxFree, tax, escrowFee, maxOpenOffers, maxSays } = ctx.options;
	const spoil = ctx.options.spoil ? "At the end of every round but the last, one perishable good (announced when the round starts) spoils: every trader holding 2 or more units of it loses one, and a quarter (rounded down) of a stock of 8 or more; a single unit keeps." : "Goods do not spoil in this match.";
	const rotation = ctx.options.rotate ? ` The deals rotate: every ${String(ctx.state.seats.length)} games use the same ${String(ctx.state.seats.length)} positions (goods, values, contract, shipment), passed on one seat each game, so every trader plays every position once.` : "";
	return ctx.prompt("salt-market/rules", { seats: ctx.state.seats.length, games, rounds, salt, saltValue: ctx.options.saltValue, contractBonus, taxFree, tax, escrowFee, maxOpenOffers, maxSays, spoil, rotation });
}

function roundText(ctx: Ctx, seat: string): string {
	const state = ctx.state;
	const offers = openOffersFor(state, seat);
	return ctx.prompt("salt-market/round", {
		round: state.round,
		rounds: ctx.options.rounds,
		spoils: state.spoils === "" ? "nothing spoils at the end of this round" : `${state.spoils} spoils at the end of this round`,
		goods: `${bundleLine(holdingOf(state, seat))}. ${privateLine(state, seat)}`,
		book: bookLine(state, seat),
		shipments: shipmentsLine(state, seat),
		offers: offersText(offers, seat, ctx.options.markOwnOffers === true),
		pledges: pledgesLine(state, seat),
	});
}

/**
 * The answer of `viewMarket`: the match's state, and for a trader the rules, the round and its counters.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @returns The text.
 *
 * @public
 */
export function marketText(ctx: Ctx, resident: string | undefined): string {
	const state = ctx.state;
	if (state.finished) return `The match is over. Points: ${scoreLine(state.scores, state.seats)}.`;
	if (!state.running) return state.game === 0 ? "The first game has not started yet." : `Game ${String(state.game)} is over: ${state.lastResult}. The next game starts soon.`;
	const lines = [`Game ${String(state.game)} of ${String(ctx.options.games)}.`, rulesText(ctx)];
	if (resident !== undefined && state.seats.includes(resident)) {
		lines.push(roundText(ctx, resident));
		lines.push(`Messages left this round: ${String(Math.max(0, ctx.options.maxSays - (state.says[resident] ?? 0)))}. Your points from earlier games: ${String(state.scores[resident] ?? 0)}.`);
	} else lines.push(`Holdings: ${bookLine(state, undefined)}.`);
	return lines.join("\n");
}

/**
 * Whether `resident` has news: lines in its inbox, or a round it has not been told yet.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The resident.
 * @returns True while a game runs and there is news.
 *
 * @public
 */
export const hasNews = (ctx: Ctx, resident: string): boolean => ctx.state.running && ((ctx.state.inbox[resident]?.length ?? 0) > 0 || ctx.state.told[resident] !== ctx.state.round);

/**
 * The lines of a trader's next turn: the game's head and rules once a game, the inbox since the last turn, and the
 * whole round once a round (a short line after that). The inbox is emptied.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The resident.
 * @returns The lines; none outside a game or for a resident without a seat.
 *
 * @public
 */
export function inputLines(ctx: Ctx, resident: string): string[] {
	const state = ctx.state;
	if (!state.running || !state.seats.includes(resident)) return [];
	const lines: string[] = [];
	if (!state.briefed.includes(resident)) {
		state.briefed.push(resident);
		lines.push(`${ctx.prompt("salt-market/game-head", { game: state.game, games: ctx.options.games })} ${rulesText(ctx)}`);
	}
	const inbox = state.inbox[resident] ?? [];
	if (inbox.length > 0) lines.push(`Since your last turn: ${inbox.join(" ")}`);
	state.inbox[resident] = [];
	if (state.told[resident] !== state.round) {
		state.told[resident] = state.round;
		lines.push(roundText(ctx, resident));
	} else {
		const offers = openOffersFor(state, resident);
		lines.push(`Round ${String(state.round)} of ${String(ctx.options.rounds)}. You hold ${bundleLine(holdingOf(state, resident))}. Open offers: ${offerIdsText(offers, resident, ctx.options.markOwnOffers === true)}.`);
	}
	return lines;
}
