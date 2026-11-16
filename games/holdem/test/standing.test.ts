// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The standing checks of hold'em, in process (M4 specification 4.3): the log replays equal, and a run resumed from
 * every tick boundary writes the log of the straight run. The scripted runs get both checks on a short match (two
 * games of three hands, as the old snapshot test played them), and so do the fake runs on the game file (A43: a
 * resume from a snapshot file, whose keys are sorted, writes the straight log). *
 * The fake driver hands control back to the event loop before each activation (decision A112): the runs never wait on
 * a timer or a file, so without it this file held its Vitest worker's event loop for 18 s on three workers, against
 * Vitest's 60 s RPC timeout. The log does not change: the driver's calls and their order are the same.
 */
import { checkReplay, checkResumeEveryBoundary, fakeDriver, type StandingDrivers } from "@swarmtales/testkit";
import { setImmediate as handBack } from "node:timers/promises";
import { describe, expect, it } from "vitest";
import { holdemGame } from "../game.ts";
import { player, rosterGame } from "./support.ts";

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
/** The scripted seats of the carried test on a short match, and the fake driver on the game file, with the seeds of the games list. */
const RUNS = [7, 11].flatMap((seed) => [
	{ name: `scripted, seed ${String(seed)}`, game: rosterGame({ games: 2, hands: 3 }), drivers: (): { resident: typeof player } => ({ resident: player }), options: { seed } },
	{ name: `fake, seed ${String(seed)}`, game: holdemGame(), drivers: fake(seed), options: { seed } },
]);

describe("holdem: the standing checks", () => {
	it.each(RUNS)("$name: the log replays equal", async ({ game, drivers, options }) => {
		expect(await checkReplay(game, drivers, options)).toEqual([]);
	});

	it.each(RUNS)("$name: resumed from every boundary, the log is the straight log", async ({ game, drivers, options }) => {
		expect(await checkResumeEveryBoundary(game, drivers, options)).toEqual([]);
	}, 120_000);
});
