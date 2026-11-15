// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The standing checks of Ember Tricks, in process (M4 specification 4.3): the log replays equal, and a run resumed
 * from every tick boundary writes the log of the straight run. The match of the registry default (two games) is
 * checked on games of three rounds, so that a cut falls inside a game and inside the retro window between them; the
 * scripted seats (with notes, on the calibration and bid-aid levers, and the control arm) and the fake runs get both
 * checks.
 */
import { checkReplay, checkResumeEveryBoundary, fakeDriver, type StandingDrivers } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { emberTricksGame } from "../game.ts";
import { notes, trickPlayer } from "./support.ts";

const ROUNDS = [1, 2, 3];
const fake = (seed: number): StandingDrivers => (kernel) => ({ resident: fakeDriver(kernel, seed) });
const scripted = (): { resident: ReturnType<typeof trickPlayer> } => ({ resident: trickPlayer({ notes }) });
/** The scripted seats and the fake driver, two games of three rounds each, with the seeds of the games list. */
const RUNS = [23, 31].flatMap((seed) => [
	{ name: `scripted notes, seed ${String(seed)}`, game: emberTricksGame({ rounds: ROUNDS }), drivers: scripted, options: { seed } },
	{ name: `scripted mcBid, seed ${String(seed)}`, game: emberTricksGame({ rounds: ROUNDS, lever: "mcBid" }), drivers: scripted, options: { seed } },
	{ name: `scripted nobrain, seed ${String(seed)}`, game: emberTricksGame({ rounds: ROUNDS, brain: false }), drivers: scripted, options: { seed } },
	{ name: `fake, seed ${String(seed)}`, game: emberTricksGame({ rounds: ROUNDS }), drivers: fake(seed), options: { seed } },
]);

describe("Ember Tricks: the standing checks", () => {
	it.each(RUNS)("$name: the log replays equal", async ({ game, drivers, options }) => {
		expect(await checkReplay(game, drivers, options)).toEqual([]);
	});

	it.each(RUNS)("$name: resumed from every boundary, the log is the straight log", async ({ game, drivers, options }) => {
		expect(await checkResumeEveryBoundary(game, drivers, options)).toEqual([]);
	});
});
