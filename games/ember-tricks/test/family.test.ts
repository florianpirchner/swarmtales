// SPDX-License-Identifier: Apache-2.0
/**
 * Ember Tricks as a game family (M4 specification, issue 51): the family of issue M4-34 is the default export, its
 * default params give the game of that issue, the other branches give the games of their old variants, every old
 * variant name is reached by params, and a param the family does not have, or a value out of its bounds, is refused
 * with `SWT-G041`. The hashes were pinned on the plain game of `rewrite/develop` 7156ef23, before the metrics were added.
 */
import { familyParams, isGameFamily } from "@swarmtales/sdk";
import { testKernel } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import emberTricks, { emberTricksFamily, emberTricksGame } from "../game.ts";
import { arm, VARIANTS } from "./support.ts";

/** The hash of the plain game of issue M4-34 (`emberTricksGame()`), taken before any change of this issue. */
const PINNED = "767f84a84f11d59a5612c69ad2b971388e85351b27cd4b3dd17bbcb0209ca05b";
/** The hashes of two more branches, taken the same way: `-nobrain` and `-mcbid-g4`. */
const BRANCHES: readonly (readonly [Readonly<Record<string, unknown>>, string])[] = [
	[{ brain: false }, "dee98f9adcf2cfaa6465c864a8e35031c2d981c1be0c5af00e3d38585c7296e4"],
	[{ games: 4, lever: "mcBid" }, "a03cd7f211ec48df424997f251c1d6fd4a0357968572adba44385f9d0986f2d2"],
];

const hashOf = (game: Parameters<typeof testKernel>[0]): string => testKernel(game).kernel.snapshot().gameHash;
// The options of the plain game behind the params of an old variant: rounds 1 to n, and no lever for "none".
function optionsOf({ rounds, lever, ...rest }: Readonly<Record<string, unknown>>): Parameters<typeof emberTricksGame>[0] {
	const games = typeof rest.games === "number" ? { games: rest.games } : {};
	const brain = typeof rest.brain === "boolean" ? { brain: rest.brain } : {};
	const cards = typeof rounds === "number" ? { rounds: Array.from({ length: rounds }, (_, index) => index + 1) } : {};
	const levers = ["bidSum", "calibration", "mcRetro", "mcBid"] as const;
	const chosen = levers.find((name) => name === lever);
	return { ...games, ...brain, ...cards, ...(chosen === undefined ? {} : { lever: chosen }) };
}

describe("the game family", () => {
	it("is the default export of the game file, with the params and defaults of the old registry", () => {
		expect(emberTricks).toBe(emberTricksFamily);
		expect(isGameFamily(emberTricks)).toBe(true);
		expect(familyParams(emberTricks).params).toEqual({ games: 2, rounds: 8, brain: true, lever: "none", maxWords: 200, quietEnds: false });
	});

	it("gives the pinned game hash for the default params", () => {
		expect(hashOf(emberTricksGame())).toBe(PINNED);
		expect(hashOf(arm())).toBe(PINNED);
	});

	it.each(BRANCHES)("gives the game of the old variant for %j", (params, hash) => {
		expect(hashOf(arm(params))).toBe(hash);
	});

	it("reaches every old variant name of an oracle file and of the old runs index by params", () => {
		for (const [name, params] of Object.entries(VARIANTS)) expect(hashOf(arm(params)), name).toBe(hashOf(emberTricksGame(optionsOf(params))));
	});

	it("refuses a param it does not have and a value out of the old bounds", () => {
		expect(familyParams(emberTricks, { seed: 31 }).issues.map((issue) => issue.code)).toEqual(["SWT-G041"]);
		expect(familyParams(emberTricks, { games: 0 }).issues.map((issue) => issue.code)).toEqual(["SWT-G041"]);
		expect(familyParams(emberTricks, { rounds: 11 }).issues.map((issue) => issue.code)).toEqual(["SWT-G041"]);
		expect(familyParams(emberTricks, { lever: "trumpHint" }).issues.map((issue) => issue.code)).toEqual(["SWT-G041"]);
	});
});
