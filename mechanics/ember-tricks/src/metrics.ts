// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The metrics of the `ember-tricks` mechanic: the numbers it exports about a finished run, each computed from its own
 * events. The definitions are those of the old Ember Tricks runs (`stories/ember-tricks/runs/` on `legacy`; the result
 * tables of `ember-tricks-04a-002-long-matrix`, `-003-levers` and `-005-reference`, P136, P165): the hits, the zero
 * bids, the mean bid and the points per seat and round, over every seat of every scored round; the vetoes and the
 * forfeits.
 */
import type { MetricDefinition } from "@swarmtales/contracts";
import { defineMetric, type MetricEvent } from "@swarmtales/sdk";
import type { TrickPlayEvents } from "./events.ts";

type Events = (typeof TrickPlayEvents)["events"];
type Round = MetricEvent<Events, "round_scored">["payload"];

/** One seat of one scored round: its bid, its tricks and its points. */
interface SeatRound {
	readonly bid: number;
	readonly took: number;
	readonly points: number;
}

// Every seat of every scored round, in log order and the order of the bids.
const seatRounds = (rounds: readonly Round[]): readonly SeatRound[] =>
	rounds.flatMap((round) => Object.entries(round.bids).map(([seat, bid]) => ({ bid, took: round.tricks[seat] ?? 0, points: round.points[seat] ?? 0 })));
const mean = (values: readonly number[]): number | undefined => (values.length === 0 ? undefined : values.reduce((total, value) => total + value, 0) / values.length);
const share = (items: readonly SeatRound[], passes: (item: SeatRound) => boolean): number | undefined => (items.length === 0 ? undefined : items.filter(passes).length / items.length);
// The seat-rounds of the scored rounds of a run.
const of = (scored: readonly { readonly payload: Round }[]): readonly SeatRound[] => seatRounds(scored.map(({ payload }) => payload));

/**
 * The metrics of trick play, for the `metrics` of its head.
 *
 * @param events - The event schemas of trick play.
 * @returns `hits` (the bids that took exactly the tricks bid), `zeroBids` (the bids of 0 tricks), each over the bids of
 * the scored rounds; `meanBid` and `points` (the mean bid and the mean points per seat and round); `vetoes` (the lead
 * cards sent back, absent when no round was scored) and `forfeits` (the actions the move timer took for a seat, over
 * its bids, trumps and cards). Each is absent when the run has no event it counts.
 *
 * @internal
 */
export function trickPlayMetrics(events: Events): readonly MetricDefinition[] {
	const reads = ["round_scored"] as const;
	return [
		defineMetric(events, { id: "hits", title: "Bids hit exactly", reads, compute: (scored) => share(of(scored), (seat) => seat.bid === seat.took) }),
		defineMetric(events, { id: "zeroBids", title: "Bids of zero tricks", reads, compute: (scored) => share(of(scored), (seat) => seat.bid === 0) }),
		defineMetric(events, { id: "meanBid", title: "Mean bid per seat and round", unit: "tricks", reads, compute: (scored) => mean(of(scored).map((seat) => seat.bid)) }),
		defineMetric(events, { id: "points", title: "Points per seat and round", unit: "points", reads, compute: (scored) => mean(of(scored).map((seat) => seat.points)) }),
		defineMetric(events, {
			id: "vetoes",
			title: "Leads vetoed",
			unit: "vetoes",
			reads: ["round_scored", "lead_vetoed"],
			compute: (read) => (read.some((event) => event.type === "round_scored") ? read.filter((event) => event.type === "lead_vetoed").length : undefined),
		}),
		defineMetric(events, {
			id: "forfeits",
			title: "Actions of the move timer",
			unit: "actions",
			reads: ["bid_placed", "trump_named", "card_played"],
			compute: (acted) => (acted.length === 0 ? undefined : acted.filter(({ payload }) => payload.forfeit).length),
		}),
	];
}
