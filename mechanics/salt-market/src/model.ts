// SPDX-License-Identifier: Apache-2.0
/**
 * The rules of Salt Market as pure functions (the deal, bundles, the score, the optimum, fairness) and
 * the mechanic's state as a Typebox schema (the snapshot slice).
 */
import { Type, type Static } from "typebox";

/**
 * The five goods. Salt is the preservative: it never spoils and is worth the same to everyone.
 *
 * @public
 */
export const GOODS = ["salt", "cloth", "copper", "spice", "wax"] as const;
/**
 * One of the five goods.
 *
 * @public
 */
export type Good = (typeof GOODS)[number];
/**
 * The four goods that spoil and that contracts ask for.
 *
 * @public
 */
export const PERISHABLE = ["cloth", "copper", "spice", "wax"] as const;

const count = (description: string) => Type.Integer({ minimum: 0, description });
/**
 * The schema of a bundle: a count of each good.
 *
 * @public
 */
export const Bundle = Type.Object({ salt: count("Salt."), cloth: count("Cloth."), copper: count("Copper."), spice: count("Spice."), wax: count("Wax.") });
/**
 * A bundle: a count of each good.
 *
 * @public
 */
export type Bundle = Static<typeof Bundle>;

/**
 * The empty bundle.
 *
 * @returns A new bundle of zeros.
 *
 * @public
 */
export const empty = (): Bundle => ({ salt: 0, cloth: 0, copper: 0, spice: 0, wax: 0 });
/**
 * A copy of a bundle.
 *
 * @param bundle - The bundle.
 * @returns A new bundle with the same counts.
 *
 * @public
 */
export const copyBundle = (bundle: Bundle): Bundle => ({ ...bundle });
/**
 * The units of a bundle.
 *
 * @param bundle - The bundle.
 * @returns The sum of its counts.
 *
 * @public
 */
export const size = (bundle: Bundle): number => GOODS.reduce((sum, good) => sum + bundle[good], 0);
/**
 * Two bundles added good by good.
 *
 * @param a - The first bundle.
 * @param b - The second bundle.
 * @returns The sum.
 *
 * @public
 */
export const plus = (a: Bundle, b: Bundle): Bundle => ({ salt: a.salt + b.salt, cloth: a.cloth + b.cloth, copper: a.copper + b.copper, spice: a.spice + b.spice, wax: a.wax + b.wax });
/**
 * One bundle less another, good by good.
 *
 * @param a - The bundle.
 * @param b - What is taken away.
 * @returns The difference (a count may go below 0).
 *
 * @public
 */
export const minus = (a: Bundle, b: Bundle): Bundle => ({ salt: a.salt - b.salt, cloth: a.cloth - b.cloth, copper: a.copper - b.copper, spice: a.spice - b.spice, wax: a.wax - b.wax });
/**
 * Whether `holding` covers `need` good by good.
 *
 * @param holding - What is held.
 * @param need - What is needed.
 * @returns True when every count of `holding` is at least that of `need`.
 *
 * @public
 */
export const covers = (holding: Bundle, need: Bundle): boolean => GOODS.every((good) => holding[good] >= need[good]);
/**
 * A bundle from optional counts (a tool's parameters); negative or fractional counts become 0.
 *
 * @param partial - The counts by good, or undefined.
 * @returns The bundle.
 *
 * @public
 */
export function bundleOf(partial: Partial<Readonly<Record<Good, number>>> | undefined): Bundle {
	const out = empty();
	if (partial === undefined) return out;
	for (const good of GOODS) {
		const value = partial[good];
		out[good] = value === undefined || !Number.isFinite(value) ? 0 : Math.max(0, Math.floor(value));
	}
	return out;
}

/**
 * A bundle in words: `2 cloth, 1 salt`, or `nothing`.
 *
 * @param bundle - The bundle.
 * @returns The line.
 *
 * @public
 */
export function bundleLine(bundle: Bundle): string {
	const parts = GOODS.filter((good) => bundle[good] > 0).map((good) => `${String(bundle[good])} ${good}`);
	return parts.length === 0 ? "nothing" : parts.join(", ");
}

/**
 * The schema of a trader's side of a game: what each unit is worth to it and the contract it wants to fill (secret), its start bundle and its shipment (public).
 *
 * @public
 */
export const Profile = Type.Object({
	values: Bundle,
	contract: Bundle,
	start: Bundle,
	shipment: Bundle,
	arrives: Type.Integer({ minimum: 0, description: "The round at whose end the shipment arrives; 0: no shipment." }),
});
/**
 * A trader's side of a game.
 *
 * @public
 */
export type Profile = Static<typeof Profile>;

/**
 * The rules of the score.
 *
 * @public
 */
export interface Rules {
	/** Points for holding at least the contract bundle at the game's end. */
	readonly contractBonus: number;
}

/**
 * A trader's points for a holding: every unit at its own value, plus the contract bonus when the contract is filled.
 *
 * @param profile - The trader's side of the game.
 * @param holding - What it holds.
 * @param rules - The rules of the score.
 * @returns The points of the goods, whether the contract is met, and the total.
 *
 * @public
 */
export function scoreOf(profile: Profile, holding: Bundle, rules: Rules): { readonly goods: number; readonly met: boolean; readonly total: number } {
	const goods = GOODS.reduce((sum, good) => sum + holding[good] * profile.values[good], 0);
	const met = covers(holding, profile.contract);
	return { goods, met, total: goods + (met ? rules.contractBonus : 0) };
}

/**
 * Minimal seeded randomness (the host's `RandomSource`).
 *
 * @public
 */
export interface Draw {
	/** Uniform in [0, 1). */
	next(): number;
	/** An integer in [min, max], both inclusive. */
	int(min: number, max: number): number;
	/** A shuffled copy. */
	shuffle<T>(items: readonly T[]): T[];
}

/**
 * The rules of the deal.
 *
 * @public
 */
export interface DealRules {
	/** Salt every trader starts with. */
	readonly salt: number;
	/** Salt's value, the same for everyone. */
	readonly saltValue: number;
	/** Units of each perishable good beyond the joint demand of the contracts. */
	readonly slack: number;
	/** Rounds of the game: a shipment arrives at the end of round 2 to rounds - 2. */
	readonly rounds: number;
	/** The chance that a dealt unit of a perishable good comes in the trader's shipment instead of at the start. */
	readonly shipShare: number;
}

// Every trader's values, contract and start salt; no perishable goods yet.
function profilesOf(seats: readonly string[], draw: Draw, rules: DealRules): Record<string, Profile> {
	const profiles: Record<string, Profile> = {};
	for (const seat of seats) {
		const values = empty();
		values.salt = rules.saltValue;
		for (const good of PERISHABLE) values[good] = draw.int(1, 4);
		const contract = empty();
		for (const good of draw.shuffle(PERISHABLE).slice(0, 3)) contract[good] = draw.int(2, 4);
		const start = empty();
		start.salt = rules.salt;
		profiles[seat] = { values, contract, start, shipment: empty(), arrives: 0 };
	}
	return profiles;
}

// The index of a weighted draw: `roll` is uniform in [0, total).
function weighted(weights: readonly number[], roll: number): number {
	let index = 0;
	while (index < weights.length - 1 && roll >= (weights[index] ?? 0)) {
		roll -= weights[index] ?? 0;
		index += 1;
	}
	return index;
}

// Every unit of every perishable good, three times as likely to a trader whose contract does not ask for it.
function dealGoods(profiles: Record<string, Profile>, seats: readonly string[], draw: Draw, slack: number): void {
	for (const good of PERISHABLE) {
		const demand = seats.reduce((sum, seat) => sum + (profiles[seat]?.contract[good] ?? 0), 0);
		const supply = Math.max(4, demand + slack);
		const weights = seats.map((seat) => ((profiles[seat]?.contract[good] ?? 0) > 0 ? 1 : 3));
		const total = weights.reduce((sum, weight) => sum + weight, 0);
		for (let unit = 0; unit < supply; unit++) {
			const profile = profiles[seats[weighted(weights, draw.next() * total)] ?? ""];
			if (profile !== undefined) profile.start[good] += 1;
		}
	}
}

// A share of each trader's perishable units moves into its shipment, which arrives at the end of a later round.
function shipGoods(profiles: Record<string, Profile>, seats: readonly string[], draw: Draw, rules: DealRules): void {
	for (const seat of seats) {
		const profile = profiles[seat];
		if (profile === undefined) continue;
		for (const good of PERISHABLE) {
			const units = profile.start[good];
			for (let unit = 0; unit < units; unit++) {
				if (draw.next() >= rules.shipShare) continue;
				profile.start[good] -= 1;
				profile.shipment[good] += 1;
			}
		}
		profile.arrives = size(profile.shipment) === 0 ? 0 : draw.int(2, rules.rounds - 2);
	}
}

/**
 * The deal of one game. Every trader gets a value of 1 to 4 for each perishable good (salt is worth
 * `saltValue` to everyone), a contract of three perishable goods with 2 to 4 units each, and its goods:
 * salt for everyone, and each unit of a perishable good dealt at random, three times as likely to a
 * trader whose contract does not ask for it. So nobody can fill a contract without trading, and the
 * goods each trader needs sit mostly with the others. The supply of a good is the joint demand of the
 * contracts plus `slack`, so all four contracts can be filled at once if nothing spoils. A share of each
 * trader's perishable units (`shipShare`) comes as one shipment at the end of a later round, so a trader
 * can sell those goods early only on credit (a promise, or escrow against the shipment).
 *
 * @param seats - The traders.
 * @param draw - The seeded stream of the deal.
 * @param rules - The rules of the deal.
 * @returns Every trader's profile.
 *
 * @public
 */
export function dealOf(seats: readonly string[], draw: Draw, rules: DealRules): Record<string, Profile> {
	const profiles = profilesOf(seats, draw, rules);
	dealGoods(profiles, seats, draw, rules.slack);
	if (rules.shipShare > 0 && rules.rounds >= 4) shipGoods(profiles, seats, draw, rules);
	return profiles;
}

/**
 * What a trader ends with if nobody trades: the start bundle, the shipment when it arrives, and every
 * spoil of `schedule` (the good that spoiled at the end of round 1, 2, ...; '' for none).
 *
 * @param profile - The trader's side of the game.
 * @param schedule - The good that spoiled at the end of each round.
 * @returns The holding.
 *
 * @public
 */
export function idleHolding(profile: Profile, schedule: readonly string[]): Bundle {
	let holding = copyBundle(profile.start);
	schedule.forEach((spoiled, index) => {
		if (profile.arrives === index + 1) holding = plus(holding, profile.shipment);
		const good = GOODS.find((name) => name === spoiled);
		if (good !== undefined) holding[good] -= spoilLoss(holding, good);
	});
	if (profile.arrives > schedule.length) holding = plus(holding, profile.shipment);
	return holding;
}

/**
 * All goods of a profile: the start bundle and the shipment.
 *
 * @param profile - The profile.
 * @returns The start bundle plus the shipment.
 *
 * @public
 */
export const goodsOf = (profile: Profile): Bundle => plus(profile.start, profile.shipment);

/**
 * The deal of game `game` when deals rotate: the deal of a cycle (one per `seats.length` games) passes
 * one seat on with every game, so in a full cycle every seat plays every position once.
 *
 * @param base - The deal of the cycle.
 * @param seats - The traders.
 * @param offset - Seats to pass the deal on.
 * @returns The rotated deal, copied.
 *
 * @public
 */
export function rotated(base: Readonly<Record<string, Profile>>, seats: readonly string[], offset: number): Record<string, Profile> {
	return Object.fromEntries(seats.map((seat, index) => [seat, structuredClone(base[seats[(index + offset) % seats.length] ?? ""] ?? { values: empty(), contract: empty(), start: empty(), shipment: empty(), arrives: 0 })]));
}

/**
 * The units a holding loses when `good` spoils: one of a stock of 2 or more, a quarter (rounded down) of a stock of 8 or more; a single unit keeps.
 *
 * @param holding - The holding.
 * @param good - The good that spoils.
 * @returns The units lost.
 *
 * @public
 */
export const spoilLoss = (holding: Bundle, good: Good): number => (good === "salt" || holding[good] < 2 ? 0 : Math.max(1, Math.floor(holding[good] / 4)));

// The joint score of filling exactly the contracts of `chosen`; undefined when the supply cannot fill them at once.
function filledTotal(profiles: Readonly<Record<string, Profile>>, seats: readonly string[], chosen: readonly string[], supply: Bundle, rules: Rules): number | undefined {
	const needed = chosen.reduce((sum, seat) => plus(sum, profiles[seat]?.contract ?? empty()), empty());
	if (!covers(supply, needed)) return undefined;
	let total = chosen.length * rules.contractBonus;
	for (const good of GOODS) {
		for (const seat of chosen) total += (profiles[seat]?.contract[good] ?? 0) * (profiles[seat]?.values[good] ?? 0);
		const top = Math.max(0, ...seats.map((seat) => profiles[seat]?.values[good] ?? 0));
		total += (supply[good] - needed[good]) * top;
	}
	return total;
}

/**
 * The best joint score of a supply split among the traders (the reference optimum): for every subset of
 * contracts that the supply can fill at once, each filled contract keeps its bundle, and every other
 * unit goes to the trader who values it most. Exact, since a unit beyond the contracts adds its value
 * linearly; 2^n subsets for n traders.
 *
 * @param profiles - Every trader's profile.
 * @param supply - The goods to split.
 * @param rules - The rules of the score.
 * @returns The best total and the contracts it fills.
 *
 * @public
 */
export function optimumOf(profiles: Readonly<Record<string, Profile>>, supply: Bundle, rules: Rules): { readonly total: number; readonly contracts: readonly string[] } {
	const seats = Object.keys(profiles);
	let best: { total: number; contracts: readonly string[] } = { total: -Infinity, contracts: [] };
	for (let mask = 0; mask < 1 << seats.length; mask++) {
		const chosen = seats.filter((_, index) => (mask & (1 << index)) !== 0);
		const total = filledTotal(profiles, seats, chosen, supply, rules);
		if (total !== undefined && total > best.total) best = { total, contracts: chosen };
	}
	return best.total === -Infinity ? { total: 0, contracts: [] } : best;
}

/**
 * The Gini coefficient of non-negative amounts (0: all equal; towards 1: one takes all); 0 for an empty or all-zero list.
 *
 * @param amounts - The amounts; a negative amount counts as 0.
 * @returns The coefficient, rounded to three places.
 *
 * @public
 */
export function gini(amounts: readonly number[]): number {
	const values = amounts.map((value) => Math.max(0, value));
	const sum = values.reduce((total, value) => total + value, 0);
	if (values.length === 0 || sum === 0) return 0;
	let diff = 0;
	for (const a of values) for (const b of values) diff += Math.abs(a - b);
	return Math.round((diff / (2 * values.length * sum)) * 1000) / 1000;
}

/**
 * The schema of goods an offer delivers later.
 *
 * @public
 */
export const Later = Type.Object({
	goods: Bundle,
	round: Type.Integer({ minimum: 1, description: "The round at whose end the goods are due." }),
	escrow: Type.Boolean({ description: "True: the bank holds the goods from the trade on and delivers them; false: a promise only, kept or broken by the proposer." }),
});
/**
 * Goods an offer delivers later.
 *
 * @public
 */
export type Later = Static<typeof Later>;

/**
 * The schema of the status of an offer.
 *
 * @public
 */
export const OfferStatus = Type.Union([Type.Literal("open"), Type.Literal("accepted"), Type.Literal("declined"), Type.Literal("withdrawn"), Type.Literal("expired")]);

/**
 * The schema of an offer through the bank.
 *
 * @public
 */
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
/**
 * An offer through the bank.
 *
 * @public
 */
export type Offer = Static<typeof Offer>;

/**
 * The schema of the status of a promise.
 *
 * @public
 */
export const PromiseStatus = Type.Union([Type.Literal("pending"), Type.Literal("kept"), Type.Literal("broken")]);

/**
 * The schema of a delivery owed after a trade: a plain promise or escrow.
 *
 * @public
 */
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
	fromShipment: Bundle,
	status: PromiseStatus,
});
/**
 * A delivery owed after a trade.
 *
 * @public
 */
export type Pledge = Static<typeof Pledge>;

/**
 * The schema of one trader's line of the reference of a game.
 *
 * @public
 */
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
	escrows: Type.Integer({ description: "Escrowed deliveries this trader made." }),
	kept: Type.Integer(),
	broken: Type.Integer(),
});

/**
 * The schema of the reference of a game: its score against the optimum.
 *
 * @public
 */
export const Reference = Type.Object({
	seats: Type.Record(Type.String(), SeatReference),
	startTotal: Type.Number(),
	total: Type.Number(),
	optimum: Type.Number({ description: "The best joint score of the start supply (spoilage ignored: an upper bound)." }),
	optimumContracts: Type.Array(Type.String()),
	endOptimum: Type.Number({ description: "The best joint score of the goods left at the end." }),
	efficiency: Type.Number({ description: "(total - startTotal) / (optimum - startTotal): the share of the possible gains from trade realised, against the start goods before any spoil." }),
	idleTotal: Type.Number({ description: "The joint score if nobody had traded: start goods, shipments, the same spoils (P180)." }),
	gainOverIdle: Type.Number({ description: "(total - idleTotal) / (optimum - idleTotal): what trading added over doing nothing, as a share of what was possible." }),
	allocative: Type.Number({ description: "total / endOptimum: how well the goods left are placed." }),
	gini: Type.Number({ description: "Gini of the surpluses (negative surpluses as 0)." }),
	contractsMet: Type.Integer(),
	trades: Type.Integer(),
});
/**
 * The reference of a game.
 *
 * @public
 */
export type Reference = Static<typeof Reference>;

/**
 * The schema of the mechanic's state (the snapshot slice).
 *
 * @public
 */
export const MarketSlice = Type.Object(
	{
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
		reserved: Type.Record(Type.String(), Bundle, { description: "Goods of each trader's shipment the bank holds back for escrow." }),
		arrived: Type.Array(Type.String({ description: "Traders whose shipment arrived this game." })),
		counter: Type.Integer(),
		spoils: Type.String({ description: "The good that spoils at the end of this round, or ''." }),
		spoilLog: Type.Array(Type.String(), { description: "The good that spoiled at the end of each round so far ('' for none)." }),
		spoiled: Type.Record(Type.String(), Type.Integer()),
		says: Type.Record(Type.String(), Type.Integer({ description: "Messages this round." })),
		inbox: Type.Record(Type.String(), Type.Array(Type.String())),
		briefed: Type.Array(Type.String()),
		told: Type.Record(Type.String(), Type.Integer({ description: "The last round whose opening line the trader got." })),
		stats: Type.Record(Type.String(), Type.Object({ trades: Type.Integer(), offers: Type.Integer(), says: Type.Integer(), taxPaid: Type.Integer(), feesPaid: Type.Integer() })),
		scores: Type.Record(Type.String(), Type.Number()),
		gameScores: Type.Record(Type.String(), Type.Number()),
		lastResult: Type.String(),
	},
	{ description: "The state of Salt Market: the match, the game's deal and holdings, offers, pledges, shipments, spoils and the queued lines." },
);
/**
 * The mechanic's state.
 *
 * @public
 */
export type MarketState = Static<typeof MarketSlice>;
