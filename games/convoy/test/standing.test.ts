// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The standing checks of Convoy, in process (M4 specification 4.3): the log replays equal, and a run resumed from
 * every tick boundary writes the log of the straight run. A match of more than one game is checked on a variant with
 * two games, as the old snapshot test played it (a cut inside a game and inside the retro window between them); the
 * scripted and the fake runs get both checks (A43: `convoy` loads its snapshot in schema order).
 */
import { checkReplay, checkResumeEveryBoundary, fakeDriver, type StandingDrivers } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { convoyGame } from "../game.ts";
import { player, rosterGame } from "./support.ts";

const fake = (seed: number): StandingDrivers => (kernel) => ({ resident: fakeDriver(kernel, seed) });
const scripted = (): { resident: typeof player } => ({ resident: player });
/** The scripted seats of the carried test and the fake driver, each on two games, with the seeds of the games list. */
const RUNS = [53, 13].flatMap((seed) => [
	{ name: `scripted, seed ${String(seed)}`, game: rosterGame({ games: 2 }), drivers: scripted, options: { seed } },
	{ name: `fake, seed ${String(seed)}`, game: convoyGame({ games: 2 }), drivers: fake(seed), options: { seed } },
]);

describe("convoy: the standing checks", () => {
	it.each(RUNS)("$name: the log replays equal", async ({ game, drivers, options }) => {
		expect(await checkReplay(game, drivers, options)).toEqual([]);
	});

	it.each(RUNS)("$name: resumed from every boundary, the log is the straight log", async ({ game, drivers, options }) => {
		expect(await checkResumeEveryBoundary(game, drivers, options)).toEqual([]);
	});
});
