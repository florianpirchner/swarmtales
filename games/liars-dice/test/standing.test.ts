// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The standing checks of liar's dice, in process (M4 specification 4.3): the log replays equal, and a run resumed
 * from every tick boundary writes the log of the straight run. The scripted runs get both checks on a match of one
 * game (the game file plays three), the fake runs too: the fake run of seed 7 found the bid of `dice_called` in
 * sorted key order after a resume (A43); the command line proves the same over the games list
 * (`apps/cli/test/standing.test.ts`).
 */
import { checkReplay, checkResumeEveryBoundary, fakeDriver, type StandingDrivers } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { liarsDiceGame } from "../game.ts";
import { player, rosterGame } from "./support.ts";

const fake = (seed: number): StandingDrivers => (kernel) => ({ resident: fakeDriver(kernel, seed) });
/** The scripted seats of the carried test on one game, and the fake driver on the game file, with the seeds of the games list. */
const RUNS = [7, 11].flatMap((seed) => [
	{ name: `scripted, seed ${String(seed)}`, game: rosterGame({ games: 1 }), drivers: (): { resident: typeof player } => ({ resident: player }), options: { seed } },
	{ name: `fake, seed ${String(seed)}`, game: liarsDiceGame(), drivers: fake(seed), options: { seed } },
]);

describe("liar's dice: the standing checks", () => {
	it.each(RUNS)("$name: the log replays equal", async ({ game, drivers, options }) => {
		expect(await checkReplay(game, drivers, options)).toEqual([]);
	});

	it.each(RUNS)("$name: resumed from every boundary, the log is the straight log", async ({ game, drivers, options }) => {
		expect(await checkResumeEveryBoundary(game, drivers, options)).toEqual([]);
	});
});
