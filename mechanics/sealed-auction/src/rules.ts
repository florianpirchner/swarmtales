// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The rules of the sealed auction as pure functions: the deal, the resolution of a lot and the reference metrics. */
import { Type, type Static } from "typebox";

/**
 * The schema of the three kinds of lot:
 * - `first-price`: every bidder has a private value; the highest bid wins and pays its own bid;
 * - `second-price`: private values; the highest bid wins and pays the second-highest bid (or the reserve);
 * - `common`: the lot has one hidden worth, the same for everyone; each bidder gets a noisy estimate;
 *   the highest bid wins and pays its own bid (the winner's curse lives here).
 *
 * @public
 */
export const LotKind = Type.Union([Type.Literal("first-price"), Type.Literal("second-price"), Type.Literal("common")]);
/**
 * A kind of lot: `first-price`, `second-price` or `common`.
 *
 * @public
 */
export type LotKind = Static<typeof LotKind>;

/**
 * The rules of an auction, from the mechanic's options.
 *
 * @public
 */
export interface Rules {
	/** Coins each seat holds at the start of a game; a bid may not exceed the coins left. */
	readonly purse: number;
	/** Private values are drawn uniformly from these whole numbers (both inclusive). */
	readonly valueMin: number;
	/** The largest private value. */
	readonly valueMax: number;
	/** A common lot's hidden worth is drawn uniformly from these whole numbers. */
	readonly worthMin: number;
	/** The largest hidden worth. */
	readonly worthMax: number;
	/** Each estimate of a common lot is the worth plus a whole number from -noise to +noise. */
	readonly noise: number;
	/** The least bid that counts; lower bids (0 is a pass) do not take part. */
	readonly reserve: number;
}

/**
 * The schema of a dealt lot: for private lots `values` holds each seat's value, for a common lot each seat's estimate.
 *
 * @public
 */
export const Lot = Type.Object({
	number: Type.Integer({ minimum: 1 }),
	kind: LotKind,
	values: Type.Record(Type.String(), Type.Integer()),
	worth: Type.Optional(Type.Integer({ description: "A common lot's true worth (hidden until it is sold)." })),
});
/**
 * A dealt lot.
 *
 * @public
 */
export type Lot = Static<typeof Lot>;

/**
 * The schema of a resolved lot: every bid, the winner, the price and the winner's profit.
 *
 * @public
 */
export const LotResult = Type.Object({
	number: Type.Integer(),
	kind: LotKind,
	/** Every seat's bid (0 for a pass or a missed bid). */
	bids: Type.Record(Type.String(), Type.Integer()),
	/** The winner, or undefined when no bid reached the reserve. */
	winner: Type.Optional(Type.String()),
	price: Type.Integer(),
	/** What the winner gained: its value (or the common worth) minus the price. */
	profit: Type.Number(),
	/** True when several highest bids tied and a seeded draw picked the winner. */
	tie: Type.Boolean(),
	/** Seats that did not bid in time (counted as a pass). */
	missed: Type.Array(Type.String()),
});
/**
 * A resolved lot.
 *
 * @public
 */
export type LotResult = Static<typeof LotResult>;

/**
 * The whole numbers a deal draws.
 *
 * @public
 */
export interface DrawSource {
	/** A whole number from `min` to `max`, both inclusive. */
	int(min: number, max: number): number;
}

/**
 * Deals the lots of one game: a private value per seat, or a hidden worth and an estimate per seat.
 *
 * @param kinds - The kinds of the lots, in order.
 * @param seats - The seats.
 * @param rules - The rules of the auction.
 * @param draw - The seeded draw.
 * @returns The lots, numbered from 1.
 *
 * @public
 */
export function dealLots(kinds: readonly LotKind[], seats: readonly string[], rules: Rules, draw: DrawSource): Lot[] {
	return kinds.map((kind, index) => {
		if (kind !== "common") return { number: index + 1, kind, values: Object.fromEntries(seats.map((seat) => [seat, draw.int(rules.valueMin, rules.valueMax)])) };
		const worth = draw.int(rules.worthMin, rules.worthMax);
		return { number: index + 1, kind, worth, values: Object.fromEntries(seats.map((seat) => [seat, worth + draw.int(-rules.noise, rules.noise)])) };
	});
}

// The price of a won lot: the own bid, or in a second-price lot the highest other counting bid, at least the reserve.
function priceOf(lot: Lot, top: number, others: readonly number[], rules: Rules): number {
	if (lot.kind !== "second-price") return top;
	return Math.max(rules.reserve, others.length === 0 ? rules.reserve : Math.max(...others));
}

/**
 * Resolves a lot from the sealed bids. Bids below the reserve do not take part. Ties among the highest
 * bids go to `pick` (a seeded draw). First-price and common lots: the winner pays its bid. Second-price
 * lots: the winner pays the highest other counting bid, at least the reserve.
 *
 * @param lot - The lot.
 * @param bids - The sealed bids by seat; a seat without a bid passes.
 * @param seats - The seats.
 * @param rules - The rules of the auction.
 * @param missed - The seats that did not bid in time.
 * @param pick - The seeded draw among tied seats.
 * @returns The result.
 *
 * @public
 */
export function resolveLot(lot: Lot, bids: Readonly<Record<string, number>>, seats: readonly string[], rules: Rules, missed: readonly string[], pick: (tied: readonly string[]) => string): LotResult {
	const all = Object.fromEntries(seats.map((seat) => [seat, bids[seat] ?? 0]));
	const counting = seats.filter((seat) => (all[seat] ?? 0) >= rules.reserve && (all[seat] ?? 0) > 0);
	const base = { number: lot.number, kind: lot.kind, bids: all, missed: [...missed] };
	if (counting.length === 0) return { ...base, price: 0, profit: 0, tie: false };
	const top = Math.max(...counting.map((seat) => all[seat] ?? 0));
	const tied = counting.filter((seat) => all[seat] === top);
	const winner = tied.length === 1 ? (tied[0] ?? "") : pick(tied);
	const others = counting.filter((seat) => seat !== winner).map((seat) => all[seat] ?? 0);
	const price = priceOf(lot, top, others, rules);
	const gain = lot.kind === "common" ? (lot.worth ?? 0) : (lot.values[winner] ?? 0);
	return { ...base, winner, price, profit: gain - price, tie: tied.length > 1 };
}

/**
 * The bid of the symmetric risk-neutral equilibrium of a single first-price lot with uniform values on [min, max]:
 * min + (n-1)/n (v - min).
 *
 * @param value - The bidder's value.
 * @param bidders - The number of bidders.
 * @param rules - The rules of the auction.
 * @returns The equilibrium bid; the reserve for fewer than two bidders.
 *
 * @public
 */
export function equilibriumBid(value: number, bidders: number, rules: Rules): number {
	if (bidders < 2) return rules.reserve;
	return rules.valueMin + ((bidders - 1) / bidders) * (value - rules.valueMin);
}

/**
 * The curse-free bid ceiling of a common lot: the expected worth given that the own estimate is the
 * highest of n (uniform errors on [-noise, noise], away from the range ends): estimate - noise (n-1)/(n+1).
 * A bid above it expects a loss whenever it wins.
 *
 * @param estimate - The bidder's estimate.
 * @param bidders - The number of bidders.
 * @param rules - The rules of the auction.
 * @returns The ceiling.
 *
 * @public
 */
export function curseFreeCeiling(estimate: number, bidders: number, rules: Rules): number {
	return estimate - (rules.noise * (bidders - 1)) / (bidders + 1);
}
