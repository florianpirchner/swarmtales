// SPDX-License-Identifier: Apache-2.0
/**
 * The standing checks of the Hello Game, in process (M4 specification 4.3): the log replays equal, and a run resumed from
 * every tick boundary writes the log of the straight run. The command line proves the same over the games list
 * (`apps/cli/test/standing.test.ts`).
 */
import { checkReplay, checkResumeEveryBoundary, fakeDriver, type StandingDrivers } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import game from "../game.ts";

const fake = (seed: number): StandingDrivers => (kernel) => ({ resident: fakeDriver(kernel, seed) });
/** The game has no script of its own: the fake driver plays it, with the seeds of the games list. */
const RUNS = [1, 2].map((seed) => ({ name: `fake, seed ${String(seed)}`, game, drivers: fake(seed), options: { seed } }));

describe("the Hello Game: the standing checks", () => {
	it.each(RUNS)("$name: the log replays equal", async ({ game, drivers, options }) => {
		expect(await checkReplay(game, drivers, options)).toEqual([]);
	});

	it.each(RUNS)("$name: resumed from every boundary, the log is the straight log", async ({ game, drivers, options }) => {
		expect(await checkResumeEveryBoundary(game, drivers, options)).toEqual([]);
	});
});
