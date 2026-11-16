// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The standing checks of the City, in process (M4 specification 4.3; issue M5-48): the log replays equal, and a run
 * resumed from its tick boundaries (every one of a run of up to 12 ticks, the eight of `sampleBoundaries` of a longer
 * run) writes the log of the straight run, for fake runs at the seeds of the games list: the default dials on a run of
 * twelve minutes (the doors of Act I), a variant of twelve minutes with the other dials (a named cast at figure
 * direction 6, the gamemaker at 10, every resident woken in two passes, no Confessor), and the whole Act I of seed 11,
 * which ends in tick 27 with the start of Act II in the same tick (at seed 7 Act I ends in tick 14). A run longer than
 * 12 ticks (the Act I run, the default dials at seed 11) is resumed from the eight boundaries of `sampleBoundaries`
 * (M5-92: every one of the Act I run took 26 s, the eight take 8 s). The gamemaker's look is the fake driver too, and
 * the Confessor and the judge act on their fallback (`fake.ts`). The command line proves the same over the games list
 * (`apps/cli/test/standing.test.ts`).
 */
import type { Envelope } from "@swarmtales/contracts";
import { checkReplay, checkResumeEveryBoundary, play } from "@swarmtales/testkit";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { cityGame, CityParams } from "../game.ts";
import { fakeRun, RECORDS } from "./fake.ts";

const VARIANT = { cast: ["auditor", "banner", "believer", "broker", "candle", "clerk"], figureDirection: 6, gmDirection: 10, activation: "always", passesPerMinute: 2, classifier: false };

/** The last tick of Act I in the fake run of seed 11 at the default dials. */
const ACT_ONE = 27;

const runOf = (name: string, seed: number, overrides: Readonly<Record<string, unknown>>) => {
	const game = cityGame(Value.Parse(CityParams, Value.Default(CityParams, { ...overrides })));
	return { name: `${name}, seed ${String(seed)}`, game, drivers: fakeRun(game, seed).drivers, options: { seed, records: RECORDS } };
};

const RUNS = [
	...[7, 11].map((seed) => runOf("fake", seed, { minutes: 12 })),
	...[7, 11].map((seed) => runOf("fake variant", seed, { ...VARIANT, minutes: 12 })),
	runOf("fake Act I", 11, { minutes: ACT_ONE + 1 }),
];

const fromLevel = (payload: unknown): unknown => (typeof payload === "object" && payload !== null ? Reflect.get(payload, "fromLevel") : undefined);
const acts = (events: readonly Envelope[]): readonly unknown[] => events.filter((event) => event.type === "act_ended" || event.type === "act_started").map((event) => [event.tick, event.type, fromLevel(event.payload)]);

describe("city: the standing checks", () => {
	it("the Act I run plays the whole act: it ends, and Act II starts, in its last tick", async () => {
		const [run] = RUNS.slice(-1);
		if (run === undefined) throw new TypeError("no Act I run");
		const { events } = await play(run.game, { ...run.options, ...fakeRun(run.game, run.options.seed) });
		expect(acts(events)).toEqual([[0, "act_started", 1], [ACT_ONE, "act_ended", 1], [ACT_ONE, "act_started", 8], [ACT_ONE + 1, "act_ended", 8]]);
	}, 120_000);

	it.each(RUNS)("$name: the log replays equal", async ({ game, drivers, options }) => {
		expect(await checkReplay(game, drivers, options)).toEqual([]);
	}, 120_000);

	it.each(RUNS)("$name: resumed from its boundaries (every one up to 12 ticks, the eight of sampleBoundaries beyond), the log is the straight log", async ({ game, drivers, options }) => {
		expect(await checkResumeEveryBoundary(game, drivers, options)).toEqual([]);
	}, 300_000);
});
