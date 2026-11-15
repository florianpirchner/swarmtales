// SPDX-License-Identifier: Apache-2.0
/**
 * The standing checks of the city slice, in process (M4 specification 4.3): the log replays equal, and a run resumed from
 * every tick boundary writes the log of the straight run. The command line proves the same over the games list
 * (`apps/cli/test/standing.test.ts`).
 */
import { checkReplay, checkResumeEveryBoundary } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import game from "../game.ts";
import { drivers, RECORDS } from "./support.ts";

/** The scripted run without the Human Hand: the residents' script and the warden's scripted answers, with the seeds of the games list. */
const RUNS = [7, 11].map((seed) => ({ name: `scripted, seed ${String(seed)}`, game, drivers: () => drivers(seed), options: { seed, records: RECORDS } }));

describe("the city slice: the standing checks", () => {
	it.each(RUNS)("$name: the log replays equal", async ({ game, drivers, options }) => {
		expect(await checkReplay(game, drivers, options)).toEqual([]);
	});

	it.each(RUNS)("$name: resumed from every boundary, the log is the straight log", async ({ game, drivers, options }) => {
		expect(await checkResumeEveryBoundary(game, drivers, options)).toEqual([]);
	});
});
