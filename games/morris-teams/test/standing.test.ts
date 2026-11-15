// SPDX-License-Identifier: Apache-2.0
/**
 * The standing checks of nine men's morris, in process (M4 specification 4.3): the log replays equal, and a run
 * resumed from every tick boundary writes the log of the straight run. The scripted runs (one game of at most 30
 * turns, two teams and one resident against the search) and a fake run of one game get both checks; the fake runs on
 * the game file get the replay (their resume from the sampled boundaries is proven through the command line over the
 * games list, `apps/cli/test/standing.test.ts`).
 */
import { checkReplay, checkResumeEveryBoundary, fakeDriver, type StandingDrivers } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import game, { morrisGame } from "../game.ts";
import { morrisPlayer } from "./support.ts";

const fake = (seed: number): StandingDrivers => (kernel) => ({ resident: fakeDriver(kernel, seed) });
const scripted = (): { resident: typeof morrisPlayer } => ({ resident: morrisPlayer });
/** The open boundaries of a run: none against the search, where only one team keeps a brain. */
const RUNS = [
	{ name: "scripted teams", game: morrisGame({ games: 1, maxTurns: 30, refereeDepth: 2 }), drivers: scripted, options: {}, open: ["resume from boundary 0"] },
	{ name: "scripted against the search", game: morrisGame({ games: 1, maxTurns: 30, refereeDepth: 2, teamSize: 1, engineDepth: 2 }), drivers: scripted, options: {}, open: [] },
	// A match of one game: every boundary of the game file's three games would take the fake run more than a minute.
	{ name: "fake, one game, seed 13", game: morrisGame({ games: 1 }), drivers: fake(13), options: { seed: 13 }, open: ["resume from boundary 0"] },
	...[13, 31].map((seed) => ({ name: `fake, seed ${String(seed)}`, game, drivers: fake(seed), options: { seed }, open: [] })),
];

/**
 * Open, the fault pinned in `games/tictactoe-teams/test/standing.test.ts`: a snapshot taken while both teams have a
 * retro window open (boundary 0, "Before game 1") does not resume equal from a snapshot file. `strategy-brain` saves
 * its windows as an object, a snapshot file sorts the keys, so the windows come back in the order O, X and the two
 * `resetCap` calls of the next tick swap. The fix belongs to `mechanics/strategy-brain`; the `open` lists go with it.
 */
describe("nine men's morris: the standing checks", () => {
	it.each(RUNS)("$name: the log replays equal", async ({ game, drivers, options }) => {
		expect(await checkReplay(game, drivers, options)).toEqual([]);
	});

	it.each(RUNS.slice(0, 3))("$name: resumed from every boundary but the open one, the log is the straight log", async ({ game, drivers, options, open }) => {
		const problems = await checkResumeEveryBoundary(game, drivers, options);
		expect(problems.map((problem) => problem.split(":")[0])).toEqual(open);
		for (const problem of problems) expect(problem).toContain('"method":"resetCap","caller":"strategy-brain"');
	}, 120_000);
});
