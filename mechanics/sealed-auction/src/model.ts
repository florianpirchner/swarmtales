/** The rules of the sealed auction as pure functions (the deal, the resolution of a lot, the reference metrics) and the mechanic's state. */
import { Type, type Static } from "typebox";

/**
 * The kinds of lot:
 * - `first-price`: every bidder has a private value; the highest bid wins and pays its own bid;
 * - `second-price`: private values; the highest bid wins and pays the second-highest bid (or the reserve);
 * - `third-price`: private values; the highest bid wins and pays the third-highest bid (or the reserve):
 *   the equilibrium bids above the value, a format models do not know by heart;
 * - `all-pay`: private values; the highest bid wins, and every bidder pays its own bid;
 * - `common`: the lot has one hidden worth, the same for everyone; each bidder gets a noisy estimate;
 *   the highest bid wins and pays its own bid (the winner's curse lives here).
 */
export const LotKind = Type.Union([Type.Literal("first-price"), Type.Literal("second-price"), Type.Literal("third-price"), Type.Literal("all-pay"), Type.Literal("common")]);
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
	/** Points per coin left at the end of a game (0: unspent coins are worth nothing). */
	readonly coinValue: number;
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
	/** What each seat paid (all-pay: every counting bidder pays its bid; otherwise only the winner). */
	paid: Type.Optional(Type.Record(Type.String(), Type.Integer())),
	/** Each seat's points from the lot: the value won minus what it paid. */
	gains: Type.Optional(Type.Record(Type.String(), Type.Number())),
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
	const nothing = Object.fromEntries(seats.map((seat) => [seat, 0]));
	const base = { number: lot.number, kind: lot.kind, bids: all, missed: [...missed] };
	if (counting.length === 0) return { ...base, price: 0, profit: 0, tie: false, paid: nothing, gains: { ...nothing } };
	const top = Math.max(...counting.map((seat) => all[seat] ?? 0));
	const tied = counting.filter((seat) => all[seat] === top);
	const winner = tied.length === 1 ? (tied[0] ?? "") : pick(tied);
	// The other counting bids, highest first: the runner-up and the third bid.
	const others = counting.filter((seat) => seat !== winner).map((seat) => all[seat] ?? 0).sort((a, b) => b - a);
	const price =
		lot.kind === "second-price" ? Math.max(rules.reserve, others[0] ?? rules.reserve)
		: lot.kind === "third-price" ? Math.max(rules.reserve, others[1] ?? rules.reserve)
		: top;
	const gain = lot.kind === "common" ? (lot.worth ?? 0) : (lot.values[winner] ?? 0);
	const paid = Object.fromEntries(seats.map((seat) => [seat, seat === winner ? price : lot.kind === "all-pay" && counting.includes(seat) ? (all[seat] ?? 0) : 0]));
	const gains = Object.fromEntries(seats.map((seat) => [seat, (seat === winner ? gain : 0) - (paid[seat] ?? 0)]));
	return { ...base, winner, price, profit: gain - price, tie: tied.length > 1, paid, gains };
}

/** What a seat paid for a lot (results from before `paid` existed: the winner paid the price). */
export function paidBy(result: LotResult, seat: string): number {
	if (result.paid !== undefined) return result.paid[seat] ?? 0;
	return result.winner === seat ? result.price : 0;
}

/** A seat's points from a lot. */
export function gainOf(result: LotResult, seat: string): number {
	if (result.gains !== undefined) return result.gains[seat] ?? 0;
	return result.winner === seat ? result.profit : 0;
}

/**
 * The bid of the symmetric risk-neutral equilibrium of a single private-value lot with n bidders and
 * values uniform on [min, max] (budgets ignored). A coin left is worth `coinValue` points, so a coin paid
 * costs 1 + coinValue points: the bid is the equilibrium of the value in coins, u = v / (1 + coinValue).
 * First price: min + (n-1)/n (u - min); second price: u; third price: min + (n-1)/(n-2) (u - min), above
 * the value; all-pay: u x^(n-1) - (max - min) x^n / n with x = (u - min) / (max - min) (all in coins).
 */
export function equilibriumBid(kind: LotKind, value: number, bidders: number, rules: Rules): number {
	const scale = 1 + rules.coinValue;
	const u = value / scale;
	const low = rules.valueMin / scale;
	const high = rules.valueMax / scale;
	if (bidders < 2) return rules.reserve;
	if (kind === "second-price") return u;
	if (kind === "third-price") return bidders < 3 ? u : low + ((bidders - 1) / (bidders - 2)) * (u - low);
	if (kind === "all-pay") {
		const x = high <= low ? 0 : Math.min(1, Math.max(0, (u - low) / (high - low)));
		return u * x ** (bidders - 1) - ((high - low) * x ** bidders) / bidders;
	}
	return low + ((bidders - 1) / bidders) * (u - low);
}

/**
 * The curse-free bid ceiling of a common lot: the expected worth given that the own estimate is the
 * highest of n (uniform errors on [-noise, noise], away from the range ends): estimate - noise (n-1)/(n+1).
 * A bid above it expects a loss whenever it wins.
 */
export function curseFreeCeiling(estimate: number, bidders: number, rules: Rules): number {
	return (estimate - (rules.noise * (bidders - 1)) / (bidders + 1)) / (1 + rules.coinValue);
}

const ratio = (value: number): number => Math.round(value * 1000) / 1000;

function mean(values: readonly number[]): number {
	return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** The measures of an unfamiliar private-value format (third price, all-pay). */
const PrivateFormat = Type.Object({
	lots: Type.Integer(),
	efficiency: Type.Number({ description: "Mean of the winner's value over the highest value at the table (unsold counts 0)." }),
	ratio: Type.Number({ description: "Mean bid over value of the counting bids that the purse did not cap." }),
	equilibriumRatio: Type.Number({ description: "Mean equilibrium bid over value for the same values (single-lot reference, budgets ignored)." }),
	overbids: Type.Integer({ description: "Bids above the own value (in the third-price lot the equilibrium does this)." }),
	passes: Type.Integer({ description: "Bids of 0 (or below the reserve)." }),
	capped: Type.Integer({ description: "Bids that used every coin left and stayed below the equilibrium bid." }),
});

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
		truthfulness: Type.Number({ description: "1 minus the mean of |bid - u| / u over the bids the purse did not cap, u = value / (1 + coinValue) (1: every bid is the dominant one)." }),
		overbids: Type.Integer(),
		underbids: Type.Integer({ description: "Bids below the own value that the purse did not force (passes count)." }),
		capped: Type.Integer({ description: "Bids below the own value that used every coin left: the purse, not the bidder, kept them low." }),
	}),
	thirdPrice: Type.Optional(PrivateFormat),
	allPay: Type.Optional(PrivateFormat),
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
		for (const seat of seats) running[seat] = (running[seat] ?? 0) - paidBy(result, seat);
	}
	const bidsOf = (list: typeof pairs) => list.flatMap(({ lot, result }) => seats.map((seat) => ({ seat, bid: result.bids[seat] ?? 0, value: lot.values[seat] ?? 0, coins: held.get(result.number)?.[seat] ?? rules.purse, lot })));

	const first = ofKind("first-price");
	const firstBids = bidsOf(first).filter((entry) => entry.bid >= rules.reserve && entry.bid > 0 && entry.value > 0);
	const second = ofKind("second-price");
	const secondAll = bidsOf(second).filter((entry) => entry.value > 0);
	const dominant = (value: number): number => value / (1 + rules.coinValue);
	const isCapped = (entry: (typeof secondAll)[number]): boolean => entry.bid < dominant(entry.value) && entry.bid >= entry.coins;
	const secondBids = secondAll.filter((entry) => !isCapped(entry));
	const common = ofKind("common");
	const commonBids = bidsOf(common).filter((entry) => entry.bid >= rules.reserve && entry.bid > 0 && entry.value > 0);
	const sold = common.filter(({ result }) => result.winner !== undefined);
	const privateFormat = (kind: LotKind) => {
		const list = ofKind(kind);
		const all = bidsOf(list).filter((entry) => entry.value > 0);
		const counting = all.filter((entry) => entry.bid >= rules.reserve && entry.bid > 0);
		const capped = (entry: (typeof all)[number]): boolean => entry.bid >= entry.coins && entry.bid < equilibriumBid(kind, entry.value, n, rules);
		const free = counting.filter((entry) => !capped(entry));
		return {
			lots: list.length,
			efficiency: ratio(efficiency(list)),
			ratio: ratio(mean(free.map((entry) => entry.bid / entry.value))),
			equilibriumRatio: ratio(mean(free.map((entry) => equilibriumBid(kind, entry.value, n, rules) / entry.value))),
			overbids: counting.filter((entry) => entry.bid > entry.value).length,
			passes: all.length - counting.length,
			capped: counting.filter(capped).length,
		};
	};

	return {
		firstPrice: {
			lots: first.length,
			efficiency: ratio(efficiency(first)),
			shading: ratio(mean(firstBids.map((entry) => entry.bid / entry.value))),
			equilibriumShading: ratio(mean(firstBids.map((entry) => equilibriumBid("first-price", entry.value, n, rules) / entry.value))),
			overbids: firstBids.filter((entry) => entry.bid > entry.value).length,
		},
		secondPrice: {
			lots: second.length,
			efficiency: ratio(efficiency(second)),
			truthfulness: ratio(1 - mean(secondBids.map((entry) => Math.abs(entry.bid - dominant(entry.value)) / dominant(entry.value)))),
			overbids: secondBids.filter((entry) => entry.bid > entry.value).length,
			underbids: secondBids.filter((entry) => entry.bid < Math.floor(dominant(entry.value))).length,
			capped: secondAll.filter(isCapped).length,
		},
		...(ofKind("third-price").length === 0 ? {} : { thirdPrice: privateFormat("third-price") }),
		...(ofKind("all-pay").length === 0 ? {} : { allPay: privateFormat("all-pay") }),
		common: {
			lots: common.length,
			cursed: sold.filter(({ result }) => result.profit < 0).length,
			winnerProfit: ratio(mean(sold.map(({ result }) => result.profit))),
			bidToEstimate: ratio(mean(commonBids.map((entry) => entry.bid / entry.value))),
			aboveCeiling: commonBids.filter((entry) => entry.bid > curseFreeCeiling(entry.value, n, rules)).length,
		},
		revenue: results.reduce((sum, result) => sum + seats.reduce((paid, seat) => paid + paidBy(result, seat), 0), 0),
		surplus: results.reduce((sum, result) => sum + seats.reduce((gain, seat) => gain + gainOf(result, seat), 0), 0),
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
