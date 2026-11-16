// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The metrics of the `quarry` mechanic: the numbers it exports about a finished run, each computed from its
 * own events. The definitions are those of the noise floor of the old platform (`scripts/noise-floor-stats.ts`,
 * `QUARRY`), so the numbers of both platforms are computed the same way.
 */
import type { MetricDefinition } from "@swarmtales/contracts";
import { defineMetric } from "@swarmtales/sdk";
import type { DraftRoundsEvents } from "./head.ts";

const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);

/**
 * The metrics of the draft, for the `metrics` of its head.
 *
 * @param events - The event schemas of the head.
 * @returns `tablePoints` (the sum of the scores of the one `draft_match_ended`), `sharedLanes` (the sum of the
 * shared lanes over the scored games), `decisions` (every pick, also one the timer made) and `missedPicks` (the
 * picks the timer made). Each is absent when the run has no event it reads; `tablePoints` also when the match ended
 * more than once.
 *
 * @internal
 */
export function draftRoundsMetrics(events: DraftRoundsEvents): readonly MetricDefinition[] {
	return [
		defineMetric(events, { id: "tablePoints", title: "Points of the table", unit: "points", reads: ["draft_match_ended"], compute: (ended) => (ended.length === 1 ? sum(ended.flatMap((match) => Object.values(match.payload.scores))) : undefined) }),
		defineMetric(events, { id: "sharedLanes", title: "Seats that share a lane, over the games", reads: ["draft_game_scored"], compute: (scored) => (scored.length === 0 ? undefined : sum(scored.map((game) => game.payload.reference.sharedLanes))) }),
		defineMetric(events, { id: "decisions", title: "Picks", reads: ["draft_card_picked"], compute: (picked) => (picked.length === 0 ? undefined : picked.length) }),
		defineMetric(events, { id: "missedPicks", title: "Picks not made in time", reads: ["draft_card_picked"], compute: (picked) => (picked.length === 0 ? undefined : picked.filter((pick) => pick.payload.missed).length) }),
	];
}
