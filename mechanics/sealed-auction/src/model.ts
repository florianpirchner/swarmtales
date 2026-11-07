/** The rules of the sealed auction as pure functions (the deal, the resolution of a lot, the reference metrics) and the mechanic's state. */
import { Type, type Static } from "typebox";

/**
 * The three kinds of lot:
 * - `first-price`: every bidder has a private value; the highest bid wins and pays its own bid;
 * - `second-price`: private values; the highest bid wins and pays the second-highest bid (or the reserve);
 * - `common`: the lot has one hidden worth, the same for everyone; each bidder gets a noisy estimate;
 *   the highest bid wins and pays its own bid (the winner's curse lives here).
 */
export const LotKind = Type.Union([Type.Literal("first-price"), Type.Literal("second-price"), Type.Literal("common")]);
export type LotKind = Static<typeof LotKind>;

export interface Rules {
	/** Coins each seat holds at the start of a game; a bid may not exceed the coins left. */
	readonly purse: number;
	/** Private values are drawn uniformly from these whole numbers (both inclusive). */
	readonly valueMin: number;
	readonly valueMax: number;
	/** A common lot's hidden worth is drawn uniformly from these whole numbers. */
	readonly worthMin: number;
	readonly worthMax: number;
	/** Each estimate of a common lot is the worth plus a whole number from -noise to +noise. */
	readonly noise: number;
	/** The least bid that counts; lower bids (0 is a pass) do not take part. */
	readonly reserve: number;
}

/** A dealt lot: for private lots `values` holds each seat's value, for a common lot each seat's estimate. */
export const Lot = Type.Object({
	number: Type.Integer({ minimum: 1 }),
	kind: LotKind,
	values: Type.Record(Type.String(), Type.Integer()),
	worth: Type.Optional(Type.Integer({ description: "A common lot's true worth (hidden until it is sold)." })),
});
export type Lot = Static<typeof Lot>;

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
export type LotResult = Static<typeof LotResult>;

export interface DrawSource {
	int(min: number, max: number): number;
}

/** Deals the lots of one game: a private value per seat, or a hidden worth and an estimate per seat. */
export function dealLots(kinds: readonly LotKind[], seats: readonly string[], rules: Rules, draw: DrawSource): Lot[] {
	return kinds.map((kind, index) => {
		if (kind !== "common") return { number: index + 1, kind, values: Object.fromEntries(seats.map((seat) => [seat, draw.int(rules.valueMin, rules.valueMax)])) };
		const worth = draw.int(rules.worthMin, rules.worthMax);
		return { number: index + 1, kind, worth, values: Object.fromEntries(seats.map((seat) => [seat, worth + draw.int(-rules.noise, rules.noise)])) };
	});
}

/**
 * Resolves a lot from the sealed bids. Bids below the reserve do not take part. Ties among the highest
 * bids go to `pick` (a seeded draw). First-price and common lots: the winner pays its bid. Second-price
 * lots: the winner pays the highest other counting bid, at least the reserve.
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
	const price = lot.kind === "second-price" ? Math.max(rules.reserve, others.length === 0 ? rules.reserve : Math.max(...others)) : top;
	const gain = lot.kind === "common" ? (lot.worth ?? 0) : (lot.values[winner] ?? 0);
	return { ...base, winner, price, profit: gain - price, tie: tied.length > 1 };
}

/** The bid of the symmetric risk-neutral equilibrium of a single first-price lot with uniform values on [min, max]: min + (n-1)/n (v - min). */
export function equilibriumBid(value: number, bidders: number, rules: Rules): number {
	if (bidders < 2) return rules.reserve;
	return rules.valueMin + ((bidders - 1) / bidders) * (value - rules.valueMin);
}

/**
 * The curse-free bid ceiling of a common lot: the expected worth given that the own estimate is the
 * highest of n (uniform errors on [-noise, noise], away from the range ends): estimate - noise (n-1)/(n+1).
 * A bid above it expects a loss whenever it wins.
 */
export function curseFreeCeiling(estimate: number, bidders: number, rules: Rules): number {
	return estimate - (rules.noise * (bidders - 1)) / (bidders + 1);
}

const ratio = (value: number): number => Math.round(value * 1000) / 1000;

function mean(values: readonly number[]): number {
	return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

export const Reference = Type.Object({
	firstPrice: Type.Object({
		lots: Type.Integer(),
		efficiency: Type.Number({ description: "Mean of the winner's value over the highest value at the table (unsold counts 0)." }),
		shading: Type.Number({ description: "Mean bid over value of the counting bids." }),
		equilibriumShading: Type.Number({ description: "Mean equilibrium bid over value for the same values (single-lot reference, budgets ignored)." }),
		overbids: Type.Integer({ description: "Bids above the bidder's own value." }),
	}),
	secondPrice: Type.Object({
		lots: Type.Integer(),
		efficiency: Type.Number(),
		truthfulness: Type.Number({ description: "1 minus the mean of |bid - value| / value over the bids the purse did not cap (1: every bid equals the value, the dominant strategy)." }),
		overbids: Type.Integer(),
		underbids: Type.Integer({ description: "Bids below the own value that the purse did not force (passes count)." }),
		capped: Type.Integer({ description: "Bids below the own value that used every coin left: the purse, not the bidder, kept them low." }),
	}),
	common: Type.Object({
		lots: Type.Integer(),
		cursed: Type.Integer({ description: "Sold common lots whose price was above the worth (the winner lost)." }),
		winnerProfit: Type.Number({ description: "Mean profit of the winners of common lots." }),
		bidToEstimate: Type.Number({ description: "Mean bid over the bidder's estimate (counting bids)." }),
		aboveCeiling: Type.Integer({ description: "Counting bids above the curse-free ceiling (estimate - noise (n-1)/(n+1))." }),
	}),
	revenue: Type.Number({ description: "Coins the seller took in the game." }),
	surplus: Type.Number({ description: "The bidders' total profit in the game." }),
	unspent: Type.Number({ description: "Mean share of the purse left unspent at the end of the game." }),
	missed: Type.Integer(),
});
export type Reference = Static<typeof Reference>;

/** The game's distance from the single-lot references, for the human and the report only. */
export function referenceOf(lots: readonly Lot[], results: readonly LotResult[], seats: readonly string[], rules: Rules, coins: Readonly<Record<string, number>>): Reference {
	const n = seats.length;
	const pairs = results.flatMap((result) => {
		const lot = lots.find((candidate) => candidate.number === result.number);
		return lot === undefined ? [] : [{ lot, result }];
	});
	const ofKind = (kind: LotKind) => pairs.filter((pair) => pair.lot.kind === kind);
	const efficiency = (list: typeof pairs): number =>
		mean(list.map(({ lot, result }) => {
			const best = Math.max(...seats.map((seat) => lot.values[seat] ?? 0));
			return result.winner === undefined || best <= 0 ? 0 : (lot.values[result.winner] ?? 0) / best;
		}));
	// The coins each seat held when each lot opened: the purse minus the prices it paid before.
	const held = new Map<number, Readonly<Record<string, number>>>();
	const running: Record<string, number> = Object.fromEntries(seats.map((seat) => [seat, rules.purse]));
	for (const result of results) {
		held.set(result.number, { ...running });
		if (result.winner !== undefined) running[result.winner] = (running[result.winner] ?? 0) - result.price;
	}
	const bidsOf = (list: typeof pairs) => list.flatMap(({ lot, result }) => seats.map((seat) => ({ seat, bid: result.bids[seat] ?? 0, value: lot.values[seat] ?? 0, coins: held.get(result.number)?.[seat] ?? rules.purse, lot })));

	const first = ofKind("first-price");
	const firstBids = bidsOf(first).filter((entry) => entry.bid >= rules.reserve && entry.bid > 0 && entry.value > 0);
	const second = ofKind("second-price");
	const secondAll = bidsOf(second).filter((entry) => entry.value > 0);
	const isCapped = (entry: (typeof secondAll)[number]): boolean => entry.bid < entry.value && entry.bid >= entry.coins;
	const secondBids = secondAll.filter((entry) => !isCapped(entry));
	const common = ofKind("common");
	const commonBids = bidsOf(common).filter((entry) => entry.bid >= rules.reserve && entry.bid > 0 && entry.value > 0);
	const sold = common.filter(({ result }) => result.winner !== undefined);

	return {
		firstPrice: {
			lots: first.length,
			efficiency: ratio(efficiency(first)),
			shading: ratio(mean(firstBids.map((entry) => entry.bid / entry.value))),
			equilibriumShading: ratio(mean(firstBids.map((entry) => equilibriumBid(entry.value, n, rules) / entry.value))),
			overbids: firstBids.filter((entry) => entry.bid > entry.value).length,
		},
		secondPrice: {
			lots: second.length,
			efficiency: ratio(efficiency(second)),
			truthfulness: ratio(1 - mean(secondBids.map((entry) => Math.abs(entry.bid - entry.value) / entry.value))),
			overbids: secondBids.filter((entry) => entry.bid > entry.value).length,
			underbids: secondBids.filter((entry) => entry.bid < entry.value).length,
			capped: secondAll.filter(isCapped).length,
		},
		common: {
			lots: common.length,
			cursed: sold.filter(({ result }) => result.profit < 0).length,
			winnerProfit: ratio(mean(sold.map(({ result }) => result.profit))),
			bidToEstimate: ratio(mean(commonBids.map((entry) => entry.bid / entry.value))),
			aboveCeiling: commonBids.filter((entry) => entry.bid > curseFreeCeiling(entry.value, n, rules)).length,
		},
		revenue: results.reduce((sum, result) => sum + (result.winner === undefined ? 0 : result.price), 0),
		surplus: results.reduce((sum, result) => sum + (result.winner === undefined ? 0 : result.profit), 0),
		unspent: ratio(rules.purse <= 0 ? 0 : mean(seats.map((seat) => (coins[seat] ?? 0) / rules.purse))),
		missed: results.reduce((sum, result) => sum + result.missed.length, 0),
	};
}

export interface AuctionState {
	seats: string[];
	/** The running (or last) game, from 1; 0 before the first. */
	game: number;
	/** The lots of the running game (values hidden from the residents). */
	lots: Lot[];
	/** The open lot, from 1; 0 before the first. */
	lot: number;
	/** True while a lot takes bids. */
	open: boolean;
	/** The minute the open lot opened (its deadline counts from it). */
	opened: number;
	owing: string[];
	/** Residents told of the open lot in a turn line. */
	told: string[];
	/** Residents told of the game's rules. */
	briefed: string[];
	bids: Record<string, number>;
	reasons: Record<string, string>;
	results: LotResult[];
	/** Coins left in the running game. */
	coins: Record<string, number>;
	scores: Record<string, number>;
	gameScores: Record<string, number>;
	running: boolean;
	finished: boolean;
	held: boolean;
	due: boolean;
}

export const AuctionSlice = Type.Object({
	seats: Type.Array(Type.String()),
	game: Type.Integer(),
	lots: Type.Array(Lot),
	lot: Type.Integer(),
	open: Type.Boolean(),
	opened: Type.Integer(),
	owing: Type.Array(Type.String()),
	told: Type.Array(Type.String()),
	briefed: Type.Array(Type.String()),
	bids: Type.Record(Type.String(), Type.Number()),
	reasons: Type.Record(Type.String(), Type.String()),
	results: Type.Array(LotResult),
	coins: Type.Record(Type.String(), Type.Number()),
	scores: Type.Record(Type.String(), Type.Number()),
	gameScores: Type.Record(Type.String(), Type.Number()),
	running: Type.Boolean(),
	finished: Type.Boolean(),
	held: Type.Boolean(),
	due: Type.Boolean(),
});
