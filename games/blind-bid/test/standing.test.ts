// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The standing checks of Blind Bid, in process (M4 specification 4.3): the log replays equal, and a run resumed from
 * every tick boundary writes the log of the straight run, on the scripted bidders (with their brains) and on the
 * fake driver, with the seeds of the games list.
 */
import { checkReplay, checkResumeEveryBoundary, fakeDriver, type StandingDrivers } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { blindBidGame } from "../game.ts";
import { player, rosterGame } from "./support.ts";

const fake = (seed: number): StandingDrivers => (kernel) => ({ resident: fakeDriver(kernel, seed) });
const RUNS = [7, 11].flatMap((seed) => [
	{ name: `scripted, seed ${String(seed)}`, game: rosterGame(), drivers: (): { resident: typeof player } => ({ resident: player }), options: { seed } },
	{ name: `fake, seed ${String(seed)}`, game: blindBidGame(), drivers: fake(seed), options: { seed } },
]);

describe("blind-bid: the standing checks", () => {
	it.each(RUNS)("$name: the log replays equal", async ({ game, drivers, options }) => {
		expect(await checkReplay(game, drivers, options)).toEqual([]);
	});

	it.each(RUNS)("$name: resumed from every boundary, the log is the straight log", async ({ game, drivers, options }) => {
		expect(await checkResumeEveryBoundary(game, drivers, options)).toEqual([]);
	});
});
