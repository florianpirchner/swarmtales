// SPDX-License-Identifier: Apache-2.0
/**
 * The metrics of the `hint-towers` mechanic: the numbers it exports about a finished run, each computed from its own
 * events. The definitions are those of the old runs index of Harbor Lights (`stories/harbor-lights/runs/`): the score
 * per game, the points after the strike penalty, and the misfires summed over the games.
 */
import type { MetricDefinition } from "@swarmtales/contracts";
import { defineMetric } from "@swarmtales/sdk";
import { HintTowersEvents } from "./events.ts";

const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);
const mean = (values: readonly number[]): number | undefined => (values.length === 0 ? undefined : sum(values) / values.length);

/**
 * The metrics of the hint towers, for the `metrics` of its head.
 *
 * @returns `score` (the points of a game after the strike penalty, the mean over the scored games: with one game
 * the points of that game) and `misfires` (the misfires of every ended game, summed). Each is absent when the run
 * has no event it reads.
 *
 * @internal
 */
export function hintTowersMetrics(): readonly MetricDefinition[] {
	const events = HintTowersEvents.events;
	return [
		defineMetric(events, { id: "score", title: "Points per game", unit: "points", reads: ["game_scored"], compute: (scored) => mean(scored.map((game) => game.payload.score)) }),
		defineMetric(events, { id: "misfires", title: "Misfires", reads: ["game_ended"], compute: (ended) => (ended.length === 0 ? undefined : sum(ended.map((game) => game.payload.misfires))) }),
	];
}
