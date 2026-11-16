// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The metrics of the `econ-lab` mechanic: the numbers it exports about a finished run, each computed from its own
 * events. The definitions are those of the noise floor of the old platform (`scripts/noise-floor-stats.ts`,
 * `ECON_LAB`), so the numbers of both platforms are computed the same way.
 */
import type { MetricDefinition } from "@swarmtales/contracts";
import { defineMetric, type MetricEvent } from "@swarmtales/sdk";
import type { EconGamesEvents } from "./head.ts";

type Scored = MetricEvent<EconGamesEvents, "block_scored">;

const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);

// The reference of the one scored block of a game; undefined when the run has none or more than one.
function only(scored: readonly Scored[], game: Scored["payload"]["game"]): Scored["payload"]["reference"] | undefined {
	const found = scored.filter((block) => block.payload.game === game);
	return found.length === 1 ? found[0]?.payload.reference : undefined;
}

/**
 * The metrics of the econ games, for the `metrics` of its head.
 *
 * @param events - The event schemas of the head.
 * @returns `dilemmaCooperation` and `dilemmaRound1` (the cooperation of the one scored dilemma block, over the block
 * and in its first round), `fundCooperation` (the same of the one public-goods block), `tablePoints` (the sum of the
 * scores of the one `match_ended`), `decisions` (every decision, also one the timer made) and `missedDecisions`
 * (the decisions the timer made, summed over the scored blocks). Each is absent when the run has no event it reads,
 * or more than one where it reads "the one".
 *
 * @internal
 */
export function econGamesMetrics(events: EconGamesEvents): readonly MetricDefinition[] {
	return [
		defineMetric(events, { id: "dilemmaCooperation", title: "Cooperation in the dilemma", reads: ["block_scored"], compute: (scored) => only(scored, "dilemma")?.cooperation }),
		defineMetric(events, { id: "dilemmaRound1", title: "Cooperation in round 1 of the dilemma", reads: ["block_scored"], compute: (scored) => only(scored, "dilemma")?.perRound[0] }),
		defineMetric(events, { id: "fundCooperation", title: "Cooperation in the shared fund", reads: ["block_scored"], compute: (scored) => only(scored, "public-goods")?.cooperation }),
		defineMetric(events, { id: "tablePoints", title: "Points of the table", unit: "points", reads: ["match_ended"], compute: (ended) => (ended.length === 1 ? sum(ended.flatMap((match) => Object.values(match.payload.scores))) : undefined) }),
		defineMetric(events, { id: "decisions", title: "Decisions", reads: ["decision_made"], compute: (made) => (made.length === 0 ? undefined : made.length) }),
		defineMetric(events, { id: "missedDecisions", title: "Decisions not made in time", reads: ["block_scored"], compute: (scored) => (scored.length === 0 ? undefined : sum(scored.map((block) => block.payload.reference.missed))) }),
	];
}
