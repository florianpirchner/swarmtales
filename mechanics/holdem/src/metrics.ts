// SPDX-License-Identifier: Apache-2.0
/**
 * The metrics of the `holdem` mechanic: the numbers it exports about a finished run, each computed from its own
 * events. The definitions are those of the old hold'em runs (`stories/holdem/runs/` on `legacy`; the result table of
 * `holdem-04a-006-decision-aid`, P430 and P437): the EV loss per decision against the range baseline, the calls
 * without the pot odds, the folds when facing a bet, VPIP, the agreement with the baseline and the missed decisions.
 */
import type { MetricDefinition } from "@swarmtales/contracts";
import { defineMetric } from "@swarmtales/sdk";
import type { HoldemEvents } from "./head.ts";
import type { Scored } from "./model.ts";

type Move = Scored["done"];

// The kind of a move as the seat statistics compare it with the baseline: fold, check-call, bet-raise.
const kindOf = (done: Move): string => (done === "check" || done === "call" ? "passive" : done === "fold" ? "fold" : "aggressive");
// The share of the items that pass, or undefined (absent) when there is none.
const share = <T>(items: readonly T[], passes: (item: T) => boolean): number | undefined => (items.length === 0 ? undefined : items.filter(passes).length / items.length);
const mean = (values: readonly number[]): number | undefined => (values.length === 0 ? undefined : values.reduce((total, value) => total + value, 0) / values.length);

/**
 * The metrics of hold'em, for the `metrics` of its head.
 *
 * @param events - The event schemas of the head.
 * @returns `evLoss` (the mean one-street EV loss per scored decision), `callsWithoutOdds` (the calls the baseline
 * folds, the equity below the pot odds, over the scored decisions), `foldsFacingBet` (the folds over the decisions
 * with chips to call), `vpip` (the mean of the seats' VPIP of each scored game, over seats and games), `agreement`
 * (the decisions of the baseline's kind, over the scored decisions) and `missed` (the decisions the deadline made).
 * Each is absent when the run has no event it counts.
 *
 * @internal
 */
export function holdemMetrics(events: HoldemEvents): readonly MetricDefinition[] {
	const reads = ["decision_scored"] as const;
	return [
		defineMetric(events, { id: "evLoss", title: "EV loss per decision", unit: "points", reads, compute: (scored) => mean(scored.map(({ payload }) => payload.evLoss)) }),
		defineMetric(events, { id: "callsWithoutOdds", title: "Calls without the pot odds", reads, compute: (scored) => share(scored, ({ payload }) => payload.done === "call" && payload.baseline === "fold") }),
		defineMetric(events, { id: "foldsFacingBet", title: "Folds when facing a bet", reads, compute: (scored) => share(scored.filter(({ payload }) => payload.toCall > 0), ({ payload }) => payload.done === "fold") }),
		defineMetric(events, { id: "vpip", title: "Hands played voluntarily (VPIP)", reads: ["game_scored"], compute: (games) => mean(games.flatMap(({ payload }) => Object.values(payload.stats).map((stats) => stats.vpip))) }),
		defineMetric(events, { id: "agreement", title: "Decisions of the baseline's kind", reads, compute: (scored) => share(scored, ({ payload }) => kindOf(payload.done) === kindOf(payload.baseline)) }),
		defineMetric(events, { id: "missed", title: "Decisions missed", unit: "decisions", reads, compute: (scored) => (scored.length === 0 ? undefined : scored.filter(({ payload }) => payload.missed).length) }),
	];
}
