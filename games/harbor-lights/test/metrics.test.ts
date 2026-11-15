// SPDX-License-Identifier: Apache-2.0
/**
 * The metrics of `hint-towers` over the new log of an oracle replay (M4 specification, issue 31): each equals the
 * number computed by hand from the same oracle file, and a metric without its event is absent, never 0.
 */
import { join } from "node:path";
import { metricsOf, playOracle, readOracle, timelineOf, type Oracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { arm, VARIANTS } from "./support.ts";

const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "harbor-lights");

type Row = readonly [file: string, scores: readonly number[], misfires: readonly number[]];

/**
 * Read by hand in each oracle file: `score` of its `game_scored` entries and `misfires` of its `game_ended` entries,
 * game by game. The cut file holds two of its three games; in the silent file the move timer ended the match as
 * invalid before a game ended, so it has neither.
 */
const HAND: readonly Row[] = [
	["harbor-lights-g1-s103.json", [17], [3]],
	["harbor-lights-g1-s110.json", [24], [1]],
	["harbor-lights-solo-g1-s111.json", [24], [1]],
	["harbor-lights-nobrain-g1-s103.json", [22], [2]],
	["harbor-lights-nobrain-aid-g1-s103.json", [17], [3]],
	["harbor-lights-nobrain-s37.json", [15, 20], [3, 2]],
	["harbor-lights-hard-strikes-s13.json", [3, 0, 0], [3, 3, 3]],
	["harbor-lights-s13-silent.json", [], []],
];

// One number field of the file's events of one type, in file order.
const numbersIn = (oracle: Oracle, type: string, key: string): readonly number[] => oracle.timeline.flatMap((entry) => (entry.k === "event" && entry.type === type ? [Number(Reflect.get(Object(entry.payload), key))] : []));
const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);

describe("the metrics of hint-towers over an oracle replay", () => {
	it.each(HAND)("%s: every metric equals the number read by hand in the file", async (file, scores, misfires) => {
		const oracle = readOracle(join(ORACLES, file));
		const game = arm(VARIANTS[oracle.variant]);
		const { events } = await playOracle(oracle, game);
		// The replay is the run of the file: its timeline is the file's (the cut file up to its cut).
		expect(timelineOf(events).slice(0, oracle.timeline.length)).toEqual(oracle.timeline);
		expect([numbersIn(oracle, "game_scored", "score"), numbersIn(oracle, "game_ended", "misfires")]).toEqual([scores, misfires]);
		expect(metricsOf(game, "hint-towers", events)).toEqual({
			score: scores.length === 0 ? "absent" : sum(scores) / scores.length,
			misfires: misfires.length === 0 ? "absent" : sum(misfires),
		});
	});

	it("reads absent, not 0, for every metric of a run without its event", async () => {
		const game = arm({ games: 1 });
		const oracle = readOracle(join(ORACLES, "harbor-lights-g1-s103.json"));
		// The same run stopped before its first tick: no game was played.
		const { events } = await playOracle({ ...oracle, truncated: { afterMinute: -1, reason: "no tick" } }, game);
		expect(events.length).toBeGreaterThan(0);
		expect(metricsOf(game, "hint-towers", events)).toEqual({ score: "absent", misfires: "absent" });
	});
});
