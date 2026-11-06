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

/** Every card id, in rank-then-suit order (2s 2h 2d 2c 3s ... Ac). */
export const DECK: readonly string[] = Array.from({ length: 52 }, (_, index) => `${RANKS[index >> 2] ?? ""}${SUITS[index & 3] ?? ""}`);

/** The integer of a card id, or undefined for an id that names no card. */
export function cardIndex(id: string): number | undefined {
	if (id.length !== 2) return undefined;
	const rank = RANKS.indexOf(id[0] ?? "");
	const suit = SUITS.indexOf(id[1] ?? "");
	return rank < 0 || suit < 0 ? undefined : rank * 4 + suit;
}

function indexes(ids: readonly string[]): number[] {
	return ids.map((id) => {
		const index = cardIndex(id);
		if (index === undefined) throw new Error(`holdem: ${id} is no card`);
		return index;
	});
}

const BASE = 13 ** 5;

/** The high rank of a straight in a 13-bit rank mask (the wheel A-2-3-4-5 is 3, five high), or -1. */
function straightHigh(mask: number): number {
	for (let high = 12; high >= 4; high--) {
		const run = 0b11111 << (high - 4);
		if ((mask & run) === run) return high;
	}
	const wheel = 0b1000000001111;
	return (mask & wheel) === wheel ? 3 : -1;
}

/** The ranks set in a mask, highest first. */
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

/** The value of the best five-card hand among 3 to 7 cards (integers; fewer than 5 rank as the cards there are): a higher number is a better hand, equal numbers tie. The category (0 high card ... 8 straight flush) is the value over 13^5. */
export function evaluateIndexes(cards: readonly number[]): number {
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
	const flushSuit = suitCounts.findIndex((count) => count >= 5);
	if (flushSuit >= 0) {
		const high = straightHigh(suitMasks[flushSuit] ?? 0);
		if (high >= 0) return score(8, [high]);
	}
	const quads: number[] = [];
	const trips: number[] = [];
	const pairs: number[] = [];
	for (let rank = 12; rank >= 0; rank--) {
		const count = counts[rank] ?? 0;
		if (count === 4) quads.push(rank);
		else if (count === 3) trips.push(rank);
		else if (count === 2) pairs.push(rank);
	}
	const others = (...used: number[]): number[] => ranksOf(mask).filter((rank) => !used.includes(rank));
	const quad = quads[0];
	if (quad !== undefined) return score(7, [quad, ...others(quad).slice(0, 1)]);
	const trip = trips[0];
	if (trip !== undefined) {
		const pairRank = Math.max(trips[1] ?? -1, pairs[0] ?? -1);
		if (pairRank >= 0) return score(6, [trip, pairRank]);
	}
	if (flushSuit >= 0) return score(5, ranksOf(suitMasks[flushSuit] ?? 0).slice(0, 5));
	const high = straightHigh(mask);
	if (high >= 0) return score(4, [high]);
	if (trip !== undefined) return score(3, [trip, ...others(trip).slice(0, 2)]);
	const [first, second] = pairs;
	if (first !== undefined && second !== undefined) return score(2, [first, second, ...others(first, second).slice(0, 1)]);
	if (first !== undefined) return score(1, [first, ...others(first).slice(0, 3)]);
	return score(0, ranksOf(mask).slice(0, 5));
}

/** The value of the best five-card hand among 5 to 7 card ids. */
export function evaluate(cards: readonly string[]): number {
	return evaluateIndexes(indexes(cards));
}

/** The best hand in words: "pair of kings", "two pair, aces and eights", "flush, ace high", "straight, five high". */
export function describe(cards: readonly string[]): string {
	const value = evaluate(cards);
	const category = Math.floor(value / BASE);
	const ranks: number[] = [];
	let tail = value % BASE;
	for (let index = 0; index < 5; index++) {
		ranks.unshift(tail % 13);
		tail = Math.floor(tail / 13);
	}
	const name = (rank: number | undefined): string => RANK_NAMES[rank ?? 0] ?? "";
	const plural = (rank: number | undefined): string => RANK_PLURALS[rank ?? 0] ?? "";
	const [a, b] = ranks;
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
 */
export function describeWith(hole: readonly string[], board: readonly string[]): string {
	const words = describe([...hole, ...board]);
	if (board.length < 3) return words;
	const top = (value: number): number => Math.floor(value / 13 ** 4);
	return top(evaluate([...hole, ...board])) === top(evaluate(board)) ? `${words}, all from the board (your own cards add at most a kicker)` : words;
}

/**
 * The share of the pot `hole` wins against `opponents` random hands, with the `board` so far completed
 * at random: Monte Carlo over `samples` draws from `rng` (ties count as the split share). This is the
 * equity a player could know (the opponents' cards unknown), not the equity against their real cards.
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
		// A partial Fisher-Yates: the first `need` places of the pool are the draw.
		for (let index = 0; index < need; index++) {
			const pick = index + Math.floor(rng.next() * (pool.length - index));
			const a = pool[index];
			const b = pool[pick];
			if (a === undefined || b === undefined) continue;
			pool[index] = b;
			pool[pick] = a;
		}
		const runout = [...fixed, ...pool.slice(opponents * 2, need)];
		const mine = evaluateIndexes([...own, ...runout]);
		let best = true;
		let ties = 0;
		for (let opponent = 0; opponent < opponents; opponent++) {
			const theirs = evaluateIndexes([pool[opponent * 2] ?? 0, pool[opponent * 2 + 1] ?? 0, ...runout]);
			if (theirs > mine) {
				best = false;
				break;
			}
			if (theirs === mine) ties += 1;
		}
		if (best) won += 1 / (ties + 1);
	}
	return won / samples;
}
