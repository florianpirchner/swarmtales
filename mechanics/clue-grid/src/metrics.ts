// SPDX-License-Identifier: Apache-2.0
/**
 * The metrics of the `clue-grid` mechanic: the numbers it exports about a finished run, each computed from its own
 * events. The definitions are those of the old Lanterns runs (`stories/lanterns/runs/lanterns-06a-006-more-seeds/`):
 * recall and precision of the reference of `clue_game_scored`, per team and game, then averaged.
 */
import type { MetricDefinition } from "@swarmtales/contracts";
import { defineMetric, type MetricEvent } from "@swarmtales/sdk";
import type { ClueGridEvents } from "./head.ts";

type Scored = MetricEvent<ClueGridEvents, "clue_game_scored">;
type Measure = "recall" | "precision";

/** The first game whose recall counts as later: from the second game on, after the first retro. */
const LATER_FROM = 2;

// The mean of one measure over every team of every scored game; undefined when no game was scored.
function averaged(scored: readonly Scored[], measure: Measure): number | undefined {
	const values = scored.flatMap(({ payload }) => [payload.reference.amber[measure], payload.reference.teal[measure]]);
	return values.length === 0 ? undefined : values.reduce((total, value) => total + value, 0) / values.length;
}

/**
 * The metrics of the clue grid, for the `metrics` of its head.
 *
 * @param events - The event schemas of the head.
 * @returns `recall` (the keeper's targets the seekers found over the clue numbers), `precision` (the guesses that hit
 * an own word over the guesses), each per team and game and averaged over the scored games, and `recallLater` (the
 * recall of the games from the second on). Each is absent when the run has no scored game it reads.
 *
 * @internal
 */
export function clueGridMetrics(events: ClueGridEvents): readonly MetricDefinition[] {
	return [
		defineMetric(events, { id: "recall", title: "Recall per team and game", reads: ["clue_game_scored"], compute: (scored) => averaged(scored, "recall") }),
		defineMetric(events, { id: "precision", title: "Precision per team and game", reads: ["clue_game_scored"], compute: (scored) => averaged(scored, "precision") }),
		defineMetric(events, { id: "recallLater", title: "Recall per team and game, from game 2 on", reads: ["clue_game_scored"], compute: (scored) => averaged(scored.filter(({ payload }) => payload.game >= LATER_FROM), "recall") }),
	];
}
