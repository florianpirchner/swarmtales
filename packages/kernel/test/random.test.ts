// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { describe, expect, it } from "vitest";
import { createRng, deriveSeed, rngFor, seedFrom } from "../src/random.ts";
import { RUNTIME_REVISION } from "../src/revision.ts";

const SIX = ["A01", "A02", "A03", "A04", "A05", "A06"];

describe("the carried generator (3.6): vectors computed on the old platform", () => {
	it("derives the seeds of the scheduler's first and second pass", () => {
		expect(deriveSeed(11, "turns", 0)).toBe(783580791);
		expect(deriveSeed(11, "turns", 0, 2)).toBe(1691496671);
	});

	it("shuffles the six ids of pass 1 and of pass 2 as the old platform did", () => {
		expect(rngFor(11, "turns", 0).shuffle(SIX)).toEqual(["A06", "A01", "A03", "A04", "A05", "A02"]);
		expect(rngFor(11, "turns", 0, 2).shuffle(SIX)).toEqual(["A06", "A04", "A05", "A02", "A01", "A03"]);
		expect(SIX).toEqual(["A01", "A02", "A03", "A04", "A05", "A06"]);
	});

	it("draws the first number of seed 1 and the first integer of a labelled stream", () => {
		expect(createRng(1).next()).toBe(0.6270739405881613);
		expect(rngFor(7, "deal", 3).int(1, 100)).toBe(17);
	});

	it("joins the seed and the labels with colons and hashes them with FNV-1a", () => {
		expect(seedFrom("")).toBe(0x811c9dc5);
		expect(seedFrom("a")).toBe(0xe40c292c);
		expect(deriveSeed(11, "turns", 0)).toBe(seedFrom("11:turns:0"));
		expect(deriveSeed(-1, "x")).toBe(seedFrom("4294967295:x"));
	});

	it("gives the same stream for the same seed, inside [0, 1)", () => {
		const one = createRng(42);
		const two = createRng(42);
		const draws = Array.from({ length: 50 }, () => one.next());
		expect(draws).toEqual(Array.from({ length: 50 }, () => two.next()));
		expect(draws.every((value) => value >= 0 && value < 1)).toBe(true);
	});

	it("refuses a bad range and an empty list", () => {
		const rng = createRng(3);
		expect(() => rng.int(2, 1)).toThrow(RangeError);
		expect(() => rng.int(0.5, 2)).toThrow(RangeError);
		expect(() => rng.pick([])).toThrow("pick() on an empty list");
		expect(rng.int(5, 5)).toBe(5);
		expect(SIX).toContain(rng.pick(SIX));
	});
});

describe("the runtime revision", () => {
	it("is 6: the rewritten kernel started at 3, 4 took the log positions out of the payloads (decision A34), 5 reserves the dearest answer against the cost cap (A46), 6 writes the closing of the meter on the log (A47)", () => {
		expect(RUNTIME_REVISION).toBe(6);
	});
});
