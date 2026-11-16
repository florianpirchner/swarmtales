// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Harbor Lights as a game family (M4 specification, issue 31): the default params give the game of issue M4-24, the
 * two arms of the series of section 7.2 give the games of their old variants, and a param the family does not have
 * is refused. The hashes were pinned on the plain game, before the metrics were added.
 */
import { familyParams, isGameFamily } from "@swarmtales/sdk";
import { testKernel } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import harborLights, { harborLightsGame } from "../game.ts";
import { arm } from "./support.ts";

/** The hash of the plain game of issue M4-24 (`harborLightsGame()`), taken before any change of this issue. Pinned again by M6-06: the rename of the mechanic and game ids moves the game hash (`13-m6-spec.md` 4.3). */
const PINNED = "f28f0b4c7413689a9ed57b46289fd93e9fd91f42eb7d296be7c3d2bdff6055bb";
/** The hashes of the two arms of the series, taken the same way: `-solo-g1` and `-nobrain-g1` of the old registry. */
const ARMS: readonly (readonly [Readonly<Record<string, unknown>>, string])[] = [
	[{ brain: "solo", games: 1 }, "f9c80d780598aaf477c8fe533bd278aa4b8a89732f449c291b5de729ef8bb342"],
	[{ brain: "nobrain", games: 1 }, "a9cf0e3df3846714fd463eb2afd7f081f4162d3c396e1fdce832ca8d00977ea4"],
];

const hashOf = (game: Parameters<typeof testKernel>[0]): string => testKernel(game).kernel.snapshot().gameHash;

describe("the game family", () => {
	it("is the default export of the game file, with the params and defaults of the old registry", () => {
		expect(isGameFamily(harborLights)).toBe(true);
		expect(familyParams(harborLights).params).toEqual({ games: 3, brain: "crew", strikes: "soft", aid: false, maxWords: 150 });
	});

	it("gives the pinned game hash for the default params", () => {
		expect(hashOf(harborLightsGame())).toBe(PINNED);
		expect(hashOf(arm())).toBe(PINNED);
	});

	it.each(ARMS)("gives the game of the old variant for %j", (params, hash) => {
		expect(hashOf(arm(params))).toBe(hash);
	});

	it("refuses a param it does not have", () => {
		expect(familyParams(harborLights, { seed: 31 }).issues.map((issue) => issue.code)).toEqual(["SWT-G041"]);
		expect(familyParams(harborLights, { brain: "captain" }).issues.map((issue) => issue.code)).toEqual(["SWT-G041"]);
	});
});
