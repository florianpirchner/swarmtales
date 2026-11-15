// SPDX-License-Identifier: Apache-2.0
/**
 * The metrics of the `morris` mechanic: the numbers it exports about a finished run, each computed from its own
 * events. The definitions are those of the old runs of nine men's morris (`stories/morris-teams/runs/` on `legacy`,
 * P101 to P109, P200 to P202, P401 and P402): the tally of the games, the games lost to a blockade, the length of a
 * game and the moves the move timer played. The scores against the search are the Referee's (`move_scored`).
 */
import type { MetricDefinition } from "@swarmtales/contracts";
import { defineMetric } from "@swarmtales/sdk";
import type { MorrisEvents } from "./events.ts";

type Events = typeof MorrisEvents.events;

// The share of the items that pass, or undefined (absent) when there is none.
const share = <T>(items: readonly T[], passes: (item: T) => boolean): number | undefined => (items.length === 0 ? undefined : items.filter(passes).length / items.length);

/**
 * The metrics of nine men's morris, for the `metrics` of its head.
 *
 * @param events - The event schemas of the head.
 * @returns `games` (the games played to their end), `xWinShare` and `drawShare` (the games side X won, the games
 * drawn, over the games; X is the residents' side against the search), `blockedShare` (the games that ended because
 * a side could not move), `turns` (the whole turns of a game, the mean over the games) and `forfeits` (the moves the
 * move timer played for a team). Each is absent when the run has no event it counts.
 *
 * @internal
 */
export function morrisMetrics(events: Events): readonly MetricDefinition[] {
	const reads = ["game_ended"] as const;
	return [
		defineMetric(events, { id: "games", title: "Games played", unit: "games", reads, compute: (ended) => (ended.length === 0 ? undefined : ended.length) }),
		defineMetric(events, { id: "xWinShare", title: "Games won by X", reads, compute: (ended) => share(ended, ({ payload }) => payload.result === "X") }),
		defineMetric(events, { id: "drawShare", title: "Games drawn", reads, compute: (ended) => share(ended, ({ payload }) => payload.result === "draw") }),
		defineMetric(events, { id: "blockedShare", title: "Games ended by a blockade", reads, compute: (ended) => share(ended, ({ payload }) => payload.reason === "blocked") }),
		defineMetric(events, {
			id: "turns",
			title: "Turns per game",
			unit: "turns",
			reads,
			compute: (ended) => (ended.length === 0 ? undefined : ended.reduce((sum, { payload }) => sum + payload.turns, 0) / ended.length),
		}),
		defineMetric(events, {
			id: "forfeits",
			title: "Moves played by the move timer",
			unit: "moves",
			reads: ["move_played"],
			compute: (played) => (played.length === 0 ? undefined : played.filter(({ payload }) => payload.forfeit).length),
		}),
	];
}
