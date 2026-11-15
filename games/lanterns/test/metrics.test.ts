// SPDX-License-Identifier: Apache-2.0
/**
 * The metrics of `clue-grid` over the new log of an oracle replay (M4 specification, issue 31): each equals the
 * number computed by hand from the same oracle file, and a metric without its event is absent, never 0.
 */
import { join } from "node:path";
import { metricsOf, playOracle, readOracle, timelineOf, type Oracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { arm } from "./support.ts";

const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "lanterns");

/** One team in one game: `[game, recall, precision]`. */
type Team = readonly [game: number, recall: number, precision: number];
type Row = readonly [file: string, params: Readonly<Record<string, unknown>>, teams: readonly Team[]];

/**
 * Read by hand in each oracle file: `reference.amber` and `reference.teal` of its `clue_game_scored` entries, game by
 * game. The three live files are cut after two or three games; in the silent file no clue was given, and the old
 * reference counts a team without clues as recall 0 and precision 0.
 */
const HAND: readonly Row[] = [
	["lanterns-s73.json", {}, [[1, 1, 1], [1, 0.667, 0.8], [2, 0.5, 0.667], [2, 1, 1]]],
	["lanterns-s107.json", {}, [[1, 0.143, 0.4], [1, 1, 1], [2, 1, 1], [2, 0.833, 0.833]]],
	["lanterns-nobrain-s67.json", { brain: false }, [[1, 0.8, 0.8], [1, 1, 1], [2, 1, 1], [2, 0.8, 0.8], [3, 1, 1], [3, 1, 1]]],
	["lanterns-g1-s13-silent.json", { games: 1 }, [[1, 0, 0], [1, 0, 0]]],
];

// The payloads of the file's `clue_game_scored` entries, in file order.
const scoredIn = (oracle: Oracle): readonly unknown[] => oracle.timeline.flatMap((entry) => (entry.k === "event" && entry.type === "clue_game_scored" ? [entry.payload] : []));
// The teams of a row as those payloads hold them: two teams a game, amber first.
const asScored = (teams: readonly Team[]): readonly unknown[] =>
	teams.flatMap(([game, recall, precision], index) => (index % 2 === 0 ? [{ game, reference: { amber: { recall, precision }, teal: { recall: teams[index + 1]?.[1], precision: teams[index + 1]?.[2] } } }] : []));
const mean = (values: readonly number[]): number | "absent" => (values.length === 0 ? "absent" : values.reduce((total, value) => total + value, 0) / values.length);

// The metrics as numbers rounded to twelve places, so that the order of the sum does not matter.
const rounded = (metrics: Readonly<Record<string, number | "absent">>): Readonly<Record<string, number | "absent">> =>
	Object.fromEntries(Object.entries(metrics).map(([id, value]) => [id, value === "absent" ? value : Math.round(value * 1e12) / 1e12]));

describe("the metrics of clue-grid over an oracle replay", () => {
	it.each(HAND)("%s: every metric equals the number read by hand in the file", async (file, params, teams) => {
		const oracle = readOracle(join(ORACLES, file));
		const game = arm(params);
		const { events } = await playOracle(oracle, game);
		// The replay is the run of the file: its timeline is the file's (a cut file up to its cut).
		expect(timelineOf(events).slice(0, oracle.timeline.length)).toEqual(oracle.timeline);
		expect(scoredIn(oracle)).toMatchObject(asScored(teams));
		const later = teams.filter(([number]) => number >= 2);
		expect(rounded(metricsOf(game, "clue-grid", events))).toEqual(
			rounded({ recall: mean(teams.map((team) => team[1])), precision: mean(teams.map((team) => team[2])), recallLater: mean(later.map((team) => team[1])) }),
		);
	});

	it("reads absent, not 0, for every metric of a run without its event", async () => {
		const game = arm();
		const oracle = readOracle(join(ORACLES, "lanterns-s73.json"));
		// The same run stopped before its first tick: no game was scored.
		const { events } = await playOracle({ ...oracle, truncated: { afterMinute: -1, reason: "no tick" } }, game);
		expect(events.length).toBeGreaterThan(0);
		expect(metricsOf(game, "clue-grid", events)).toEqual({ recall: "absent", precision: "absent", recallLater: "absent" });
	});
});
