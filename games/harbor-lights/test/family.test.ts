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

/** The hash of the plain game of issue M4-24 (`harborLightsGame()`), taken before any change of this issue. */
const PINNED = "90d8b3249981b78a7d4fcdc155f218b8443e33778201a495b2ccbdc37879ab6f";
/** The hashes of the two arms of the series, taken the same way: `-solo-g1` and `-nobrain-g1` of the old registry. */
const ARMS: readonly (readonly [Readonly<Record<string, unknown>>, string])[] = [
	[{ brain: "solo", games: 1 }, "d8eaa8a8627a9482cf8bfd1bd6bd9782e5a66b266eac587e1c64dfc18b6d9f56"],
	[{ brain: "nobrain", games: 1 }, "616208b1de48d29978deb6d1329fffd7d05d11185b1332f673ec8a0af4367276"],
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
