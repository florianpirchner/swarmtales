// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The rules of Lanterns as pure functions. Carried from "Lanterns rules" of `test/stories/lanterns.test.ts`. */
import { describe, expect, it } from "vitest";
import { clueProblem, dealGrid, keeperOf, landedOf, paceLine, referenceOf, scoreGame, seekersOf, stemOf, type Card, type ClueRecord } from "../src/model.ts";
import { WORD_POOL } from "../src/words.ts";

const card = (word: string, owner: Card["owner"], revealed = false, by: Card["by"] = null): Card => ({ word, owner, revealed, by });

describe("Lanterns rules", () => {
	it("has a pool with no word inside another and no shared stem", () => {
		expect(new Set(WORD_POOL).size).toBe(WORD_POOL.length);
		expect(WORD_POOL.length).toBeGreaterThan(200);
		// No word is also the name of an owner: "shadow" on the grid read as a shadow card in the first run (P190).
		expect(WORD_POOL.filter((word) => ["amber", "teal", "fog", "shadow"].includes(word))).toEqual([]);
		const clashes = WORD_POOL.flatMap((a) => WORD_POOL.filter((b) => a !== b && ((a.length >= 3 && b.includes(a)) || stemOf(a) === stemOf(b))).map((b) => `${a}/${b}`));
		expect(clashes).toEqual([]);
	});

	it("deals 20 words: six and five per team, two shadows, the rest fog", () => {
		// The old test shuffled with the run's stream; the counts hold for any shuffle.
		const grid = dealGrid({ size: 20, amber: 6, teal: 5, shadows: 2 }, (items) => [...items].reverse());
		expect(grid).toHaveLength(20);
		expect(new Set(grid.map((entry) => entry.word)).size).toBe(20);
		const count = (owner: Card["owner"]) => grid.filter((entry) => entry.owner === owner).length;
		expect([count("amber"), count("teal"), count("shadow"), count("fog")]).toEqual([6, 5, 2, 7]);
		expect(() => dealGrid({ size: 10, amber: 6, teal: 6, shadows: 0 }, (items) => [...items])).toThrow(RangeError);
	});

	it("refuses clues that are not one word, are on the grid, hold a grid word or share its stem", () => {
		const grid = [card("river", "amber"), card("lantern", "teal"), card("fox", "fog")];
		expect(clueProblem("water", grid)).toBeUndefined();
		expect(clueProblem("Water", grid)).toBeUndefined();
		expect(clueProblem("deep water", grid)).toContain("one word");
		expect(clueProblem("h2o", grid)).toContain("one word");
		expect(clueProblem("River", grid)).toContain("on the grid");
		expect(clueProblem("riverbank", grid)).toContain("too close");
		expect(clueProblem("lant", grid)).toContain("too close");
		expect(clueProblem("rivers", grid)).toContain("too close");
		expect(clueProblem("foxes", grid)).toContain("too close");
		// Two letters are too short to count as inside a word.
		expect(clueProblem("ox", grid)).toBeUndefined();
	});

	it("lands a clue only when its first `number` guesses are own words", () => {
		const guess = (owner: Card["owner"]) => ({ word: "w", owner, by: "A02", target: false });
		expect(landedOf({ team: "amber", number: 2, guesses: [guess("amber"), guess("amber"), guess("fog")] })).toBe(true);
		expect(landedOf({ team: "amber", number: 2, guesses: [guess("amber"), guess("teal")] })).toBe(false);
		expect(landedOf({ team: "amber", number: 2, guesses: [guess("amber")] })).toBe(false);
		expect(landedOf({ team: "amber", number: 1, guesses: [guess("amber")] })).toBe(false);
	});

	it("scores words for their owner, shadows against the revealer, landed clues and the finish", () => {
		const grid = [card("a", "amber", true, "amber"), card("b", "amber", true, "teal"), card("c", "teal", true, "teal"), card("d", "shadow", true, "teal"), card("e", "teal")];
		const clue = (team: "amber" | "teal", landed: boolean): ClueRecord => ({ game: 1, team, keeper: "", caller: "", clueNo: 1, word: "x", number: 2, targets: [], guesses: [], end: "stopped", landed });
		const scores = scoreGame(grid, [clue("amber", true), clue("teal", false)], "amber", { wordPoints: 1, shadowPenalty: 3, landedBonus: 1, finishBonus: 3 });
		// Amber: two words (one revealed by teal), a landed clue and the finish.
		expect(scores.amber).toEqual({ words: 2, shadows: 0, landed: 1, landedPoints: 1, finished: true, total: 6 });
		// Teal: one word, one shadow.
		expect(scores.teal).toEqual({ words: 1, shadows: 1, landed: 0, landedPoints: 0, finished: false, total: -2 });
		// A landed 3 is worth two bonus points, a landed 4 three (P191).
		const three = scoreGame([], [{ ...clue("teal", true), number: 3 }, { ...clue("teal", true), number: 4 }], null, { wordPoints: 1, shadowPenalty: 3, landedBonus: 1, finishBonus: 3 });
		expect(three.teal).toMatchObject({ landed: 2, landedPoints: 5, total: 5 });
	});

	it("measures how much of what the keeper meant the seekers found", () => {
		const clues: ClueRecord[] = [
			{ game: 1, team: "amber", keeper: "A01", caller: "A02", clueNo: 1, word: "sea", number: 2, targets: ["ship", "whale"], guesses: [{ word: "ship", owner: "amber", by: "A02", target: true }, { word: "pearl", owner: "amber", by: "A02", target: false }, { word: "fox", owner: "fog", by: "A02", target: false }], end: "wrong", landed: true },
			{ game: 1, team: "amber", keeper: "A01", caller: "A03", clueNo: 2, word: "", number: 0, targets: [], guesses: [], end: "no-clue", landed: false },
		];
		expect(referenceOf("amber", clues)).toMatchObject({ clues: 2, missedClues: 1, meanNumber: 2, guesses: 3, ownHits: 2, targetHits: 1, recall: 0.5, precision: 0.667, fogHits: 1 });
	});

	it("tells the keeper words left against clues left (P197)", () => {
		expect(paceLine(4, 2)).toBe("Your team has 4 hidden words left and 2 clues (this one included): to find them all, a clue must average 2 words or more.");
		expect(paceLine(5, 2)).toContain("average 3 words");
		expect(paceLine(1, 3)).toContain("average 1 word or more");
		expect(paceLine(3, 1)).toBe("Your team has 3 hidden words left and this is its last clue.");
	});

	it("rotates the keeper through the team, one game each", () => {
		const team = ["A01", "A02", "A03"];
		expect([1, 2, 3, 4].map((game) => keeperOf(team, game))).toEqual(["A01", "A02", "A03", "A01"]);
		expect(seekersOf(team, 2)).toEqual(["A01", "A03"]);
	});
});
