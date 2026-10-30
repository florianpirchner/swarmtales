import { describe, expect, it } from "vitest";
import { createRng, deriveSeed, rngFor, seedFrom } from "../../src/core/random.ts";

describe("random", () => {
	it("is reproducible for the same seed", () => {
		const first = createRng(42);
		const second = createRng(42);
		const draw = (rng: ReturnType<typeof createRng>) => Array.from({ length: 20 }, () => rng.int(0, 1000));
		expect(draw(second)).toEqual(draw(first));
	});

	it("draws integers inside the inclusive range", () => {
		const rng = createRng(1);
		for (let i = 0; i < 500; i++) {
			const value = rng.int(3, 5);
			expect(value).toBeGreaterThanOrEqual(3);
			expect(value).toBeLessThanOrEqual(5);
		}
		expect(() => rng.int(5, 3)).toThrow(RangeError);
	});

	it("shuffles into a permutation without touching the input", () => {
		const input = ["a", "b", "c", "d", "e"] as const;
		const shuffled = createRng(9).shuffle(input);
		expect([...shuffled].sort()).toEqual([...input]);
		expect(input).toEqual(["a", "b", "c", "d", "e"]);
	});

	it("derives unrelated streams for different purposes", () => {
		expect(deriveSeed(7, "order", 1)).not.toBe(deriveSeed(7, "order", 2));
		expect(deriveSeed(7, "order", 1)).not.toBe(deriveSeed(8, "order", 1));
		expect(deriveSeed(7, "order", 1)).toBe(deriveSeed(7, "order", 1));
		expect(rngFor(7, "teams", 2).next()).toBe(rngFor(7, "teams", 2).next());
	});

	it("hashes text stably", () => {
		expect(seedFrom("cityofkeys")).toBe(seedFrom("cityofkeys"));
		expect(seedFrom("cityofkeys")).not.toBe(seedFrom("nexuz"));
	});

	it("refuses to pick from an empty list", () => {
		expect(() => createRng(1).pick([])).toThrow(RangeError);
	});
});
