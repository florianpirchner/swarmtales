// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The standing checks of nine men's morris, in process (M4 specification 4.3): the log replays equal, and a run resumed
 * from its tick boundaries (every one of a run of up to 12 ticks, the eight of `sampleBoundaries` of a longer run)
 * writes the log of the straight run. The scripted runs (one game of at most 30 turns, two teams and one resident
 * against the search) and a fake run of one game get both checks; the fake runs on the game's params get the replay.
 * The fake run of the game file (its default params, `morrisGame()`) at the fake seed of the games list (seed 7, 156
 * ticks) is resumed from the eight boundaries of `sampleBoundaries` (J256, decision A102): the command line resumes it
 * from the middle boundary only (`apps/cli/test/standing-part.ts`). Every run here longer than 12 ticks is resumed from
 * those eight.
 *
 * The fake driver hands control back to the event loop before each activation (decision A112): the runs never wait on
 * a timer or a file, so without it this file held its Vitest worker's event loop for 52 s on three workers, near
 * Vitest's 60 s RPC timeout. The log does not change: the driver's calls and their order are the same.
 */
import { checkReplay, checkResumeEveryBoundary, fakeDriver, type StandingDrivers } from "@swarmtales/testkit";
import { setImmediate as handBack } from "node:timers/promises";
import { describe, expect, it } from "vitest";
import { morrisGame } from "../game.ts";
import { morrisPlayer } from "./support.ts";

const fake =
	(seed: number): StandingDrivers =>
	(kernel) => {
		const driver = fakeDriver(kernel, seed);
		return {
			resident: async (activation) => {
				await handBack();
				await driver(activation);
			},
		};
	};
const scripted = (): { resident: typeof morrisPlayer } => ({ resident: morrisPlayer });
const RUNS = [
	{ name: "scripted teams", game: morrisGame({ games: 1, maxTurns: 30, refereeDepth: 2 }), drivers: scripted, options: {} },
	{ name: "scripted against the search", game: morrisGame({ games: 1, maxTurns: 30, refereeDepth: 2, teamSize: 1, engineDepth: 2 }), drivers: scripted, options: {} },
	// A match of one game: every boundary of the game file's three games would take the fake run more than a minute.
	{ name: "fake, one game, seed 13", game: morrisGame({ games: 1 }), drivers: fake(13), options: { seed: 13 } },
	...[13, 31].map((seed) => ({ name: `fake, seed ${String(seed)}`, game: morrisGame(), drivers: fake(seed), options: { seed } })),
];

describe("nine men's morris: the standing checks", () => {
	it.each(RUNS)("$name: the log replays equal", async ({ game, drivers, options }) => {
		expect(await checkReplay(game, drivers, options)).toEqual([]);
	});

	it.each(RUNS.slice(0, 3))("$name: resumed from its boundaries (every one up to 12 ticks, the eight of sampleBoundaries beyond), the log is the straight log", async ({ game, drivers, options }) => {
		expect(await checkResumeEveryBoundary(game, drivers, options)).toEqual([]);
	}, 120_000);

	it("the fake run of the game file, seed 7: resumed from the sampled boundaries, the log is the straight log", async () => {
		expect(await checkResumeEveryBoundary(morrisGame(), fake(7), { seed: 7 })).toEqual([]);
	}, 120_000);
});
