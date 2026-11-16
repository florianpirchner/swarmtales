// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The standing checks of Salt Market, in process (M4 specification 4.3): the log replays equal, and a run resumed from
 * its tick boundaries (every one of a run of up to 12 ticks, the eight of `sampleBoundaries` of a longer run) writes
 * the log of the straight run. A match of more than one game is checked on a variant with two games, as the old
 * snapshot test cut it (inside a game and inside the retro window between them); the scripted and the fake runs get
 * both checks (A43).
 */
import { checkReplay, checkResumeEveryBoundary, fakeDriver, type StandingDrivers } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { saltMarketGame } from "../game.ts";
import { rosterGame, trader } from "./support.ts";

const fake = (seed: number): StandingDrivers => (kernel) => ({ resident: fakeDriver(kernel, seed) });
const scripted = (): { resident: typeof trader } => ({ resident: trader });
/** The scripted traders of the carried test and the fake driver, each on two games, with the seeds of the games list. */
const RUNS = [41, 45].flatMap((seed) => [
	{ name: `scripted, seed ${String(seed)}`, game: rosterGame({ games: 2 }), drivers: scripted, options: { seed } },
	{ name: `fake, seed ${String(seed)}`, game: saltMarketGame({ games: 2 }), drivers: fake(seed), options: { seed } },
]);

describe("salt-market: the standing checks", () => {
	it.each(RUNS)("$name: the log replays equal", async ({ game, drivers, options }) => {
		expect(await checkReplay(game, drivers, options)).toEqual([]);
	});

	it.each(RUNS)("$name: resumed from its boundaries (every one up to 12 ticks, the eight of sampleBoundaries beyond), the log is the straight log", async ({ game, drivers, options }) => {
		expect(await checkResumeEveryBoundary(game, drivers, options)).toEqual([]);
	});
});
