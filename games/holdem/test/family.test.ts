// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Hold'em as a game family (M4 specification, issue 51): the default params give the game of issues M4-39 and M4-40,
 * the other branches give the games of their old variants, every old variant name is reached by params, and a param the
 * family does not have, or a value out of its bounds, is refused with `SWT-G041`. The hashes were pinned on the plain
 * game of `rewrite/develop` 7156ef23, before the metrics were added.
 */
import { familyParams, isGameFamily } from "@swarmtales/sdk";
import { testKernel } from "@swarmtales/testkit";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import holdem, { holdemFamily, holdemGame } from "../game.ts";
import { VARIANTS } from "./support.ts";

/** The hash of the plain game of issue M4-40 (`holdemGame()`), taken before any change of this issue. */
const PINNED = "218796e4d2d79904e15dd0274de88af9acd445181be3c1083c3d48d190908ff3";
/** The hashes of four more branches, taken the same way: heads-up, `-nobrain`, `-aid-mixed` and `-mixed`. */
const BRANCHES: readonly (readonly [Readonly<Record<string, unknown>>, string])[] = [
	[{ seats: 2 }, "2fe3af39d6699fcef216d0f7c43b6328b8ca0061d848d08fb6e0bac6ca94140d"],
	[{ brain: false }, "c35e642a6578df6409565fe6d0ab2980a17460dc17390d8fbd4de4d88890e310"],
	[{ brain: false, aidSeats: ["A01", "A03"] }, "f23abc2f3e19bb328c35ccfc8bdab0844f3dc0583645bf654149c746531517a6"],
	[{ brainSeats: ["A01", "A03"] }, "734235259f0489484642a51136cd61a1f37fdb8009241d4b8efce9beae969891"],
];

const hashOf = (game: Parameters<typeof testKernel>[0]): string => testKernel(game).kernel.snapshot().gameHash;
/** The game of the family for the overrides, after the params are checked. */
function arm(overrides: Readonly<Record<string, unknown>> = {}) {
	const { params, issues } = familyParams(holdemFamily, overrides);
	expect(issues).toEqual([]);
	return holdemFamily.build(Value.Parse(holdemFamily.params, params));
}

describe("the game family", () => {
	it("is the default export of the game file, with the params and defaults of the old registry", () => {
		expect(holdem).toBe(holdemFamily);
		expect(isGameFamily(holdem)).toBe(true);
		expect(familyParams(holdem).params).toEqual({ seats: 4, games: 0, hands: 0, brain: true, brainSeats: [], aidSeats: [], duplicate: true, maxWords: 150 });
	});

	it("gives the pinned game hash for the default params", () => {
		expect(hashOf(holdemGame())).toBe(PINNED);
		expect(hashOf(arm())).toBe(PINNED);
	});

	it.each(BRANCHES)("gives the game of the old variant for %j", (params, hash) => {
		expect(hashOf(arm(params))).toBe(hash);
	});

	it("reaches every old variant name of the old registry by params", () => {
		for (const [name, options] of Object.entries(VARIANTS)) expect(hashOf(arm({ ...options })), name).toBe(hashOf(holdemGame(options)));
	});

	it("takes the games and hands when they are set, and refuses a param it does not have and a value out of the old bounds", () => {
		expect(hashOf(arm({ seats: 2, games: 1, hands: 3 }))).toBe(hashOf(holdemGame({ seats: 2, games: 1, hands: 3 })));
		expect(hashOf(arm({ games: 4, hands: 8 }))).toBe(PINNED);
		expect(familyParams(holdem, { seed: 41 }).issues.map((issue) => issue.code)).toEqual(["SWT-G041"]);
		expect(familyParams(holdem, { seats: 7 }).issues.map((issue) => issue.code)).toEqual(["SWT-G041"]);
		expect(familyParams(holdem, { hands: 101 }).issues.map((issue) => issue.code)).toEqual(["SWT-G041"]);
		expect(() => arm({ aidSeats: ["A09"] })).toThrow(/A09/);
	});
});
