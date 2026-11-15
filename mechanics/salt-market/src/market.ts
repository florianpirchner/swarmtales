// SPDX-License-Identifier: Apache-2.0
/**
 * What every part of Salt Market shares: the holdings and counters of a trader, the queued lines of its next turn,
 * how a trader id is read and written, the market's open or closed state, and the lines of an offer and of the book.
 */
import type { Refusal } from "@swarmtales/contracts";
import { refuse } from "@swarmtales/sdk";
import type { SaltMarketCtx } from "./head.ts";
import { bundleLine, empty, type Bundle, type MarketState, type Offer } from "./model.ts";

type Ctx = SaltMarketCtx;

/**
 * The addressee of an open offer or a message to everyone.
 *
 * @public
 */
export const ALL = "all";

/**
 * The counters of one trader in one game.
 *
 * @public
 */
export type TraderStats = MarketState["stats"][string];

/**
 * What a trader holds now.
 *
 * @param state - The state of the mechanic.
 * @param seat - The trader.
 * @returns Its holding, or the empty bundle.
 *
 * @public
 */
export const holdingOf = (state: MarketState, seat: string): Bundle => state.holdings[seat] ?? empty();

/**
 * The counters of a trader in this game, created when missing.
 *
 * @param state - The state of the mechanic.
 * @param seat - The trader.
 * @returns The counters, kept in the state.
 *
 * @public
 */
export function statsOf(state: MarketState, seat: string): TraderStats {
	const stats = state.stats[seat] ?? { trades: 0, offers: 0, says: 0, taxPaid: 0, feesPaid: 0 };
	state.stats[seat] = stats;
	return stats;
}

/**
 * Queues a line for the next turn of each of `seats`.
 *
 * @param ctx - The context of the mechanic.
 * @param seats - The traders who get the line.
 * @param line - The line.
 *
 * @public
 */
export function tell(ctx: Ctx, seats: readonly string[], line: string): void {
	for (const seat of seats) {
		const inbox = ctx.state.inbox[seat] ?? [];
		inbox.push(line);
		ctx.state.inbox[seat] = inbox;
	}
}

/**
 * The other traders.
 *
 * @param state - The state of the mechanic.
 * @param seat - The trader.
 * @returns Every trader but `seat`, in seat order.
 *
 * @public
 */
export const others = (state: MarketState, seat: string): string[] => state.seats.filter((other) => other !== seat);

/**
 * `A02 (you)` for the reader, the bare id otherwise.
 *
 * @param seat - The trader named.
 * @param reader - The trader who reads the line, or undefined.
 * @returns The name.
 *
 * @public
 */
export const who = (seat: string, reader: string | undefined): string => (seat === reader ? `${seat} (you)` : seat);

/**
 * An id as the market writes it.
 *
 * @param id - The id as a caller wrote it.
 * @returns The id trimmed and in upper case.
 *
 * @public
 */
export const normalize = (id: string): string => id.trim().toUpperCase();

/**
 * The trader a caller named.
 *
 * @param state - The state of the mechanic.
 * @param id - The id as the caller wrote it.
 * @returns The trader, or undefined when there is none of that id.
 *
 * @public
 */
export const seatOf = (state: MarketState, id: string): string | undefined => state.seats.find((seat) => seat === normalize(id));

/**
 * The refusal of a caller without a seat.
 *
 * @returns The refusal `NOT_A_TRADER`.
 *
 * @public
 */
export const noSeat = (): Refusal => refuse("NOT_A_TRADER", "You have no seat at this market.");

/**
 * Why `resident` may not trade at all right now.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @returns The refusal, or undefined when the market is open to the caller.
 *
 * @public
 */
export function closed(ctx: Ctx, resident: string | undefined): Refusal | undefined {
	const state = ctx.state;
	if (state.finished) return refuse("MATCH_OVER", "The match is over.");
	if (!state.running) return refuse("MARKET_CLOSED", "The market is closed between games; wait for the next game.");
	if (resident === undefined || !state.seats.includes(resident)) return noSeat();
	return undefined;
}

/**
 * The caller as a trader of the running game.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @returns The trader, or the refusal of {@link closed}.
 *
 * @public
 */
export function traderOf(ctx: Ctx, resident: string | undefined): string | Refusal {
	const shut = closed(ctx, resident);
	if (shut !== undefined) return shut;
	return resident ?? noSeat();
}

/**
 * An offer in words, as `reader` reads it.
 *
 * @param offer - The offer.
 * @param reader - The trader who reads the line, or undefined.
 * @returns The line.
 *
 * @public
 */
export function offerLine(offer: Offer, reader: string | undefined): string {
	const to = offer.to === ALL ? "anyone" : who(offer.to, reader);
	const later = offer.later === undefined ? "" : `; later, by the end of round ${String(offer.later.round)}, ${who(offer.from, reader)} delivers ${bundleLine(offer.later.goods)} (${offer.later.escrow ? "held in escrow by the bank" : "a promise, not escrowed"})`;
	const note = offer.note === "" ? "" : ` Note: "${offer.note}"`;
	return `${offer.id} from ${who(offer.from, reader)} to ${to}: ${who(offer.from, reader)} gives ${bundleLine(offer.give)} and wants ${bundleLine(offer.get)}${later}.${note}`;
}

/**
 * The bank's open book: every trader's holding.
 *
 * @param state - The state of the mechanic.
 * @param reader - The trader who reads the line, or undefined.
 * @returns The line.
 *
 * @public
 */
export function bookLine(state: MarketState, reader: string | undefined): string {
	return state.seats.map((seat) => `${who(seat, reader)}: ${bundleLine(holdingOf(state, seat))}`).join("; ");
}
