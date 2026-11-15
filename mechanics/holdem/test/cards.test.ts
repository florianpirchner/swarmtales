// SPDX-License-Identifier: Apache-2.0
/** The carried cards of hold'em: the block "holdem cards" of the old `test/stories/holdem.test.ts`. */
import { describe, expect, it } from "vitest";
import type { RandomSource } from "@swarmtales/contracts";
import { describe as describeHand, describeWith, equity, evaluate, rangeEquity } from "../src/cards.ts";

/** A seeded stream for the pure functions (mulberry32). */
function stream(seed: number): RandomSource {
	let state = seed >>> 0;
	const next = (): number => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	return {
		next,
		int: (min, max) => min + Math.floor(next() * (max - min + 1)),
		pick: (items) => {
			const item = items[Math.floor(next() * items.length)];
			if (item === undefined) throw new RangeError("pick() on an empty list");
			return item;
		},
		shuffle: (items) => [...items],
	};
}

describe("holdem cards", () => {
	it("ranks the hand categories and their kickers", () => {
		const order = [
			["As", "Ks", "Qs", "Js", "Ts", "2d", "3c"], // royal flush
			["9h", "9d", "9s", "9c", "2h", "3d", "4c"], // four nines
			["Kh", "Kd", "Ks", "2c", "2h", "7d", "8c"], // kings full of twos
			["Ah", "Jh", "8h", "4h", "2h", "Kd", "Kc"], // ace-high flush (a pair of kings too)
			["5h", "6d", "7s", "8c", "9h", "Kd", "Kc"], // nine-high straight
			["Ah", "2d", "3s", "4c", "5h", "Kd", "Qc"], // the wheel, five high
			["7h", "7d", "7s", "Ac", "2h", "4d", "9c"], // three sevens
			["Ah", "Ad", "8s", "8c", "Kh", "4d", "4c"], // two pair, aces and eights, king kicker
			["Ah", "Ad", "8s", "8c", "Qh", "4d", "4c"], // the same two pair, queen kicker
			["Jh", "Jd", "As", "9c", "7h", "4d", "2c"], // pair of jacks
			["Ah", "Kd", "9s", "7c", "5h", "4d", "2c"], // ace high
		];
		const values = order.map((cards) => evaluate(cards));
		for (let index = 1; index < values.length; index++) expect(values[index - 1]).toBeGreaterThan(values[index] ?? 0);
		expect(order.map((cards) => describeHand(cards))).toEqual([
			"royal flush",
			"four nines",
			"full house, kings full of twos",
			"flush, ace high",
			"straight, nine high",
			"straight, five high",
			"three sevens",
			"two pair, aces and eights",
			"two pair, aces and eights",
			"pair of jacks",
			"ace high",
		]);
		// The board plays: both hands are the same straight, a tie.
		expect(evaluate(["2c", "3d", "5h", "6s", "7c", "8d", "9h"])).toBe(evaluate(["Kc", "Qd", "5h", "6s", "7c", "8d", "9h"]));
	});

	it("says when the best hand comes from the board alone", () => {
		// Run 001: two aces on the board, a seat with 4h 2h read "pair of aces" as its own hand (P132).
		expect(describeWith(["4h", "2h"], ["6h", "Qd", "Jh", "Ac", "As"])).toBe("pair of aces, all from the board (your own cards add at most a kicker)");
		expect(describeWith(["Ah", "Kd"], ["Ac", "7s", "2d"])).toBe("pair of aces");
		expect(describeWith(["Qc", "9s"], ["6h", "Qd", "Jh", "Ac", "As"])).toBe("two pair, aces and queens");
	});

	it("estimates equity against random hands", () => {
		const aces = equity(["As", "Ah"], [], 1, 3000, stream(7));
		expect(aces).toBeGreaterThan(0.8);
		expect(aces).toBeLessThan(0.89);
		const trash = equity(["7c", "2d"], [], 3, 2000, stream(7));
		expect(trash).toBeLessThan(0.2);
		// A made flush on the river against one hand wins almost always.
		expect(equity(["Ah", "Kh"], ["2h", "7h", "9h", "Jc", "3d"], 1, 500, stream(3))).toBeGreaterThan(0.95);
	});

	it("narrows the equity to the range an opponent's actions leave it (P134)", () => {
		const any = { top: 1, strongOn: [] };
		const random = equity(["Kd", "Qc"], [], 1, 3000, stream(5));
		expect(Math.abs(rangeEquity(["Kd", "Qc"], [], [any], 3000, stream(5)) - random)).toBeLessThan(0.04);
		// K-Q offsuit is ahead of a random hand and well behind a seat that re-raised.
		expect(rangeEquity(["Kd", "Qc"], [], [{ top: 0.08, strongOn: [] }], 3000, stream(5))).toBeLessThan(random - 0.15);
		// Top pair with a weak kicker against a preflop caller who bet this flop: far less than against any two cards.
		const board = ["Qh", "8d", "3c"];
		const flopRandom = equity(["Qc", "4s"], board, 1, 3000, stream(9));
		expect(rangeEquity(["Qc", "4s"], board, [{ top: 0.55, strongOn: [board] }], 3000, stream(9))).toBeLessThan(flopRandom - 0.15);
	});
});
