// SPDX-License-Identifier: Apache-2.0
/**
 * The standing checks of tic-tac-toe teams, in process (M4 specification 4.3): the log replays equal, and a run resumed from
 * every tick boundary writes the log of the straight run. The scripted runs get both checks, the fake runs the
 * replay: their resume from every boundary is proven through the command line over the games list
 * (`apps/cli/test/standing.test.ts`).
 */
import { checkReplay, checkResumeEveryBoundary, fakeDriver, type StandingDrivers } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import game from "../game.ts";
import { goldenGame, ticTacToePlayer } from "./support.ts";

const fake = (seed: number): StandingDrivers => (kernel) => ({ resident: fakeDriver(kernel, seed) });
/** The scripted match of the golden test with the brain, and the fake driver on the game file, with the seeds of the games list. */
const RUNS = [
	{ name: "scripted", game: goldenGame({ brain: true }), drivers: (): { resident: ReturnType<typeof ticTacToePlayer> } => ({ resident: ticTacToePlayer() }), options: {} },
	...[7, 11].map((seed) => ({ name: `fake, seed ${String(seed)}`, game, drivers: fake(seed), options: { seed } })),
];

/**
 * Open, found by this check: a snapshot taken while both teams have a retro window open (boundary 0, "Before game 1")
 * does not resume equal from a snapshot file. `strategy-brain` saves its windows as an object and a snapshot file
 * sorts the keys, so the windows come back in the order O, X and the two `resetCap` calls of the next tick swap.
 * The fix belongs to `mechanics/strategy-brain` (save the order of the windows); this line goes with it.
 */
const OPEN = ["resume from boundary 0"];

describe("tic-tac-toe teams: the standing checks", () => {
	it.each(RUNS)("$name: the log replays equal", async ({ game, drivers, options }) => {
		expect(await checkReplay(game, drivers, options)).toEqual([]);
	});

	it.each(RUNS.filter((run) => run.name.startsWith("scripted")))("$name: resumed from every boundary but the open one, the log is the straight log", async ({ game, drivers, options }) => {
		const problems = await checkResumeEveryBoundary(game, drivers, options);
		expect(problems.map((problem) => problem.split(":")[0])).toEqual(OPEN);
		expect(problems[0]).toContain('"method":"resetCap","caller":"strategy-brain"');
	});
});
