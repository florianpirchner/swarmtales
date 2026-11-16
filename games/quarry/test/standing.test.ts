// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The standing checks of Quarry, in process (M4 specification 4.3): the log replays equal, and a run resumed from its
 * tick boundaries (every one of a run of up to 12 ticks, the eight of `sampleBoundaries` of a longer run) writes the
 * log of the straight run. The scripted runs get both checks, the fake runs the replay: their resume is proven through
 * the command line (from the first, middle and last boundary of a run of up to 12 ticks, from the middle one of a
 * longer run) over the games list (`apps/cli/test/standing.test.ts`).
 */
import { checkReplay, checkResumeEveryBoundary, fakeDriver, type StandingDrivers } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { quarryGame } from "../game.ts";
import { player, rosterGame } from "./support.ts";

const fake = (seed: number): StandingDrivers => (kernel) => ({ resident: fakeDriver(kernel, seed) });
/** The scripted seats of the carried test and the fake driver, on the default params, with the seeds of the games list. */
const RUNS = [29, 31].flatMap((seed) => [
	{ name: `scripted, seed ${String(seed)}`, game: rosterGame(), drivers: (): { resident: typeof player } => ({ resident: player }), options: { seed } },
	{ name: `fake, seed ${String(seed)}`, game: quarryGame(), drivers: fake(seed), options: { seed } },
]);

describe("Quarry: the standing checks", () => {
	it.each(RUNS)("$name: the log replays equal", async ({ game, drivers, options }) => {
		expect(await checkReplay(game, drivers, options)).toEqual([]);
	});

	it.each(RUNS.filter((run) => run.name.startsWith("scripted")))("$name: resumed from its boundaries (every one up to 12 ticks, the eight of sampleBoundaries beyond), the log is the straight log", async ({ game, drivers, options }) => {
		expect(await checkResumeEveryBoundary(game, drivers, options)).toEqual([]);
	});
});
