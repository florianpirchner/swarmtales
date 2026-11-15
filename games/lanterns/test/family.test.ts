// SPDX-License-Identifier: Apache-2.0
/**
 * Lanterns as a game family (M4 specification, issue 31): the default params give the game of issue M4-26, the
 * control arm of the series of section 7.2 and the variant of the silent file give the games of their old variants,
 * and a param the family does not have is refused. The hashes were pinned on the plain game, before the family was
 * built.
 */
import { familyParams, isGameFamily } from "@swarmtales/sdk";
import { testKernel } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import lanterns, { lanternsGame } from "../game.ts";
import { arm } from "./support.ts";

/** The hash of the plain game of issue M4-26 (`lanternsGame()`), taken before any change of this issue. */
const PINNED = "c4a48f5d3d765efd6b8f3eb4917f65c579b78d110c929f4ff17559441de04dd7";
/** The hashes of `lanterns-nobrain` and `lanterns-g1` of the old registry, taken the same way. */
const ARMS: readonly (readonly [Readonly<Record<string, unknown>>, string])[] = [
	[{ brain: false }, "53efcd86342b7181250f712748b6ed3476b97f1cf16f252fac985629efe3dc49"],
	[{ games: 1 }, "e4ec002c8a322754097aceb8890b5b1c76e8d38fe6af673a465b0220b8b3f2ab"],
];

const hashOf = (game: Parameters<typeof testKernel>[0]): string => testKernel(game).kernel.snapshot().gameHash;

describe("the game family", () => {
	it("is the default export of the game file, with the params and defaults of the old registry", () => {
		expect(isGameFamily(lanterns)).toBe(true);
		expect(familyParams(lanterns).params).toEqual({ games: 4, brain: true, maxClues: 5, maxWords: 200 });
	});

	it("gives the pinned game hash for the default params: the treatment arm", () => {
		expect(hashOf(lanternsGame())).toBe(PINNED);
		expect(hashOf(arm())).toBe(PINNED);
	});

	it.each(ARMS)("gives the game of the old variant for %j", (params, hash) => {
		expect(hashOf(arm(params))).toBe(hash);
	});

	it("refuses a param it does not have", () => {
		expect(familyParams(lanterns, { seed: 31 }).issues.map((issue) => issue.code)).toEqual(["SWT-G041"]);
		expect(familyParams(lanterns, { brain: "no" }).issues.map((issue) => issue.code)).toEqual(["SWT-G041"]);
		expect(familyParams(lanterns, { minutes: 40 }).issues.map((issue) => issue.code)).toEqual(["SWT-G041"]);
	});
});
