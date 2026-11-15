// SPDX-License-Identifier: Apache-2.0
/**
 * The standing checks of the Econ Lab, in process (M4 specification 4.3): the log replays equal, and a run resumed from
 * every tick boundary writes the log of the straight run. The scripted runs get both checks, the fake runs the
 * replay: their resume from every boundary is proven through the command line over the games list
 * (`apps/cli/test/standing.test.ts`).
 */
import { checkReplay, checkResumeEveryBoundary, fakeDriver, type StandingDrivers } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { econLabGame } from "../game.ts";
import { player, rosterGame } from "./support.ts";

const fake = (seed: number): StandingDrivers => (kernel) => ({ resident: fakeDriver(kernel, seed) });
/** The scripted seats of the carried test and the fake driver, on the default params, with the seeds of the games list. */
const RUNS = [23, 31].flatMap((seed) => [
	{ name: `scripted, seed ${String(seed)}`, game: rosterGame(), drivers: (): { resident: typeof player } => ({ resident: player }), options: { seed } },
	{ name: `fake, seed ${String(seed)}`, game: econLabGame(), drivers: fake(seed), options: { seed } },
]);

describe("the Econ Lab: the standing checks", () => {
	it.each(RUNS)("$name: the log replays equal", async ({ game, drivers, options }) => {
		expect(await checkReplay(game, drivers, options)).toEqual([]);
	});

	it.each(RUNS.filter((run) => run.name.startsWith("scripted")))("$name: resumed from every boundary, the log is the straight log", async ({ game, drivers, options }) => {
		expect(await checkResumeEveryBoundary(game, drivers, options)).toEqual([]);
	});
});
