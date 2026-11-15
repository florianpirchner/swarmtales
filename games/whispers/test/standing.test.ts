// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The standing checks of Whispers, in process (M4 specification 4.3): the log replays equal, and a run resumed from
 * every tick boundary writes the log of the straight run, for fake runs of both variants at the seeds of the games
 * list, on a run of twelve minutes (the first three doors). The command line proves the same over the games list
 * (`apps/cli/test/standing.test.ts`).
 */
import { DIRECTOR_KIND, DIRECTOR_TAKE } from "@swarmtales/sdk";
import { checkReplay, checkResumeEveryBoundary, fakeDriver, scriptedDriver, type StandingDrivers } from "@swarmtales/testkit";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { whispersGame, WhispersParams } from "../game.ts";

// Fake residents; each Director takes its firings and stays quiet (the fake run with the Directors' tools is M5-39's).
const quiet = scriptedDriver(() => [{ tool: DIRECTOR_TAKE, params: {} }]);
const fake = (seed: number): StandingDrivers => (kernel) => ({ resident: fakeDriver(kernel, seed), [DIRECTOR_KIND]: quiet });
const RUNS = [7, 11].flatMap((seed) => [true, false].map((receipts) => ({ name: `fake, receipts ${String(receipts)}, seed ${String(seed)}`, game: whispersGame(Value.Parse(WhispersParams, Value.Default(WhispersParams, { receipts, minutes: 12 }))), drivers: fake(seed), options: { seed } })));

describe("whispers: the standing checks", () => {
	it.each(RUNS)("$name: the log replays equal", async ({ game, drivers, options }) => {
		expect(await checkReplay(game, drivers, options)).toEqual([]);
	}, 120_000);

	it.each(RUNS)("$name: resumed from every boundary, the log is the straight log", async ({ game, drivers, options }) => {
		expect(await checkResumeEveryBoundary(game, drivers, options)).toEqual([]);
	}, 300_000);
});
