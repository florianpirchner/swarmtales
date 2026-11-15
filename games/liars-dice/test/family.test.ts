// SPDX-License-Identifier: Apache-2.0
/**
 * Liar's dice as a game family (M4 specification, issue 50): the default params give the game of issue M4-20, the other
 * branches give the games of their old variants, every old variant name is reached by params, and a param the family
 * does not have, or a value out of its bounds, is refused with `SWT-G041`. The hashes were pinned on the plain game of
 * `rewrite/develop` 675d5bd2, before the metrics were added.
 */
import { familyParams, isGameFamily } from "@swarmtales/sdk";
import { testKernel } from "@swarmtales/testkit";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import liarsDice, { liarsDiceFamily, liarsDiceGame } from "../game.ts";
import { VARIANTS } from "./support.ts";

/** The hash of the plain game of issue M4-20 (`liarsDiceGame()`), taken before any change of this issue. */
const PINNED = "34348d6e83cee4f48c27bc4e3c546eeb017923f007f3228a2739afdb2363baeb";
/** The hashes of two more branches, taken the same way: `-nobrain` and `-hu-quiet-g2-d5`. */
const BRANCHES: readonly (readonly [Readonly<Record<string, unknown>>, string])[] = [
	[{ brain: false }, "5549b023da6d0910d446b9b14549b4dd99f830b16bce4e7e4827615326df962e"],
	[{ seats: 2, talk: false, games: 2, dice: 5 }, "070284720b994c5d69d734b7f862246399dfd0ebe697b3981fff76468e1c339c"],
];

const hashOf = (game: Parameters<typeof testKernel>[0]): string => testKernel(game).kernel.snapshot().gameHash;
/** The game of the family for the overrides, after the params are checked. */
function arm(overrides: Readonly<Record<string, unknown>> = {}) {
	const { params, issues } = familyParams(liarsDiceFamily, overrides);
	expect(issues).toEqual([]);
	return liarsDiceFamily.build(Value.Parse(liarsDiceFamily.params, params));
}

describe("the game family", () => {
	it("is the default export of the game file, with the params and defaults of the old registry", () => {
		expect(liarsDice).toBe(liarsDiceFamily);
		expect(isGameFamily(liarsDice)).toBe(true);
		expect(familyParams(liarsDice).params).toEqual({ seats: 4, games: 3, dice: 4, brain: true, talk: true, maxWords: 150 });
	});

	it("gives the pinned game hash for the default params", () => {
		expect(hashOf(liarsDiceGame())).toBe(PINNED);
		expect(hashOf(arm())).toBe(PINNED);
	});

	it.each(BRANCHES)("gives the game of the old variant for %j", (params, hash) => {
		expect(hashOf(arm(params))).toBe(hash);
	});

	it("reaches every old variant name of an oracle file and of the old runs index by params", () => {
		for (const [name, options] of Object.entries(VARIANTS)) expect(hashOf(arm({ ...options })), name).toBe(hashOf(liarsDiceGame(options)));
	});

	it("refuses a param it does not have and a value out of the old bounds", () => {
		expect(familyParams(liarsDice, { seed: 31 }).issues.map((issue) => issue.code)).toEqual(["SWT-G041"]);
		expect(familyParams(liarsDice, { seats: 7 }).issues.map((issue) => issue.code)).toEqual(["SWT-G041"]);
		expect(familyParams(liarsDice, { seats: 1 }).issues.map((issue) => issue.code)).toEqual(["SWT-G041"]);
		expect(familyParams(liarsDice, { dice: 0 }).issues.map((issue) => issue.code)).toEqual(["SWT-G041"]);
	});
});
