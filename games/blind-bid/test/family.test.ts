// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Blind Bid as a game family (M4 specification, issue 50): the default params give the game of issue M4-36, the other
 * branches give the games of their old variants, every old variant name is reached by params, and a param the family
 * does not have, or a value out of its bounds, is refused with `SWT-G041`. The hashes were pinned on the plain game of
 * `rewrite/develop` 675d5bd2, before the metrics were added.
 */
import { familyParams, isGameFamily } from "@swarmtales/sdk";
import { testKernel } from "@swarmtales/testkit";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import blindBid, { blindBidFamily, blindBidGame, DEFAULT_LOTS } from "../game.ts";
import { VARIANTS } from "./support.ts";

/** The hash of the plain game of issue M4-36 (`blindBidGame()`), taken before any change of this issue. Pinned again by M6-06: the rename of the mechanic and game ids moves the game hash (`13-m6-spec.md` 4.3). */
const PINNED = "dd5220f240047adcd47f430b57b066939b1c6720d9ef094723bc67d280977e2d";
/** The hashes of two more branches, taken the same way: `-nobrain` and `-g5`. */
const BRANCHES: readonly (readonly [Readonly<Record<string, unknown>>, string])[] = [
	[{ brain: false }, "0475fe381a9d9243d060457130d6bdb747c38cc9c427be6b995c51fa6b6907c7"],
	[{ games: 5 }, "a1e7fd80ea6777b7dbe5eceb259043135691b5a7bfff99a9408d3ed29c449d6a"],
];

const hashOf = (game: Parameters<typeof testKernel>[0]): string => testKernel(game).kernel.snapshot().gameHash;
/** The game of the family for the overrides, after the params are checked. */
function arm(overrides: Readonly<Record<string, unknown>> = {}) {
	const { params, issues } = familyParams(blindBidFamily, overrides);
	expect(issues).toEqual([]);
	return blindBidFamily.build(Value.Parse(blindBidFamily.params, params));
}

describe("the game family", () => {
	it("is the default export of the game file, with the params and defaults of the old registry", () => {
		expect(blindBid).toBe(blindBidFamily);
		expect(isGameFamily(blindBid)).toBe(true);
		expect(familyParams(blindBid).params).toEqual({ games: 3, lots: [...DEFAULT_LOTS], purse: 100, brain: true, maxWords: 150, quietEnds: false });
	});

	it("gives the pinned game hash for the default params", () => {
		expect(hashOf(blindBidGame())).toBe(PINNED);
		expect(hashOf(arm())).toBe(PINNED);
	});

	it.each(BRANCHES)("gives the game of the old variant for %j", (params, hash) => {
		expect(hashOf(arm(params))).toBe(hash);
	});

	it("reaches every old variant name of an oracle file and of the old registry's test by params", () => {
		for (const [name, options] of Object.entries(VARIANTS)) expect(hashOf(arm({ ...options })), name).toBe(hashOf(blindBidGame(options)));
	});

	it("takes another lot order, and refuses a param it does not have and a value out of the old bounds", () => {
		const lots = ["common", "first-price", "second-price"];
		expect(hashOf(arm({ lots }))).toBe(hashOf(blindBidGame({ lots: ["common", "first-price", "second-price"] })));
		expect(familyParams(blindBid, { seed: 31 }).issues.map((issue) => issue.code)).toEqual(["SWT-G041"]);
		expect(familyParams(blindBid, { games: 0 }).issues.map((issue) => issue.code)).toEqual(["SWT-G041"]);
		expect(familyParams(blindBid, { lots: [] }).issues.map((issue) => issue.code)).toEqual(["SWT-G041"]);
		expect(familyParams(blindBid, { lots: ["dutch"] }).issues.map((issue) => issue.code)).toEqual(["SWT-G041"]);
	});
});
