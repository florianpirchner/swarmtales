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

describe("tic-tac-toe teams: the standing checks", () => {
	it.each(RUNS)("$name: the log replays equal", async ({ game, drivers, options }) => {
		expect(await checkReplay(game, drivers, options)).toEqual([]);
	});

	// Boundary 0 holds both teams' retro windows; a snapshot file gives them back in key order, and the brain walks them
	// in the order of its option `teams`, so the resumed `resetCap` calls keep the straight order (A43).
	it.each(RUNS.filter((run) => run.name.startsWith("scripted")))("$name: resumed from every boundary, the log is the straight log", async ({ game, drivers, options }) => {
		expect(await checkResumeEveryBoundary(game, drivers, options)).toEqual([]);
	});
});
