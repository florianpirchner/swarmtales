// SPDX-License-Identifier: Apache-2.0
/**
 * The 52-card deck, a seven-card hand evaluator and a Monte Carlo equity estimate, as pure functions.
 * A card is a two-letter id, rank then suit: `As` (ace of spades), `Td` (ten of diamonds), `2c`.
 * Ranks `23456789TJQKA`, suits `s h d c`. Internally a card is an integer 0..51 (rank * 4 + suit).
 */
import type { RandomSource } from "@swarmtales/contracts";

const RANKS = "23456789TJQKA";
const SUITS = "shdc";
const RANK_NAMES = ["two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "jack", "queen", "king", "ace"] as const;
const RANK_PLURALS = ["twos", "threes", "fours", "fives", "sixes", "sevens", "eights", "nines", "tens", "jacks", "queens", "kings", "aces"] as const;

/**
 * Every card id, in rank-then-suit order (2s 2h 2d 2c 3s ... Ac).
 *
 * @public
 */
export const DECK: readonly string[] = Array.from({ length: 52 }, (_, index) => `${RANKS[index >> 2] ?? ""}${SUITS[index & 3] ?? ""}`);

/**
 * The integer of a card id.
 *
 * @param id - A two-letter card id, rank then suit.
 * @returns The integer 0..51, or undefined for an id that names no card.
 *
 * @public
 */
export function cardIndex(id: string): number | undefined {
	if (id.length !== 2) return undefined;
	const rank = RANKS.indexOf(id[0] ?? "");
	const suit = SUITS.indexOf(id[1] ?? "");
	return rank < 0 || suit < 0 ? undefined : rank * 4 + suit;
}

function indexes(ids: readonly string[]): number[] {
	return ids.map((id) => {
		const index = cardIndex(id);
		if (index === undefined) throw new RangeError(`holdem: ${id} is no card`);
		return index;
	});
}

const BASE = 13 ** 5;

// The high rank of a straight in a 13-bit rank mask (the wheel A-2-3-4-5 is 3, five high), or -1.
function straightHigh(mask: number): number {
	for (let high = 12; high >= 4; high--) {
		const run = 0b11111 << (high - 4);
		if ((mask & run) === run) return high;
	}
	const wheel = 0b1000000001111;
	return (mask & wheel) === wheel ? 3 : -1;
}

// The ranks set in a mask, highest first.
function ranksOf(mask: number): number[] {
	const ranks: number[] = [];
	for (let rank = 12; rank >= 0; rank--) if ((mask & (1 << rank)) !== 0) ranks.push(rank);
	return ranks;
}

function score(category: number, ranks: readonly number[]): number {
	let tail = 0;
	for (let index = 0; index < 5; index++) tail = tail * 13 + (ranks[index] ?? 0);
	return category * BASE + tail;
}

// The category and the top rank of a hand value: equal for two values whose best hand has the same kind and top rank.
const topRank = (value: number): number => Math.floor(value / 13 ** 4);

interface Tally {
	readonly counts: readonly number[];
	readonly suitMasks: readonly number[];
	readonly suitCounts: readonly number[];
	readonly mask: number;
}

interface Groups {
	readonly quads: readonly number[];
	readonly trips: readonly number[];
	readonly pairs: readonly number[];
}

function tally(cards: readonly number[]): Tally {
	const counts = new Array<number>(13).fill(0);
	const suitMasks = [0, 0, 0, 0];
	const suitCounts = [0, 0, 0, 0];
	let mask = 0;
	for (const card of cards) {
		const rank = card >> 2;
		const suit = card & 3;
		counts[rank] = (counts[rank] ?? 0) + 1;
		suitMasks[suit] = (suitMasks[suit] ?? 0) | (1 << rank);
		suitCounts[suit] = (suitCounts[suit] ?? 0) + 1;
		mask |= 1 << rank;
	}
	return { counts, suitMasks, suitCounts, mask };
}

function groupsOf(counts: readonly number[]): Groups {
	const quads: number[] = [];
	const trips: number[] = [];
	const pairs: number[] = [];
	for (let rank = 12; rank >= 0; rank--) {
		const count = counts[rank] ?? 0;
		if (count === 4) quads.push(rank);
		else if (count === 3) trips.push(rank);
		else if (count === 2) pairs.push(rank);
	}
	return { quads, trips, pairs };
}

const othersOf = (mask: number, ...used: number[]): number[] => ranksOf(mask).filter((rank) => !used.includes(rank));

// Straight flush, four of a kind, full house and flush, or undefined for a weaker hand.
function upperValue(cards: Tally, groups: Groups): number | undefined {
	const flushSuit = cards.suitCounts.findIndex((count) => count >= 5);
	const flushMask = cards.suitMasks[flushSuit] ?? 0;
	if (flushSuit >= 0) {
		const high = straightHigh(flushMask);
		if (high >= 0) return score(8, [high]);
	}
	const quad = groups.quads[0];
	if (quad !== undefined) return score(7, [quad, ...othersOf(cards.mask, quad).slice(0, 1)]);
	const trip = groups.trips[0];
	if (trip !== undefined) {
		const pairRank = Math.max(groups.trips[1] ?? -1, groups.pairs[0] ?? -1);
		if (pairRank >= 0) return score(6, [trip, pairRank]);
	}
	return flushSuit >= 0 ? score(5, ranksOf(flushMask).slice(0, 5)) : undefined;
}

// Straight, three of a kind, two pair, pair and high card.
function lowerValue(mask: number, groups: Groups): number {
	const high = straightHigh(mask);
	if (high >= 0) return score(4, [high]);
	const trip = groups.trips[0];
	if (trip !== undefined) return score(3, [trip, ...othersOf(mask, trip).slice(0, 2)]);
	const [first, second] = groups.pairs;
	if (first !== undefined && second !== undefined) return score(2, [first, second, ...othersOf(mask, first, second).slice(0, 1)]);
	if (first !== undefined) return score(1, [first, ...othersOf(mask, first).slice(0, 3)]);
	return score(0, ranksOf(mask).slice(0, 5));
}

/**
 * The value of the best five-card hand among 3 to 7 cards (integers; fewer than 5 rank as the cards there are): a
 * higher number is a better hand, equal numbers tie. The category (0 high card ... 8 straight flush) is the value
 * over 13^5.
 *
 * @param cards - The cards as integers 0..51.
 * @returns The value of the best hand.
 *
 * @public
 */
export function evaluateIndexes(cards: readonly number[]): number {
	const counted = tally(cards);
	const groups = groupsOf(counted.counts);
	return upperValue(counted, groups) ?? lowerValue(counted.mask, groups);
}

/**
 * The value of the best five-card hand among 5 to 7 card ids.
 *
 * @param cards - The card ids.
 * @returns The value of the best hand, as `evaluateIndexes` gives it.
 * @throws RangeError for an id that names no card.
 *
 * @public
 */
export function evaluate(cards: readonly string[]): number {
	return evaluateIndexes(indexes(cards));
}

// The five ranks of a hand value, the most important first.
function valueRanks(value: number): number[] {
	const ranks: number[] = [];
	let tail = value % BASE;
	for (let index = 0; index < 5; index++) {
		ranks.unshift(tail % 13);
		tail = Math.floor(tail / 13);
	}
	return ranks;
}

/**
 * The best hand in words: "pair of kings", "two pair, aces and eights", "flush, ace high", "straight, five high".
 *
 * @param cards - The card ids.
 * @returns The best hand in words.
 * @throws RangeError for an id that names no card.
 *
 * @public
 */
export function describe(cards: readonly string[]): string {
	const value = evaluate(cards);
	const category = Math.floor(value / BASE);
	const name = (rank: number | undefined): string => RANK_NAMES[rank ?? 0] ?? "";
	const plural = (rank: number | undefined): string => RANK_PLURALS[rank ?? 0] ?? "";
	const [a, b] = valueRanks(value);
	switch (category) {
		case 8:
			return a === 12 ? "royal flush" : `straight flush, ${name(a)} high`;
		case 7:
			return `four ${plural(a)}`;
		case 6:
			return `full house, ${plural(a)} full of ${plural(b)}`;
		case 5:
			return `flush, ${name(a)} high`;
		case 4:
			return `straight, ${name(a)} high`;
		case 3:
			return `three ${plural(a)}`;
		case 2:
			return `two pair, ${plural(a)} and ${plural(b)}`;
		case 1:
			return `pair of ${plural(a)}`;
		default:
			return `${name(a)} high`;
	}
}

/**
 * The best hand in words with the board's part named: when the hand's category and its top rank come from
 * the board alone ("pair of aces" with two aces on the board), the line says so, since a seat's own cards
 * then add at most kickers.
 *
 * @param hole - The seat's own card ids.
 * @param board - The board's card ids.
 * @returns The best hand in words.
 * @throws RangeError for an id that names no card.
 *
 * @public
 */
export function describeWith(hole: readonly string[], board: readonly string[]): string {
	const words = describe([...hole, ...board]);
	if (board.length < 3) return words;
	return topRank(evaluate([...hole, ...board])) === topRank(evaluate(board)) ? `${words}, all from the board (your own cards add at most a kicker)` : words;
}

// The share of the pot a hand of value `mine` wins against `hands` on `runout`: 0 when one beats it, else split among the ties.
function shareWon(mine: number, hands: readonly (readonly number[])[], runout: readonly number[]): number {
	let ties = 0;
	for (const cards of hands) {
		const theirs = evaluateIndexes([...cards, ...runout]);
		if (theirs > mine) return 0;
		if (theirs === mine) ties += 1;
	}
	return 1 / (ties + 1);
}

// A partial Fisher-Yates: the first `need` places of the pool become the draw.
function drawInto(pool: number[], need: number, rng: RandomSource): void {
	for (let index = 0; index < need; index++) {
		const pick = index + Math.floor(rng.next() * (pool.length - index));
		const a = pool[index];
		const b = pool[pick];
		if (a === undefined || b === undefined) continue;
		pool[index] = b;
		pool[pick] = a;
	}
}

/**
 * The share of the pot `hole` wins against `opponents` random hands, with the `board` so far completed
 * at random: Monte Carlo over `samples` draws from `rng` (ties count as the split share). This is the
 * equity a player could know (the opponents' cards unknown), not the equity against their real cards.
 *
 * @param hole - The seat's own card ids.
 * @param board - The board's card ids so far.
 * @param opponents - The opponents still in the hand.
 * @param samples - The Monte Carlo draws.
 * @param rng - The random stream the draws come from.
 * @returns The share of the pot, 0 to 1.
 * @throws RangeError for an id that names no card.
 *
 * @public
 */
export function equity(hole: readonly string[], board: readonly string[], opponents: number, samples: number, rng: RandomSource): number {
	const known = indexes([...hole, ...board]);
	const own = indexes(hole);
	const fixed = indexes(board);
	const rest = Array.from({ length: 52 }, (_, index) => index).filter((index) => !known.includes(index));
	const need = opponents * 2 + (5 - fixed.length);
	if (opponents <= 0) return 1;
	if (need > rest.length || samples <= 0) return 0;
	let won = 0;
	const pool = [...rest];
	for (let sample = 0; sample < samples; sample++) {
		drawInto(pool, need, rng);
		const runout = [...fixed, ...pool.slice(opponents * 2, need)];
		const hands = Array.from({ length: opponents }, (_, opponent) => [pool[opponent * 2] ?? 0, pool[opponent * 2 + 1] ?? 0]);
		won += shareWon(evaluateIndexes([...own, ...runout]), hands, runout);
	}
	return won / samples;
}

// The Chen score of two hole cards (integers): a quick preflop strength, higher is stronger.
function chen(a: number, b: number): number {
	const high = Math.max(a >> 2, b >> 2);
	const low = Math.min(a >> 2, b >> 2);
	const points = (rank: number): number => (rank === 12 ? 10 : rank === 11 ? 8 : rank === 10 ? 7 : rank === 9 ? 6 : (rank + 2) / 2);
	if (high === low) return Math.max(5, points(high) * 2);
	const gap = high - low - 1;
	let value = points(high) + ((a & 3) === (b & 3) ? 2 : 0) - (gap === 0 ? 0 : gap === 1 ? 1 : gap === 2 ? 2 : gap === 3 ? 4 : 5);
	if (gap <= 1 && high < 10) value += 1;
	return value;
}

let shares: Map<number, number> | undefined;

// The share of the 1,326 starting hands that are stronger than these two (by the Chen score): 0 for aces, near 1 for 7-2 offsuit.
function shareAbove(a: number, b: number): number {
	if (shares === undefined) {
		const combos: { key: number; value: number }[] = [];
		for (let first = 0; first < 52; first++) for (let second = first + 1; second < 52; second++) combos.push({ key: first * 52 + second, value: chen(first, second) });
		const built = new Map<number, number>();
		for (const combo of combos) built.set(combo.key, combos.filter((other) => other.value > combo.value).length / combos.length);
		shares = built;
	}
	return shares.get(Math.min(a, b) * 52 + Math.max(a, b)) ?? 1;
}

// A flush draw or an open-ended straight draw that uses a hole card.
function drawsWith(hole: readonly number[], all: readonly number[]): boolean {
	for (let suit = 0; suit < 4; suit++) if (hole.some((card) => (card & 3) === suit) && all.filter((card) => (card & 3) === suit).length >= 4) return true;
	let mask = 0;
	for (const card of all) mask |= 1 << (card >> 2);
	for (let low = 0; low <= 8; low++) {
		const run = 0b1111 << low;
		if ((mask & run) === run && hole.some((card) => card >> 2 >= low && card >> 2 <= low + 3)) return true;
	}
	return false;
}

// Whether the hole cards play on `board`: a pair or better that uses a hole card, or (before the river) a flush draw or an open-ended straight draw with a hole card.
function plays(hole: readonly number[], board: readonly number[]): boolean {
	const all = [...hole, ...board];
	const value = evaluateIndexes(all);
	if (Math.floor(value / BASE) >= 1 && topRank(value) > topRank(evaluateIndexes(board))) return true;
	if (board.length >= 5) return false;
	return drawsWith(hole, all);
}

/**
 * What an opponent's actions in the hand say about its cards.
 *
 * @public
 */
export interface Range {
	/** The share of starting hands, strongest first, it can hold (1: any two cards). */
	readonly top: number;
	/** The boards on which it bet or raised: on each its cards must play (a pair or better with a hole card, or a strong draw). */
	readonly strongOn: readonly (readonly string[])[];
}

/** Draws trying a range before a hand is taken anyway (a range that fits almost nothing falls back to any two cards). */
const RANGE_TRIES = 60;

// Two cards from a range, by rejection: up to RANGE_TRIES draws, then the last draw; the cards are marked used.
function rangeHand(top: number, strongOn: readonly (readonly number[])[], pick: () => number, used: boolean[]): number[] {
	let cards: number[] = [];
	for (let attempt = 0; attempt < RANGE_TRIES; attempt++) {
		const a = pick();
		used[a] = true;
		const b = pick();
		used[a] = false;
		cards = [a, b];
		if (shareAbove(a, b) >= top) continue;
		if (strongOn.every((cardsOn) => plays(cards, cardsOn))) break;
	}
	for (const card of cards) used[card] = true;
	return cards;
}

/**
 * Like `equity`, but each opponent's two cards are drawn from its `Range` (by rejection: up to 60 tries, then
 * any two cards), so a seat that raised preflop and bet the flop holds a strong hand more often than a
 * random one (P134). Still an estimate a player could make, from the public actions only.
 *
 * @param hole - The seat's own card ids.
 * @param board - The board's card ids so far.
 * @param ranges - One range per opponent still in the hand.
 * @param samples - The Monte Carlo draws.
 * @param rng - The random stream the draws come from.
 * @returns The share of the pot, 0 to 1.
 * @throws RangeError for an id that names no card.
 *
 * @public
 */
export function rangeEquity(hole: readonly string[], board: readonly string[], ranges: readonly Range[], samples: number, rng: RandomSource): number {
	if (ranges.length === 0) return 1;
	const own = indexes(hole);
	const fixed = indexes(board);
	const strongOn = ranges.map((range) => range.strongOn.map((cards) => indexes(cards)));
	const used = new Array<boolean>(52).fill(false);
	const pick = (): number => {
		for (;;) {
			const card = Math.floor(rng.next() * 52);
			if (!used[card]) return card;
		}
	};
	if (own.length + fixed.length + ranges.length * 2 + (5 - fixed.length) > 52 || samples <= 0) return 0;
	let won = 0;
	for (let sample = 0; sample < samples; sample++) {
		used.fill(false);
		for (const card of [...own, ...fixed]) used[card] = true;
		const hands = ranges.map((range, opponent) => rangeHand(range.top, strongOn[opponent] ?? [], pick, used));
		const runout = [...fixed];
		while (runout.length < 5) {
			const card = pick();
			used[card] = true;
			runout.push(card);
		}
		won += shareWon(evaluateIndexes([...own, ...runout]), hands, runout);
	}
	return won / samples;
}
