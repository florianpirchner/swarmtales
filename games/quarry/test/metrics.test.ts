// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The metrics of the mechanics over the new log of an oracle replay (specification of M2, section 7.3): each equals
 * the number computed by hand from the same oracle file, and a metric without its event is absent, never 0.
 */
import { join } from "node:path";
import { playOracle, readOracle, runOracle, timelineOf, type Oracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { arm, metricsOf, RENAMED, replay } from "./support.ts";

const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "quarry");

type Row = readonly [file: string, params: Readonly<Record<string, unknown>>, tablePoints: number | "absent", sharedLanes: number, decisions: number, missedPicks: number, brainWrites: number | "absent"];

/**
 * Counted by hand in each oracle file: the sum of `scores` of its `draft_match_ended` entry, the sum of
 * `reference.sharedLanes` of its `draft_game_scored` entries, its `draft_card_picked` entries, those with
 * `missed: true`, and its `brain_written` entries. The cut file has two scored games and no end of the match.
 */
const HAND: readonly Row[] = [
	["quarry-s41.json", {}, 232 + 177 + 247 + 256, 0, 144, 0, 12],
	["quarry-s61.json", {}, 962, 6, 144, 0, 12],
	["quarry-s13-silent.json", {}, 622, 4, 144, 144, "absent"],
	["quarry-nobrain-s41.json", { brain: false }, 907, 5, 144, 0, "absent"],
	["quarry-burn-s13-probes.json", { burns: true }, 923, 0, 140, 0, 12],
	["quarry-open-s59.json", { openHands: true }, "absent", 0, 96, 0, 8],
];

// The sum of `scores` in the file's `draft_match_ended` entry; "absent" without the entry.
function pointsIn(oracle: Oracle): number | "absent" {
	const scores = oracle.timeline.flatMap((entry) => (entry.k === "event" && entry.type === "draft_match_ended" && typeof entry.payload === "object" && entry.payload !== null && "scores" in entry.payload ? [entry.payload.scores] : []));
	const [only] = scores;
	return scores.length === 1 && typeof only === "object" && only !== null ? Object.values(only).reduce((sum: number, score) => sum + Number(score), 0) : "absent";
}

describe("the metrics over an oracle replay", () => {
	it.each(HAND)("%s: every metric equals the number counted by hand in the file", async (file, params, tablePoints, sharedLanes, decisions, missedPicks, brainWrites) => {
		const oracle = readOracle(join(ORACLES, file));
		const game = arm(params);
		const events = await replay(oracle, game);
		// The replay is the run of the file: the file plays at level 3 (the cut file up to its cut), and the replay writes its timeline.
		expect(await runOracle(oracle, game, 3, { renamed: RENAMED })).toEqual([]);
		expect(timelineOf(events)).toEqual(timelineOf((await playOracle(oracle, game, { renamed: RENAMED })).events));
		expect(pointsIn(oracle)).toBe(tablePoints);
		expect(metricsOf(game, events)).toEqual({
			"quarry.tablePoints": tablePoints,
			"quarry.sharedLanes": sharedLanes,
			"quarry.decisions": decisions,
			"quarry.missedPicks": missedPicks,
			"strategy-brain.brainWrites": brainWrites,
		});
	});

	it("reads absent, not 0, for every metric of a run without its event", async () => {
		const game = arm();
		const oracle = readOracle(join(ORACLES, "quarry-s41.json"));
		// The same run stopped before its first tick: nothing was picked, scored or written.
		const events = await replay({ ...oracle, truncated: { afterMinute: -1, reason: "no tick" } }, game);
		expect(events.length).toBeGreaterThan(0);
		expect(Object.values(metricsOf(game, events))).toEqual(["absent", "absent", "absent", "absent", "absent"]);
	});
});
