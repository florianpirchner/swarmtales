// SPDX-License-Identifier: LicenseRef-SUL-1.0
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

/** The hash of the plain game of issue M4-26 (`lanternsGame()`), taken before any change of this issue. Pinned again by M6-06: the rename of the mechanic and game ids moves the game hash (`13-m6-spec.md` 4.3). */
const PINNED = "1dc4aab087326d4d1b25075650f42a45f7291c4ff636c80bd4ed086970d26457";
/** The hashes of `lanterns-nobrain` and `lanterns-g1` of the old registry, taken the same way. */
const ARMS: readonly (readonly [Readonly<Record<string, unknown>>, string])[] = [
	[{ brain: false }, "c98a0a41503fc0d9a90976d7ec5a15040bbb9707f37754e536a94e159f9b702a"],
	[{ games: 1 }, "9c39e5ac9360c52b7658c6576df39f78430346938bf6b57ecd75e37e9569ab89"],
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
