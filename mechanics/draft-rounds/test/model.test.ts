// SPDX-License-Identifier: Apache-2.0
/**
 * The rules of Quarry (carried from `test/stories/quarry.test.ts`, the block "Quarry rules"), and the proof that the
 * carried state schema is what the old platform had (commit 9765702).
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { DraftSlice } from "../src/model.ts";
import { deckOf, greedyTable, laneOf, scoreTable, setScore } from "../src/rules.ts";

describe("Quarry rules", () => {
	it("builds a deck of the four resources and the lodestones", () => {
		const deck = deckOf(48, 4);
		expect(deck).toHaveLength(48);
		expect(deck.filter((card) => card.kind === "lodestone")).toHaveLength(4);
		expect(deck.filter((card) => card.kind === "amber")).toHaveLength(11);
		expect(new Set(deck.map((card) => card.id)).size).toBe(48);
		// 50 cards, 2 wilds: 48 split as 12 each; 51 cards, 2 wilds: the first resource gets the extra card.
		expect(deckOf(51, 2).filter((card) => card.kind === "amber")).toHaveLength(13);
	});

	it("scores squares, one lodestone per set on the biggest sets, majorities and burns", () => {
		const c = (id: string, kind: "amber" | "basalt" | "cobalt" | "jade" | "lodestone") => ({ id, kind });
		// 3 amber + 1 basalt + 2 lodestones: amber 4^2 + basalt 2^2 = 20.
		expect(setScore([c("A1", "amber"), c("A2", "amber"), c("A3", "amber"), c("B1", "basalt"), c("L1", "lodestone"), c("L2", "lodestone")])).toBe(20);
		// Five lodestones alone: four sets of one, the fifth is worth nothing.
		expect(setScore([1, 2, 3, 4, 5].map((n) => c(`L${String(n)}`, "lodestone")))).toBe(4);
		const table = scoreTable(
			{ A01: [c("A1", "amber"), c("A2", "amber")], A02: [c("A3", "amber"), c("B1", "basalt")], A03: [c("B2", "basalt")] },
			{ A01: 1 },
			{ majorityBonus: 5, burnCost: 2, placeBonus: [] },
		);
		// A01: 4 + amber majority 5 - burn 2; A02 and A03 tie on basalt: nobody gets it.
		expect(table.A01).toMatchObject({ sets: 4, majorities: ["amber"], total: 7 });
		expect(table.A02).toMatchObject({ sets: 2, majorities: [], total: 2 });
		expect(table.A03).toMatchObject({ total: 1 });
		// A tie for the top resource names both lanes, never the first in the list (P124).
		expect(laneOf([c("C1", "cobalt"), c("J1", "jade"), c("A1", "amber"), c("J2", "jade"), c("C2", "cobalt")])).toEqual({ lanes: ["cobalt", "jade"], focus: 0.4 });
	});

	it("plays a greedy table on a fixed deal", () => {
		const scores = greedyTable(deckOf(48, 4), ["A01", "A02", "A03", "A04"], 2, 6, { majorityBonus: 5, burnCost: 2, placeBonus: [] });
		expect(Object.keys(scores)).toEqual(["A01", "A02", "A03", "A04"]);
		expect(Object.values(scores).every((score) => score > 0)).toBe(true);
	});
});

describe("the carried state", () => {
	it("has the snapshot slice of the old platform", () => {
		expect(createHash("sha256").update(JSON.stringify(DraftSlice)).digest("hex")).toBe("2794b990c899495e7cb502580d2a3c24558c9a3b93a9ec72fe1b3e52122490b4");
	});
});
