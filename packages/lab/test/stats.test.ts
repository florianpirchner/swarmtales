// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The statistics of the lab: the numbers of the M0 noise floor from its value lists, hand examples, the fixed seed, the tolerance. */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BOOTSTRAP_SEED, pairedEffect, parseNoiseFloor, share, shareWithinNoise, summarize, unpairedEffect, withinNoise } from "../src/index.ts";
import { EXACT_PERMUTATION_RUNS, EXACT_SIGN_FLIP_PAIRS } from "../src/stats/effect.ts";
import { mulberry32, t95 } from "../src/stats/summary.ts";

const legacy = (game: string) => parseNoiseFloor(JSON.parse(readFileSync(fileURLToPath(new URL(`../../../games/${game}/noise-floor.legacy.json`, import.meta.url)), "utf8")));
/** The baseline series of M0 (`stories/<game>/runs/noise-floor.json` of the old platform), eight seeds, control then treatment. */
const QUARRY = { control: [1003, 991, 912, 964, 989, 921, 849, 962], open: [1116, 954, 924, 1117, 1044, 1004, 964, 1081] };
const ECON = { nobrain: [1, 0.6, 0.3, 0.3, 0.3, 0.25, 1, 0.3], brain: [0.05, 0.25, 0.15, 0.05, 0.05, 0.25, 0, 0.05] };
/** The five replicates of each treatment arm at the noise-floor seed. */
const QUARRY_OPEN_31 = [1042, 1038, 1132, 1139, 1004];
const ECON_BRAIN_41 = [0.2, 0.25, 0.1, 0, 0.25];
const CONTROL_31 = [1080, 1163, 1109, 1033, 1021];
const range = (n: number, value: (index: number) => number): number[] => Array.from({ length: n }, (_, index) => value(index));

describe("summarize", () => {
	it("reproduces the summaries of the two legacy noise-floor files from their values, bootstrap included", () => {
		for (const game of ["quarry", "econ-lab"]) {
			const floor = legacy(game);
			expect(summarize(floor.values), game).toEqual(floor.summary);
		}
		expect(legacy("quarry").values).toEqual(CONTROL_31);
		expect(summarize(CONTROL_31)).toMatchObject({ n: 5, mean: 1081.2, sd: 57.9068217052188, min: 1021, max: 1163, bootstrap95: [1037.6, 1126.2] });
	});

	it("gives the same interval twice for one seed, another for another seed, and draws from Mulberry32", () => {
		expect(summarize(CONTROL_31, 7)).toEqual(summarize(CONTROL_31, 7));
		expect(summarize(CONTROL_31, BOOTSTRAP_SEED)).toEqual(summarize(CONTROL_31));
		expect(summarize(QUARRY.control, 7).bootstrap95).not.toEqual(summarize(QUARRY.control).bootstrap95);
		expect(mulberry32(1)()).toBe(0.6270739405881613);
	});

	it("handles one value and refuses none", () => {
		expect(summarize([4])).toEqual({ n: 1, mean: 4, sd: 0, min: 4, max: 4, t95: [4, 4], bootstrap95: [4, 4] });
		expect(() => summarize([])).toThrow(RangeError);
		expect([t95(0), t95(4), t95(7.98), t95(400)]).toEqual([Number.POSITIVE_INFINITY, 2.776, 2.365, 2.042]);
	});
});

describe("pairedEffect", () => {
	it("reproduces +77 (SE 22) of quarry and -0.40 (SE 0.13) of econ-lab", () => {
		const quarry = pairedEffect(QUARRY.control, QUARRY.open);
		expect(quarry).toMatchObject({ estimate: 76.625, se: 22.36861441203468, n: 8, interval95: [23.72322691553797, 129.52677308446204], test: "sign-flip exact" });
		expect([Math.round(quarry.estimate), Math.round(quarry.se)]).toEqual([77, 22]);
		// 256 assignments; 6 reach |sum| >= 613: all signs kept, the -37 flipped, the -37 and the 12 flipped, and their mirrors.
		expect(quarry.p).toBe(6 / 256);
		const econ = pairedEffect(ECON.nobrain, ECON.brain);
		expect(econ.estimate).toBeCloseTo(-0.4, 12);
		expect(econ.se).toBeCloseTo(0.13058932356273015, 12);
		expect(econ.interval95[1]).toBeCloseTo(-0.09115624977414316, 12);
	});

	it("gives the sign-flip p of hand examples", () => {
		// Differences 3, 1, -1: the 8 sums are 5, 3, 3, 1, -1, -3, -3, -5; six are at least 3 from 0.
		expect(pairedEffect([0, 0, 0], [3, 1, -1]).p).toBe(6 / 8);
		// Differences 1, 2, 3, 4: only all plus and all minus reach 10.
		expect(pairedEffect([5, 5, 5, 5], [6, 7, 8, 9])).toMatchObject({ estimate: 2.5, n: 4, p: 2 / 16 });
		expect(() => pairedEffect([1, 2], [1])).toThrow(RangeError);
		expect(() => pairedEffect([1], [2])).toThrow(RangeError);
	});

	it("is exact up to 16 pairs and sampled with a seed above", () => {
		const zeros = range(EXACT_SIGN_FLIP_PAIRS + 1, () => 0);
		const up = range(EXACT_SIGN_FLIP_PAIRS + 1, (index) => index + 1);
		expect(pairedEffect(zeros.slice(1), up.slice(1))).toMatchObject({ p: 2 / 65536, test: "sign-flip exact" });
		// The first eight differences negative: the sum is 81 of 153, 1.9 standard deviations of a flipped sum (42).
		const mixed = up.map((value, index) => (index < 8 ? -value : value));
		const sampled = pairedEffect(zeros, mixed, 3);
		expect(sampled.test).toBe("sign-flip sampled");
		expect(sampled.p).toBeGreaterThan(0.03);
		expect(sampled.p).toBeLessThan(0.09);
		expect(sampled).toEqual(pairedEffect(zeros, mixed, 3));
	});
});

describe("unpairedEffect", () => {
	it("reproduces the same-seed differences of the noise floor (Welch)", () => {
		expect(unpairedEffect(CONTROL_31, QUARRY_OPEN_31)).toMatchObject({ estimate: -10.200000000000045, se: 37.53451744727777, n: 10, interval95: [-98.96913376281198, 78.56913376281189], test: "label-permutation exact" });
		const econ = unpairedEffect(legacy("econ-lab").values, ECON_BRAIN_41);
		expect(econ.se).toBeCloseTo(0.1387443692551161, 12);
		expect(econ.interval95[0]).toBeCloseTo(-1.0667117733549034, 12);
		// Every brain value is below every control value: of 252 splits only the observed one and its mirror reach it.
		expect(econ.p).toBe(2 / 252);
	});

	it("gives the permutation p of a hand example", () => {
		// 1, 2 against 3, 4: the six splits give 2, 1, 0, 0, -1, -2.
		expect(unpairedEffect([1, 2], [3, 4])).toMatchObject({ estimate: 2, p: 2 / 6 });
		expect(unpairedEffect([2, 2], [2, 2])).toMatchObject({ estimate: 0, se: 0, interval95: [0, 0], p: 1 });
		expect(() => unpairedEffect([1], [2, 3])).toThrow(RangeError);
	});

	it("is exact up to 24 runs and sampled with a seed above", () => {
		const a = range(12, (index) => index);
		expect(unpairedEffect(a, range(12, (index) => index + 100))).toMatchObject({ p: 2 / 2704156, test: "label-permutation exact" });
		const b = range(EXACT_PERMUTATION_RUNS - 11, (index) => index + 5);
		const sampled = unpairedEffect(a, b, 3);
		expect(sampled.test).toBe("label-permutation sampled");
		expect(sampled.p).toBeGreaterThan(0.001);
		expect(sampled.p).toBeLessThan(0.2);
		expect(sampled).toEqual(unpairedEffect(a, b, 3));
	});
});

describe("share and the tolerance", () => {
	it("gives the Wilson interval", () => {
		const four = share(4, 5);
		expect(four.share).toBe(0.8);
		expect(four.interval95[0]).toBeCloseTo(0.3755, 4);
		expect(four.interval95[1]).toBeCloseTo(0.9638, 4);
		expect(share(5, 5).interval95[1]).toBe(1);
		expect(share(0, 5).interval95[0]).toBe(0);
		expect(() => share(6, 5)).toThrow(RangeError);
		expect(() => share(0, 0)).toThrow(RangeError);
	});

	it("1081 against five values with SD 58: within at 73 points, not within at 74", () => {
		const at = (shift: number) => withinNoise(CONTROL_31, CONTROL_31.map((value) => value + shift));
		expect(at(73)).toMatchObject({ baselineMean: 1081.2, newMean: 1154.2, difference: 73, within: true });
		expect(at(73).se).toBeCloseTo(36.6235, 4);
		expect([at(74).within, at(-73).within, at(-74).within]).toEqual([false, true, false]);
	});

	it("a share is outside only for a gross break", () => {
		const locked = legacy("econ-lab").values;
		expect(shareWithinNoise(locked, [1, 1, 1, 1, 1], 1)).toMatchObject({ baselineMean: 0.8, newMean: 1, within: true });
		expect(shareWithinNoise(locked, [0.3, 0.3, 0.3, 0.3, 0.3], 1)).toMatchObject({ newMean: 0, within: true });
		expect(shareWithinNoise([1, 1, 1, 1, 1], [0.3, 0.3, 0.3, 0.3, 0.99], 1)).toMatchObject({ difference: -1, se: 0, within: false });
	});
});
