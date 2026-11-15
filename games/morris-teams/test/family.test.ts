// SPDX-License-Identifier: Apache-2.0
/**
 * Nine men's morris as a game family (M4 specification, issue 52): the default params give the game of issue M4-43,
 * the other branches give the games of their old variants, every old variant name is reached by params, and a param
 * the family does not have, or a value out of its bounds, is refused with `SWT-G041`. The hashes were pinned on the
 * plain game of `rewrite/develop` 7156ef23, before the metrics were added.
 */
import { familyParams, isGameFamily } from "@swarmtales/sdk";
import { testKernel } from "@swarmtales/testkit";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import morris, { morrisFamily, morrisGame } from "../game.ts";
import { VARIANTS } from "./support.ts";

/** The hash of the plain game of issue M4-43 (`morrisGame()`), taken before any change of this issue. */
const PINNED = "8082715583bcd5b08d6eb722072e5245475e8f4d856cb3856be2a9c2f41973f3";
/** The hashes of two more branches, taken the same way: `-nobrain-solo` and `-solo-vs-engine3`. */
const BRANCHES: readonly (readonly [Readonly<Record<string, unknown>>, string])[] = [
	[{ brain: false, teamSize: 1 }, "7ce50ffd53509e25f936288e4413786900ce8afa6a2f644fa3448bb4b995135b"],
	[{ teamSize: 1, engineDepth: 3 }, "5dda92d3d9e1edf27d0b6d051ab8f227dea9671730345178eec89d70dff38432"],
];

const hashOf = (game: Parameters<typeof testKernel>[0]): string => testKernel(game).kernel.snapshot().gameHash;
/** The game of the family for the overrides, after the params are checked. */
function arm(overrides: Readonly<Record<string, unknown>> = {}) {
	const { params, issues } = familyParams(morrisFamily, overrides);
	expect(issues).toEqual([]);
	return morrisFamily.build(Value.Parse(morrisFamily.params, params));
}

describe("the game family", () => {
	it("is the default export of the game file, with the params and defaults of the old registry", () => {
		expect(morris).toBe(morrisFamily);
		expect(isGameFamily(morris)).toBe(true);
		expect(familyParams(morris).params).toEqual({ games: 3, brain: true, maxTurns: 120, maxQuietTurns: 40, maxWords: 300, maxRounds: 3, teamSize: 3, fixedCaptain: false, refereeDepth: 3, engineDepth: 0 });
	});

	it("gives the pinned game hash for the default params", () => {
		expect(hashOf(morrisGame())).toBe(PINNED);
		expect(hashOf(arm())).toBe(PINNED);
	});

	it.each(BRANCHES)("gives the game of the old variant for %j", (params, hash) => {
		expect(hashOf(arm(params))).toBe(hash);
	});

	it("reaches every old variant name of an oracle file and of the old runs index by params", () => {
		const names = { ...VARIANTS, "morris-teams-g1": { games: 1 }, "morris-teams-vs-engine2": { engineDepth: 2 }, "morris-teams-solo-vs-engine2": { teamSize: 1, engineDepth: 2 } } as const;
		for (const [name, options] of Object.entries(names)) expect(hashOf(arm({ ...options })), name).toBe(hashOf(morrisGame(options)));
	});

	it("refuses a param it does not have and a value out of the old bounds", () => {
		for (const params of [{ seed: 13 }, { teamSize: 2 }, { engineDepth: 7 }, { engineDepth: -1 }, { maxTurns: 9 }, { games: 21 }]) expect(familyParams(morris, params).issues.map((issue) => issue.code), JSON.stringify(params)).toEqual(["SWT-G041"]);
	});
});
