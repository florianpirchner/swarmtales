// SPDX-License-Identifier: Apache-2.0
/**
 * The standing checks of Harbor Lights, in process (M4 specification 4.3): the log replays equal, and a run resumed
 * from every tick boundary writes the log of the straight run. A match of three games is checked on its variant with
 * one game; the scripted runs play the three arms and get both checks, the fake runs the default arm
 * and the replay: their resume is proven through the command line over the games list.
 */
import { checkReplay, checkResumeEveryBoundary, fakeDriver, type StandingDrivers } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { harborLightsGame } from "../game.ts";
import { player } from "./support.ts";

const fake = (seed: number): StandingDrivers => (kernel) => ({ resident: fakeDriver(kernel, seed) });
const scripted = (): { resident: typeof player } => ({ resident: player });
/** The scripted crew member and the fake driver, one game each, with the seeds of the games list. */
const RUNS = [103, 111].flatMap((seed) => [
	{ name: `scripted crew, seed ${String(seed)}`, game: harborLightsGame({ games: 1 }), drivers: scripted, options: { seed } },
	{ name: `scripted solo, seed ${String(seed)}`, game: harborLightsGame({ brain: "solo", games: 1 }), drivers: scripted, options: { seed } },
	{ name: `scripted nobrain, seed ${String(seed)}`, game: harborLightsGame({ brain: "nobrain", games: 1 }), drivers: scripted, options: { seed } },
	{ name: `fake, seed ${String(seed)}`, game: harborLightsGame({ games: 1 }), drivers: fake(seed), options: { seed } },
]);

describe("Harbor Lights: the standing checks", () => {
	it.each(RUNS)("$name: the log replays equal", async ({ game, drivers, options }) => {
		expect(await checkReplay(game, drivers, options)).toEqual([]);
	});

	it.each(RUNS.filter((run) => run.name.startsWith("scripted")))("$name: resumed from every boundary, the log is the straight log", async ({ game, drivers, options }) => {
		expect(await checkResumeEveryBoundary(game, drivers, options)).toEqual([]);
	});
});
