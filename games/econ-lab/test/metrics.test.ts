// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The metrics of the mechanics over the new log of an oracle replay (specification of M2, section 7.3): each equals
 * the number computed by hand from the same oracle file, and a metric without its event is absent, never 0.
 */
import { join } from "node:path";
import { readOracle, timelineOf, type Oracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { arm, metricsOf, replay } from "./support.ts";

const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "econ-lab");

type Row = readonly [file: string, params: Readonly<Record<string, unknown>>, dilemma: number, round1: number, fund: number, tablePoints: number, decisions: number | "absent", missed: number, brainWrites: number | "absent"];

/**
 * Read by hand in each oracle file: `reference.cooperation` and `reference.perRound[0]` of its `block_scored` entry
 * of the dilemma, `reference.cooperation` of the one of the shared fund, the sum of `scores` of its `match_ended`
 * entry, its `decision_made` entries, the sum of `reference.missed` of its `block_scored` entries, and its
 * `brain_written` entries. In the silent file the timer made all 60 decisions, and it writes no `decision_made`.
 */
const HAND: readonly Row[] = [
	["econ-lab-s41.json", {}, 0.05, 0.25, 0.375, 486, 72, 0, 12],
	["econ-lab-s43.json", {}, 0.15, 0.5, 0, 429, 72, 0, 12],
	["econ-lab-s13-probes.json", {}, 0.5, 0.5, 0.5, 530, 72, 0, 12],
	["econ-lab-s13-silent.json", {}, 0, 0, 0, 300, "absent", 12 + 28 + 20, "absent"],
	["econ-lab-nobrain-s41.json", { brain: false }, 1, 1, 0.375, 523, 72, 0, "absent"],
];

// The payloads of the file's `block_scored` entries.
const scoredIn = (oracle: Oracle): readonly unknown[] => oracle.timeline.flatMap((entry) => (entry.k === "event" && entry.type === "block_scored" ? [entry.payload] : []));

describe("the metrics over an oracle replay", () => {
	it.each(HAND)("%s: every metric equals the number read by hand in the file", async (file, params, dilemma, round1, fund, tablePoints, decisions, missed, brainWrites) => {
		const oracle = readOracle(join(ORACLES, file));
		const game = arm(params);
		const events = await replay(oracle, game);
		// The replay is the run of the file: its timeline is the file's.
		expect(timelineOf(events)).toEqual(oracle.timeline);
		expect(scoredIn(oracle)).toMatchObject([{ game: "ultimatum" }, { game: "public-goods", reference: { cooperation: fund } }, { game: "dilemma", reference: { cooperation: dilemma } }]);
		expect(metricsOf(game, events)).toEqual({
			"econ-games.dilemmaCooperation": dilemma,
			"econ-games.dilemmaRound1": round1,
			"econ-games.fundCooperation": fund,
			"econ-games.tablePoints": tablePoints,
			"econ-games.decisions": decisions,
			"econ-games.missedDecisions": missed,
			"strategy-brain.brainWrites": brainWrites,
		});
	});

	it("reads absent, not 0, for every metric of a run without its event", async () => {
		const game = arm();
		const oracle = readOracle(join(ORACLES, "econ-lab-s41.json"));
		// The same run stopped before its first tick: nothing was decided, scored or written.
		const events = await replay({ ...oracle, truncated: { afterMinute: -1, reason: "no tick" } }, game);
		expect(events.length).toBeGreaterThan(0);
		expect(Object.values(metricsOf(game, events))).toEqual(new Array(7).fill("absent"));
	});
});
