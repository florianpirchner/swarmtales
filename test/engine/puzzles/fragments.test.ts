import { describe, expect, it } from "vitest";
import { createRng } from "../../../src/core/random.ts";
import {
	assembleAll,
	drawPuzzle,
	generateLevelPuzzles,
	sharedGrams,
	splitAtCuts,
	validatePuzzle,
	type FragmentPuzzle,
} from "../../../src/engine/puzzles/fragments.ts";

function validPuzzle(seed: number, passwordLength: number, fragmentCount: number, overlap = 2): FragmentPuzzle {
	const [puzzle] = generateLevelPuzzles(createRng(seed), { teams: 1, passwordLength, fragmentCount, overlap });
	if (puzzle === undefined) throw new Error("no puzzle");
	return puzzle;
}

describe("fragment-overlap puzzle (SPEC 12.2)", () => {
	it.each([2, 3, 4])("assembles uniquely for k=%i", (fragmentCount) => {
		for (let round = 0; round < 25; round++) {
			const puzzle = validPuzzle(100 * fragmentCount + round, 8, fragmentCount);
			expect(validatePuzzle(puzzle)).toEqual([]);
			expect(puzzle.fragments).toHaveLength(fragmentCount);
			expect(assembleAll(puzzle.fragments, puzzle.overlap)).toEqual([puzzle.password]);
		}
	});

	it("overlaps by exactly the seam length", () => {
		expect(splitAtCuts("ABCDEFGH", [3], 2)).toEqual(["ABCDE", "DEFGH"]);
		expect(splitAtCuts("ABCDEFGHJK", [2, 5], 3)).toEqual(["ABCDE", "CDEFGH", "FGHJK"]);
	});

	it("never lets a single fragment determine the password", () => {
		for (let seed = 0; seed < 20; seed++) {
			const puzzle = validPuzzle(seed, 9, 3);
			for (const fragment of puzzle.fragments) expect(fragment.length).toBeLessThan(puzzle.password.length);
		}
	});

	it("never lets a proper subset reach the full length", () => {
		for (let seed = 0; seed < 20; seed++) {
			const puzzle = validPuzzle(seed, 8, 3);
			for (let skip = 0; skip < puzzle.fragments.length; skip++) {
				const subset = puzzle.fragments.filter((_, index) => index !== skip);
				expect(assembleAll(subset, puzzle.overlap).some((text) => text.length === puzzle.password.length)).toBe(false);
			}
		}
	});

	it("reports invariant violations", () => {
		expect(validatePuzzle({ password: "ABCDEFGH", fragments: ["ABCDEFGH", "GH"], overlap: 2 })).not.toEqual([]);
		expect(validatePuzzle({ password: "ABCDEF", fragments: ["ABCDEF"], overlap: 2 })).toEqual([]);
		expect(validatePuzzle({ password: "ABCDEF", fragments: ["ABCDEX"], overlap: 2 })).not.toEqual([]);
	});

	it("is reproducible for the same seed", () => {
		const options = { passwordLength: 7, fragmentCount: 2, overlap: 2 };
		expect(drawPuzzle(createRng(42), options)).toEqual(drawPuzzle(createRng(42), options));
	});

	it("keeps seams of one team out of every other team's password", () => {
		for (const overlap of [2, 3]) {
			const puzzles = generateLevelPuzzles(createRng(9), { teams: 4, passwordLength: 9, fragmentCount: 2, overlap });
			for (const [left, a] of puzzles.entries()) {
				for (const b of puzzles.slice(left + 1)) expect(sharedGrams(a.password, b.password, overlap)).toEqual([]);
			}
		}
	});
});
