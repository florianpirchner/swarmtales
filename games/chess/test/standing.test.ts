// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The standing checks of chess, in process (M4 specification 4.3): the log replays equal, and a run resumed from
 * every tick boundary writes the log of the straight run. The scripted runs get both checks on a match of one game
 * (the game file plays two), plain and with a fresh context per move, and the fake runs on the game file get both
 * checks too (A43: a resume from a snapshot file, whose keys are sorted, writes the straight log). The team variant, which the games list does not play, gets both checks here on a fake run of one game with the
 * lists, the threats and the coach, and the control arm without a brain gets the replay. *
 * The fake driver hands control back to the event loop before each activation (decision A112): the runs never wait on
 * a timer or a file, so without it this file held its Vitest worker's event loop for 24 s on three workers, against
 * Vitest's 60 s RPC timeout. The log does not change: the driver's calls and their order are the same.
 */
import { checkReplay, checkResumeEveryBoundary, fakeDriver, type StandingDrivers } from "@swarmtales/testkit";
import { setImmediate as handBack } from "node:timers/promises";
import { describe, expect, it } from "vitest";
import { chessGame } from "../game.ts";
import { player } from "./support.ts";

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
const scripted = (): { resident: typeof player } => ({ resident: player });
/** The scripted seats on one game and the fake driver on the game file, with the seeds of the games list. */
const RUNS = [13, 29].flatMap((seed) => [
	{ name: `scripted, seed ${String(seed)}`, game: chessGame({ games: 1 }), drivers: scripted, options: { seed } },
	{ name: `scripted fresh compact, seed ${String(seed)}`, game: chessGame({ games: 1, fresh: true, compact: true }), drivers: scripted, options: { seed } },
	{ name: `fake, seed ${String(seed)}`, game: chessGame(), drivers: fake(seed), options: { seed } },
]);
const TEAMS = { name: "fake teams, seed 13", game: chessGame({ games: 1, maxPlies: 40, teams: true, showLegalMoves: true, showThreats: true, coach: true }), drivers: fake(13), options: { seed: 13 } };
const NO_BRAIN = { name: "fake no brain, seed 13", game: chessGame({ games: 1, maxPlies: 40, brain: false }), drivers: fake(13), options: { seed: 13 } };

describe("chess: the standing checks", () => {
	it.each([...RUNS, TEAMS, NO_BRAIN])("$name: the log replays equal", async ({ game, drivers, options }) => {
		expect(await checkReplay(game, drivers, options)).toEqual([]);
	});

	it.each([...RUNS, TEAMS])("$name: resumed from every boundary, the log is the straight log", async ({ game, drivers, options }) => {
		expect(await checkResumeEveryBoundary(game, drivers, options)).toEqual([]);
	}, 120_000);
});
