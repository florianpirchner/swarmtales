// SPDX-License-Identifier: Apache-2.0
/**
 * The standing checks of chess, in process (M4 specification 4.3): the log replays equal, and a run resumed from
 * every tick boundary writes the log of the straight run. The scripted runs get both checks on a match of one game
 * (the game file plays two), plain and with a fresh context per move; the fake runs the replay: their resume from
 * the sampled boundaries is proven through the command line over the games list (`apps/cli/test/standing.test.ts`).
 * The team variant, which the games list does not play, gets both checks here on a fake run of one game with the
 * lists, the threats and the coach, and the control arm without a brain gets the replay.
 */
import { checkReplay, checkResumeEveryBoundary, fakeDriver, type StandingDrivers } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import game, { chessGame } from "../game.ts";
import { player } from "./support.ts";

const fake = (seed: number): StandingDrivers => (kernel) => ({ resident: fakeDriver(kernel, seed) });
const scripted = (): { resident: typeof player } => ({ resident: player });
/** The scripted seats on one game and the fake driver on the game file, with the seeds of the games list. */
const RUNS = [13, 29].flatMap((seed) => [
	{ name: `scripted, seed ${String(seed)}`, game: chessGame({ games: 1 }), drivers: scripted, options: { seed } },
	{ name: `scripted fresh compact, seed ${String(seed)}`, game: chessGame({ games: 1, fresh: true, compact: true }), drivers: scripted, options: { seed } },
	{ name: `fake, seed ${String(seed)}`, game, drivers: fake(seed), options: { seed } },
]);
const TEAMS = { name: "fake teams, seed 13", game: chessGame({ games: 1, maxPlies: 40, teams: true, showLegalMoves: true, showThreats: true, coach: true }), drivers: fake(13), options: { seed: 13 } };
const NO_BRAIN = { name: "fake no brain, seed 13", game: chessGame({ games: 1, maxPlies: 40, brain: false }), drivers: fake(13), options: { seed: 13 } };

describe("chess: the standing checks", () => {
	it.each([...RUNS, TEAMS, NO_BRAIN])("$name: the log replays equal", async ({ game, drivers, options }) => {
		expect(await checkReplay(game, drivers, options)).toEqual([]);
	});

	it.each([...RUNS.filter((run) => run.name.startsWith("scripted")), TEAMS])("$name: resumed from every boundary, the log is the straight log", async ({ game, drivers, options }) => {
		expect(await checkResumeEveryBoundary(game, drivers, options)).toEqual([]);
	});
});
