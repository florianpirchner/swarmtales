// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The reference metrics of a game: its distance from the closed-form single-lot references, for the human and the report only. */
import { Type, type Static } from "typebox";
import { curseFreeCeiling, equilibriumBid, type Lot, type LotKind, type LotResult, type Rules } from "./rules.ts";

const ratio = (value: number): number => Math.round(value * 1000) / 1000;

function mean(values: readonly number[]): number {
	return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * The schema of the reference metrics of one game (`game_scored`).
 *
 * @public
 */
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
/**
 * The reference metrics of one game.
 *
 * @public
 */
export type Reference = Static<typeof Reference>;

interface Pair {
	readonly lot: Lot;
	readonly result: LotResult;
}

interface Entry {
	readonly seat: string;
	readonly bid: number;
	readonly value: number;
	readonly coins: number;
	readonly lot: Lot;
}

// What the kind parts of the reference read: the resolved lots with their deals, the seats and the coins held per lot.
interface Game {
	readonly pairs: readonly Pair[];
	readonly seats: readonly string[];
	readonly rules: Rules;
	readonly held: ReadonlyMap<number, Readonly<Record<string, number>>>;
}

const ofKind = (game: Game, kind: LotKind): readonly Pair[] => game.pairs.filter((pair) => pair.lot.kind === kind);

function efficiency(game: Game, list: readonly Pair[]): number {
	return mean(list.map(({ lot, result }) => {
		const best = Math.max(...game.seats.map((seat) => lot.values[seat] ?? 0));
		return result.winner === undefined || best <= 0 ? 0 : (lot.values[result.winner] ?? 0) / best;
	}));
}

function bidsOf(game: Game, list: readonly Pair[]): readonly Entry[] {
	return list.flatMap(({ lot, result }) => game.seats.map((seat) => ({ seat, bid: result.bids[seat] ?? 0, value: lot.values[seat] ?? 0, coins: game.held.get(result.number)?.[seat] ?? game.rules.purse, lot })));
}

const counts = (rules: Rules) => (entry: Entry): boolean => entry.bid >= rules.reserve && entry.bid > 0 && entry.value > 0;

// The coins each seat held when each lot opened: the purse minus the prices it paid before.
function heldOf(results: readonly LotResult[], seats: readonly string[], rules: Rules): Map<number, Readonly<Record<string, number>>> {
	const held = new Map<number, Readonly<Record<string, number>>>();
	const running: Record<string, number> = Object.fromEntries(seats.map((seat) => [seat, rules.purse]));
	for (const result of results) {
		held.set(result.number, { ...running });
		if (result.winner !== undefined) running[result.winner] = (running[result.winner] ?? 0) - result.price;
	}
	return held;
}

function firstPriceOf(game: Game): Reference["firstPrice"] {
	const first = ofKind(game, "first-price");
	const bids = bidsOf(game, first).filter(counts(game.rules));
	return {
		lots: first.length,
		efficiency: ratio(efficiency(game, first)),
		shading: ratio(mean(bids.map((entry) => entry.bid / entry.value))),
		equilibriumShading: ratio(mean(bids.map((entry) => equilibriumBid(entry.value, game.seats.length, game.rules) / entry.value))),
		overbids: bids.filter((entry) => entry.bid > entry.value).length,
	};
}

function secondPriceOf(game: Game): Reference["secondPrice"] {
	const second = ofKind(game, "second-price");
	const all = bidsOf(game, second).filter((entry) => entry.value > 0);
	const isCapped = (entry: Entry): boolean => entry.bid < entry.value && entry.bid >= entry.coins;
	const bids = all.filter((entry) => !isCapped(entry));
	return {
		lots: second.length,
		efficiency: ratio(efficiency(game, second)),
		truthfulness: ratio(1 - mean(bids.map((entry) => Math.abs(entry.bid - entry.value) / entry.value))),
		overbids: bids.filter((entry) => entry.bid > entry.value).length,
		underbids: bids.filter((entry) => entry.bid < entry.value).length,
		capped: all.filter(isCapped).length,
	};
}

function commonOf(game: Game): Reference["common"] {
	const common = ofKind(game, "common");
	const bids = bidsOf(game, common).filter(counts(game.rules));
	const sold = common.filter(({ result }) => result.winner !== undefined);
	return {
		lots: common.length,
		cursed: sold.filter(({ result }) => result.profit < 0).length,
		winnerProfit: ratio(mean(sold.map(({ result }) => result.profit))),
		bidToEstimate: ratio(mean(bids.map((entry) => entry.bid / entry.value))),
		aboveCeiling: bids.filter((entry) => entry.bid > curseFreeCeiling(entry.value, game.seats.length, game.rules)).length,
	};
}

/**
 * The game's distance from the single-lot references, for the human and the report only.
 *
 * @param lots - The lots of the game as dealt.
 * @param results - The resolved lots.
 * @param seats - The seats.
 * @param rules - The rules of the auction.
 * @param coins - The coins each seat has left at the end of the game.
 * @returns The reference metrics.
 *
 * @public
 */
export function referenceOf(lots: readonly Lot[], results: readonly LotResult[], seats: readonly string[], rules: Rules, coins: Readonly<Record<string, number>>): Reference {
	const pairs = results.flatMap((result) => {
		const lot = lots.find((candidate) => candidate.number === result.number);
		return lot === undefined ? [] : [{ lot, result }];
	});
	const game: Game = { pairs, seats, rules, held: heldOf(results, seats, rules) };
	return {
		firstPrice: firstPriceOf(game),
		secondPrice: secondPriceOf(game),
		common: commonOf(game),
		revenue: results.reduce((sum, result) => sum + (result.winner === undefined ? 0 : result.price), 0),
		surplus: results.reduce((sum, result) => sum + (result.winner === undefined ? 0 : result.profit), 0),
		unspent: ratio(rules.purse <= 0 ? 0 : mean(seats.map((seat) => (coins[seat] ?? 0) / rules.purse))),
		missed: results.reduce((sum, result) => sum + result.missed.length, 0),
	};
}
