// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The metrics of the `liars-dice` mechanic: the numbers it exports about a finished run, each computed from its own
 * events. The definitions are those of the old runs of liar's dice (`stories/liars-dice/runs/` on `legacy`, P280 to
 * P282 and P420 to P424): the rounds, the bids under 0.5 from the bidder's own dice, the liar calls the caller lost,
 * the bids with a public remark, and the agreement with the own-dice baseline.
 */
import type { MetricDefinition } from "@swarmtales/contracts";
import { defineMetric } from "@swarmtales/sdk";
import type { LiarsDiceEvents } from "./head.ts";

// The share of the items that pass, or undefined (absent) when there is none.
const share = <T>(items: readonly T[], passes: (item: T) => boolean): number | undefined => (items.length === 0 ? undefined : items.filter(passes).length / items.length);

/**
 * The metrics of liar's dice, for the `metrics` of its head.
 *
 * @param events - The event schemas of the head.
 * @returns `rounds` (the rounds played: each ends with a liar call), `bluffShare` (the scored bids that the bidder's
 * own dice make less likely true than not, over the scored bids), `callsLost` (the liar calls that cost the caller a
 * die, over the calls), `remarkShare` (the bids a seat made with a public remark, over the bids it made: a bid of the
 * deadline is left out), `agreement` (the decisions of the baseline's kind, over the scored decisions) and `missed`
 * (the decisions the deadline made). Each is absent when the run has no event it counts.
 *
 * @internal
 */
export function liarsDiceMetrics(events: LiarsDiceEvents): readonly MetricDefinition[] {
	return [
		defineMetric(events, { id: "rounds", title: "Rounds", unit: "rounds", reads: ["dice_called"], compute: (called) => (called.length === 0 ? undefined : called.length) }),
		defineMetric(events, {
			id: "bluffShare",
			title: "Bids under 0.5 from the own dice",
			reads: ["dice_decision_scored"],
			compute: (scored) => share(scored.filter(({ payload }) => payload.kind === "bid"), ({ payload }) => payload.bluff),
		}),
		defineMetric(events, { id: "callsLost", title: "Liar calls lost by the caller", reads: ["dice_called"], compute: (called) => share(called, ({ payload }) => payload.loser === payload.seat) }),
		defineMetric(events, {
			id: "remarkShare",
			title: "Bids with a public remark",
			reads: ["dice_bid"],
			compute: (bids) => share(bids.filter(({ payload }) => payload.missed !== true), ({ payload }) => payload.say !== undefined),
		}),
		defineMetric(events, { id: "agreement", title: "Decisions of the baseline's kind", reads: ["dice_decision_scored"], compute: (scored) => share(scored, ({ payload }) => payload.agree) }),
		defineMetric(events, {
			id: "missed",
			title: "Decisions missed",
			unit: "decisions",
			reads: ["dice_decision_scored"],
			compute: (scored) => (scored.length === 0 ? undefined : scored.filter(({ payload }) => payload.missed).length),
		}),
	];
}
