// SPDX-License-Identifier: Apache-2.0
/**
 * The metrics of the `sealed-auction` mechanic: the numbers it exports about a finished run, each computed from its
 * own events. The definitions are those of the old Blind Bid smoke (`stories/blind-bid/runs/blind-bid-04a-001-smoke/`
 * on `legacy`, P160 to P163): the reference of `game_scored` per game, averaged or summed over the games.
 */
import type { MetricDefinition } from "@swarmtales/contracts";
import { defineMetric, type MetricEvent } from "@swarmtales/sdk";
import type { SealedAuctionEvents } from "./head.ts";
import type { Reference } from "./reference.ts";

type Scored = MetricEvent<SealedAuctionEvents, "game_scored">;

const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);
const mean = (values: readonly number[]): number | undefined => (values.length === 0 ? undefined : sum(values) / values.length);
// One number of the reference, game by game, over the games that `has` keeps.
const per = (scored: readonly Scored[], read: (reference: Reference) => number, has: (reference: Reference) => boolean = () => true): readonly number[] =>
	scored.flatMap(({ payload }) => (has(payload.reference) ? [read(payload.reference)] : []));

/**
 * The metrics of the sealed auction, for the `metrics` of its head.
 *
 * @param events - The event schemas of the head.
 * @returns `shading` (the mean bid over value on pay-your-bid lots), `truthfulness` (on pay-the-runner-up lots, over
 * the bids the purse did not cap), `bidToEstimate` (the mean bid over the estimate on shared-worth lots), each the
 * mean over the games that had a lot of that kind; `cursed` (the shared-worth lots sold above their worth) and
 * `missed` (the bids the deadline turned into a pass), summed over the games; `unspent` (the share of the purse left
 * at the end of a game), the mean over the games. Each is absent when the run has no scored game it reads. A game
 * whose lots of a kind got no counting bid reads 0 for that kind, as its `game_scored` does.
 *
 * @internal
 */
export function sealedAuctionMetrics(events: SealedAuctionEvents): readonly MetricDefinition[] {
	const reads = ["game_scored"] as const;
	return [
		defineMetric(events, { id: "shading", title: "Bid over value, pay-your-bid", reads, compute: (scored) => mean(per(scored, (r) => r.firstPrice.shading, (r) => r.firstPrice.lots > 0)) }),
		defineMetric(events, { id: "truthfulness", title: "Truthfulness, pay-the-runner-up", reads, compute: (scored) => mean(per(scored, (r) => r.secondPrice.truthfulness, (r) => r.secondPrice.lots > 0)) }),
		defineMetric(events, { id: "bidToEstimate", title: "Bid over estimate, shared worth", reads, compute: (scored) => mean(per(scored, (r) => r.common.bidToEstimate, (r) => r.common.lots > 0)) }),
		defineMetric(events, { id: "cursed", title: "Shared-worth lots sold at a loss", unit: "lots", reads, compute: (scored) => (scored.length === 0 ? undefined : sum(per(scored, (r) => r.common.cursed))) }),
		defineMetric(events, { id: "unspent", title: "Purse left unspent", reads, compute: (scored) => mean(per(scored, (r) => r.unspent)) }),
		defineMetric(events, { id: "missed", title: "Bids missed", unit: "bids", reads, compute: (scored) => (scored.length === 0 ? undefined : sum(per(scored, (r) => r.missed))) }),
	];
}
