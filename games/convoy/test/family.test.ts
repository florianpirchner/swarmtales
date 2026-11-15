// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Convoy as a game family (M4 specification, issue 52): the default params give the game of issue M4-46, the other
 * branches give the games of their old variants, every old variant name is reached by params, and a param the family
 * does not have, or a value out of its bounds, is refused with `SWT-G041`. The hashes were pinned on the plain game of
 * `rewrite/develop` 7156ef23, before the metrics were added.
 */
import { familyParams, isGameFamily } from "@swarmtales/sdk";
import { testKernel } from "@swarmtales/testkit";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import convoy, { convoyFamily, convoyGame } from "../game.ts";
import { VARIANTS } from "./support.ts";

/** The hash of the plain game of issue M4-46 (`convoyGame()`), taken before any change of this issue. */
const PINNED = "8ef88a474f316543e51d22e4c4bba70a84c7d3305a715d94f2bc957c4645f246";
/** The hashes of two more branches, taken the same way: `-nobrain` and `-g1-d4`. */
const BRANCHES: readonly (readonly [Readonly<Record<string, unknown>>, string])[] = [
	[{ brain: false }, "15583281e77e8d56db92262d96b5d56ee8b0d614ffee378fdf08caa36358fb60"],
	[{ games: 1, damageToLose: 4 }, "4359c3d3012586c20a796f73ad8b664e8c36aa382e32135872361a33ea937a2f"],
];

const hashOf = (game: Parameters<typeof testKernel>[0]): string => testKernel(game).kernel.snapshot().gameHash;
/** The game of the family for the overrides, after the params are checked. */
function arm(overrides: Readonly<Record<string, unknown>> = {}) {
	const { params, issues } = familyParams(convoyFamily, overrides);
	expect(issues).toEqual([]);
	return convoyFamily.build(Value.Parse(convoyFamily.params, params));
}

describe("the game family", () => {
	it("is the default export of the game file, with the params and defaults of the old registry", () => {
		expect(convoy).toBe(convoyFamily);
		expect(isGameFamily(convoy)).toBe(true);
		expect(familyParams(convoy).params).toEqual({ games: 3, crews: [2, 2, 3, 3, 3, 3, 4, 4], damageToLose: 3, cooldown: 3, brain: true, maxWords: 150, quietEnds: false });
	});

	it("gives the pinned game hash for the default params", () => {
		expect(hashOf(convoyGame())).toBe(PINNED);
		expect(hashOf(arm())).toBe(PINNED);
	});

	it.each(BRANCHES)("gives the game of the old variant for %j", (params, hash) => {
		expect(hashOf(arm(params))).toBe(hash);
	});

	it("reaches every old variant name of an oracle file and of the old runs index by params", () => {
		for (const [name, options] of Object.entries(VARIANTS)) expect(hashOf(arm({ ...options })), name).toBe(hashOf(convoyGame(options)));
	});

	it("refuses a param it does not have and a value out of the old bounds", () => {
		for (const params of [{ seed: 53 }, { games: 0 }, { damageToLose: 9 }, { cooldown: 0 }, { crews: [] }]) expect(familyParams(convoy, params).issues.map((issue) => issue.code), JSON.stringify(params)).toEqual(["SWT-G041"]);
	});
});
