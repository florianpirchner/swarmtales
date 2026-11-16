// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The standing checks of the City, in process (M4 specification 4.3): the log replays equal, and a run resumed from
 * every tick boundary writes the log of the straight run, for fake runs at the seeds of the games list, on a run of
 * twelve minutes (the doors of Act I). The gamemaker's look is the fake driver too, and the Confessor and the judge act
 * on their fallback (`fake.ts`). The command line proves the same over the games list (`apps/cli/test/standing.test.ts`).
 */
import { checkReplay, checkResumeEveryBoundary } from "@swarmtales/testkit";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { cityGame, CityParams } from "../game.ts";
import { fakeRun, RECORDS } from "./fake.ts";

const RUNS = [7, 11].map((seed) => {
	const game = cityGame(Value.Parse(CityParams, Value.Default(CityParams, { minutes: 12 })));
	return { name: `fake, seed ${String(seed)}`, game, drivers: fakeRun(game, seed).drivers, options: { seed, records: RECORDS } };
});

describe("city: the standing checks", () => {
	it.each(RUNS)("$name: the log replays equal", async ({ game, drivers, options }) => {
		expect(await checkReplay(game, drivers, options)).toEqual([]);
	}, 120_000);

	it.each(RUNS)("$name: resumed from every boundary, the log is the straight log", async ({ game, drivers, options }) => {
		expect(await checkResumeEveryBoundary(game, drivers, options)).toEqual([]);
	}, 300_000);
});
