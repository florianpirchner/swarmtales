// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Salt Market as a game family (M4 specification, issue 67): the default params give the game of issue M4-49, the
 * other branches give the games of their old variants, every old variant name is reached by params, and a param the
 * family does not have, or a value out of its bounds, is refused with `SWT-G041`. The hashes were pinned on the plain
 * game of `rewrite/develop` f7f29c1d, before the metrics were added.
 */
import { familyParams, isGameFamily } from "@swarmtales/sdk";
import { testKernel } from "@swarmtales/testkit";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import saltMarket, { saltMarketFamily, saltMarketGame } from "../game.ts";
import { VARIANTS } from "./support.ts";

/** The hash of the plain game of issue M4-49 (`saltMarketGame()`), taken before any change of this issue. */
const PINNED = "8c24aa99e43429dfa43a6af6e1abee0ccc248da3dbe5c6a4152ad6577e128f19";
/** The hashes of two more branches, taken the same way: `-nobrain` and `-nobrain-g3-r8`. */
const BRANCHES: readonly (readonly [Readonly<Record<string, unknown>>, string])[] = [
	[{ brain: false }, "5fadb66a46b01c0485d78304a8bfacc2dd2eac20dacec1a3a6801fb1fd32dc87"],
	[{ brain: false, games: 3, rounds: 8 }, "3f66b42a04ec84506272cc83cd9b58b8f376c7683b275db6fc91ada543db1a1d"],
];

const hashOf = (game: Parameters<typeof testKernel>[0]): string => testKernel(game).kernel.snapshot().gameHash;
/** The game of the family for the overrides, after the params are checked. */
function arm(overrides: Readonly<Record<string, unknown>> = {}) {
	const { params, issues } = familyParams(saltMarketFamily, overrides);
	expect(issues).toEqual([]);
	return saltMarketFamily.build(Value.Parse(saltMarketFamily.params, params));
}

describe("the game family", () => {
	it("is the default export of the game file, with the params and defaults of the old registry", () => {
		expect(saltMarket).toBe(saltMarketFamily);
		expect(isGameFamily(saltMarket)).toBe(true);
		expect(familyParams(saltMarket).params).toEqual({ games: 4, rounds: 6, brain: true, spoil: true, maxWords: 150, markOwnOffers: false });
	});

	it("gives the pinned game hash for the default params", () => {
		expect(hashOf(saltMarketGame())).toBe(PINNED);
		expect(hashOf(arm())).toBe(PINNED);
	});

	it.each(BRANCHES)("gives the game of the old variant for %j", (params, hash) => {
		expect(hashOf(arm(params))).toBe(hash);
	});

	it("reaches every old variant name of an oracle file and of the old runs index by params", () => {
		for (const [name, options] of Object.entries(VARIANTS)) expect(hashOf(arm({ ...options })), name).toBe(hashOf(saltMarketGame(options)));
	});

	it("refuses a param it does not have and a value out of the old bounds", () => {
		for (const params of [{ seed: 53 }, { ticks: 90 }, { games: 0 }, { games: 21 }, { rounds: 1 }, { rounds: 21 }, { maxWords: 0 }]) expect(familyParams(saltMarket, params).issues.map((issue) => issue.code), JSON.stringify(params)).toEqual(["SWT-G041"]);
	});
});
