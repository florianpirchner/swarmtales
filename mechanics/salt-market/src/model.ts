/**
 * The rules of Salt Market as pure functions (the deal, bundles, the score, the optimum, fairness) and
 * the mechanic's state as a Typebox schema (the snapshot slice).
 */
import { Type, type Static } from "typebox";

/** The five goods. Salt is the preservative: it never spoils and is worth the same to everyone. */
export const GOODS = ["salt", "cloth", "copper", "spice", "wax"] as const;
export type Good = (typeof GOODS)[number];
/** The four goods that spoil and that contracts ask for. */
export const PERISHABLE = ["cloth", "copper", "spice", "wax"] as const;

const count = (description: string) => Type.Integer({ minimum: 0, description });
export const Bundle = Type.Object({ salt: count("Salt."), cloth: count("Cloth."), copper: count("Copper."), spice: count("Spice."), wax: count("Wax.") });
export type Bundle = Static<typeof Bundle>;

export const empty = (): Bundle => ({ salt: 0, cloth: 0, copper: 0, spice: 0, wax: 0 });
export const copyBundle = (bundle: Bundle): Bundle => ({ ...bundle });
export const size = (bundle: Bundle): number => GOODS.reduce((sum, good) => sum + bundle[good], 0);
export const plus = (a: Bundle, b: Bundle): Bundle => ({ salt: a.salt + b.salt, cloth: a.cloth + b.cloth, copper: a.copper + b.copper, spice: a.spice + b.spice, wax: a.wax + b.wax });
export const minus = (a: Bundle, b: Bundle): Bundle => ({ salt: a.salt - b.salt, cloth: a.cloth - b.cloth, copper: a.copper - b.copper, spice: a.spice - b.spice, wax: a.wax - b.wax });
/** Whether `holding` covers `need` good by good. */
export const covers = (holding: Bundle, need: Bundle): boolean => GOODS.every((good) => holding[good] >= need[good]);
/** A bundle from optional counts (a tool's parameters); negative or fractional counts become 0. */
export function bundleOf(partial: Partial<Readonly<Record<Good, number>>> | undefined): Bundle {
	const out = empty();
	if (partial === undefined) return out;
	for (const good of GOODS) {
		const value = partial[good];
		out[good] = value === undefined || !Number.isFinite(value) ? 0 : Math.max(0, Math.floor(value));
	}
	return out;
}

/** A bundle in words: `2 cloth, 1 salt`, or `nothing`. */
export function bundleLine(bundle: Bundle): string {
	const parts = GOODS.filter((good) => bundle[good] > 0).map((good) => `${String(bundle[good])} ${good}`);
	return parts.length === 0 ? "nothing" : parts.join(", ");
}

/** A trader's secret side of a game: what each unit is worth to it, and the contract it wants to fill. */
export const Profile = Type.Object({
	values: Bundle,
	contract: Bundle,
	start: Bundle,
});
export type Profile = Static<typeof Profile>;

export interface Rules {
	/** Points for holding at least the contract bundle at the game's end. */
	readonly contractBonus: number;
}

/** A trader's points for a holding: every unit at its own value, plus the contract bonus when the contract is filled. */
export function scoreOf(profile: Profile, holding: Bundle, rules: Rules): { readonly goods: number; readonly met: boolean; readonly total: number } {
	const goods = GOODS.reduce((sum, good) => sum + holding[good] * profile.values[good], 0);
	const met = covers(holding, profile.contract);
	return { goods, met, total: goods + (met ? rules.contractBonus : 0) };
}

/** Minimal seeded randomness (the host's `RandomSource`). */
export interface Draw {
	next(): number;
	int(min: number, max: number): number;
	shuffle<T>(items: readonly T[]): T[];
}

/**
 * The deal of one game. Every trader gets a value of 1 to 4 for each perishable good (salt is worth 1
 * to everyone), a contract of three perishable goods with 2 to 4 units each, and a start bundle: salt
 * for everyone, and each unit of a perishable good dealt at random, three times as likely to a trader
 * whose contract does not ask for it. So nobody can fill a contract without trading, and the goods each
 * trader needs sit mostly with the others. The supply of a good is the joint demand of the contracts
 * plus `slack`, so all four contracts can be filled at once if nothing spoils.
 */
export function dealOf(seats: readonly string[], draw: Draw, salt: number, slack: number): Record<string, Profile> {
	const profiles: Record<string, Profile> = {};
	for (const seat of seats) {
		const values = empty();
		values.salt = 1;
		for (const good of PERISHABLE) values[good] = draw.int(1, 4);
		const contract = empty();
		for (const good of draw.shuffle(PERISHABLE).slice(0, 3)) contract[good] = draw.int(2, 4);
		const start = empty();
		start.salt = salt;
		profiles[seat] = { values, contract, start };
	}
	for (const good of PERISHABLE) {
		const demand = seats.reduce((sum, seat) => sum + (profiles[seat]?.contract[good] ?? 0), 0);
		const supply = Math.max(4, demand + slack);
		const weights = seats.map((seat) => ((profiles[seat]?.contract[good] ?? 0) > 0 ? 1 : 3));
		const total = weights.reduce((sum, weight) => sum + weight, 0);
		for (let unit = 0; unit < supply; unit++) {
			let roll = draw.next() * total;
			let index = 0;
			while (index < weights.length - 1 && roll >= (weights[index] ?? 0)) {
				roll -= weights[index] ?? 0;
				index += 1;
			}
			const profile = profiles[seats[index] ?? ""];
			if (profile !== undefined) profile.start[good] += 1;
		}
	}
	return profiles;
}

/** The units a holding loses when `good` spoils: a quarter of its stock, rounded down (three or fewer lose nothing). */
export const spoilLoss = (holding: Bundle, good: Good): number => (good === "salt" ? 0 : Math.floor(holding[good] / 4));

/**
 * The best joint score of a supply split among the traders (the reference optimum): for every subset of
 * contracts that the supply can fill at once, each filled contract keeps its bundle, and every other
 * unit goes to the trader who values it most. Exact, since a unit beyond the contracts adds its value
 * linearly; 2^n subsets for n traders.
 */
export function optimumOf(profiles: Readonly<Record<string, Profile>>, supply: Bundle, rules: Rules): { readonly total: number; readonly contracts: readonly string[] } {
	const seats = Object.keys(profiles);
	let best: { total: number; contracts: readonly string[] } = { total: -Infinity, contracts: [] };
	for (let mask = 0; mask < 1 << seats.length; mask++) {
		const chosen = seats.filter((_, index) => (mask & (1 << index)) !== 0);
		const needed = chosen.reduce((sum, seat) => plus(sum, profiles[seat]?.contract ?? empty()), empty());
		if (!covers(supply, needed)) continue;
		let total = chosen.length * rules.contractBonus;
		for (const good of GOODS) {
			for (const seat of chosen) total += (profiles[seat]?.contract[good] ?? 0) * (profiles[seat]?.values[good] ?? 0);
			const top = Math.max(0, ...seats.map((seat) => profiles[seat]?.values[good] ?? 0));
			total += (supply[good] - needed[good]) * top;
		}
		if (total > best.total) best = { total, contracts: chosen };
	}
	return best.total === -Infinity ? { total: 0, contracts: [] } : best;
}

/** The Gini coefficient of non-negative amounts (0: all equal; towards 1: one takes all); 0 for an empty or all-zero list. */
export function gini(amounts: readonly number[]): number {
	const values = amounts.map((value) => Math.max(0, value));
	const sum = values.reduce((total, value) => total + value, 0);
	if (values.length === 0 || sum === 0) return 0;
	let diff = 0;
	for (const a of values) for (const b of values) diff += Math.abs(a - b);
	return Math.round((diff / (2 * values.length * sum)) * 1000) / 1000;
}

export const Later = Type.Object({
	goods: Bundle,
	round: Type.Integer({ minimum: 1, description: "The round at whose end the goods are due." }),
	escrow: Type.Boolean({ description: "True: the bank holds the goods from the trade on and delivers them; false: a promise only, kept or broken by the proposer." }),
});
export type Later = Static<typeof Later>;

export const OfferStatus = Type.Union([Type.Literal("open"), Type.Literal("accepted"), Type.Literal("declined"), Type.Literal("withdrawn"), Type.Literal("expired")]);

export const Offer = Type.Object({
	id: Type.String(),
	game: Type.Integer(),
	round: Type.Integer(),
	from: Type.String(),
	to: Type.String({ description: "A trader, or `all` for an open offer anyone may take." }),
	give: Bundle,
	get: Bundle,
	later: Type.Optional(Later),
	note: Type.String(),
	status: OfferStatus,
	by: Type.Optional(Type.String({ description: "Who accepted it." })),
});
export type Offer = Static<typeof Offer>;

export const PromiseStatus = Type.Union([Type.Literal("pending"), Type.Literal("kept"), Type.Literal("broken")]);

export const Pledge = Type.Object({
	id: Type.String(),
	offer: Type.String(),
	game: Type.Integer(),
	from: Type.String(),
	to: Type.String(),
	goods: Bundle,
	due: Type.Integer(),
	escrow: Type.Boolean(),
	delivered: Bundle,
	status: PromiseStatus,
});
export type Pledge = Static<typeof Pledge>;

export const SeatReference = Type.Object({
	start: Type.Number({ description: "Points of the start bundle (no trade)." }),
	score: Type.Number(),
	surplus: Type.Number({ description: "score - start." }),
	met: Type.Boolean(),
	trades: Type.Integer(),
	offers: Type.Integer(),
	says: Type.Integer(),
	taxPaid: Type.Integer(),
	feesPaid: Type.Integer(),
	spoiled: Type.Integer({ description: "Units this trader lost to spoilage." }),
	promises: Type.Integer({ description: "Promises without escrow this trader made." }),
	kept: Type.Integer(),
	broken: Type.Integer(),
});

export const Reference = Type.Object({
	seats: Type.Record(Type.String(), SeatReference),
	startTotal: Type.Number(),
	total: Type.Number(),
	optimum: Type.Number({ description: "The best joint score of the start supply (spoilage ignored: an upper bound)." }),
	optimumContracts: Type.Array(Type.String()),
	endOptimum: Type.Number({ description: "The best joint score of the goods left at the end." }),
	efficiency: Type.Number({ description: "(total - startTotal) / (optimum - startTotal): the share of the possible gains from trade realised." }),
	allocative: Type.Number({ description: "total / endOptimum: how well the goods left are placed." }),
	gini: Type.Number({ description: "Gini of the surpluses (negative surpluses as 0)." }),
	contractsMet: Type.Integer(),
	trades: Type.Integer(),
});
export type Reference = Static<typeof Reference>;

export const MarketSlice = Type.Object({
	seats: Type.Array(Type.String()),
	game: Type.Integer(),
	round: Type.Integer(),
	opened: Type.Integer({ description: "The minute the round opened." }),
	running: Type.Boolean(),
	finished: Type.Boolean(),
	held: Type.Boolean(),
	due: Type.Boolean(),
	profiles: Type.Record(Type.String(), Profile),
	holdings: Type.Record(Type.String(), Bundle),
	offers: Type.Array(Offer),
	pledges: Type.Array(Pledge),
	counter: Type.Integer(),
	spoils: Type.String({ description: "The good that spoils at the end of this round, or ''." }),
	spoiled: Type.Record(Type.String(), Type.Integer()),
	says: Type.Record(Type.String(), Type.Integer({ description: "Messages this round." })),
	inbox: Type.Record(Type.String(), Type.Array(Type.String())),
	briefed: Type.Array(Type.String()),
	told: Type.Record(Type.String(), Type.Integer({ description: "The last round whose opening line the trader got." })),
	stats: Type.Record(Type.String(), Type.Object({ trades: Type.Integer(), offers: Type.Integer(), says: Type.Integer(), taxPaid: Type.Integer(), feesPaid: Type.Integer() })),
	scores: Type.Record(Type.String(), Type.Number()),
	gameScores: Type.Record(Type.String(), Type.Number()),
	lastResult: Type.String(),
});
export type MarketState = Static<typeof MarketSlice>;
