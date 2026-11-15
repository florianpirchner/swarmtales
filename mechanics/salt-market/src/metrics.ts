// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The metrics of the `salt-market` mechanic: the numbers it exports about a finished run, each computed from its own
 * events. The definitions are those of the old runs of Salt Market (`stories/salt-market/runs/` on `legacy`, P140 to
 * P149, P180 and P435): the gain over idle and the efficiency of the reference of `market_game_scored`, the table
 * points, the contracts filled, the trades, the trades with a later part (promises and escrows) and the broken
 * promises.
 */
import type { MetricDefinition } from "@swarmtales/contracts";
import { defineMetric, type MetricEvent } from "@swarmtales/sdk";
import type { SaltMarketEvents } from "./head.ts";

const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);
const mean = (values: readonly number[]): number | undefined => (values.length === 0 ? undefined : sum(values) / values.length);
type Counted = MetricEvent<SaltMarketEvents, "market_game_started" | "market_trade" | "market_promise_settled">;
// The events that pass, or undefined (absent) when no game started: a game without a trade has 0 trades.
const count = (events: readonly Counted[], passes: (event: Counted) => boolean): number | undefined => (events.some(({ type }) => type === "market_game_started") ? events.filter(passes).length : undefined);

/**
 * The metrics of Salt Market, for the `metrics` of its head.
 *
 * @param events - The event schemas of the head.
 * @returns `gainOverIdle` (what trading added over doing nothing, as a share of what was possible) and `efficiency`
 * (the share of the possible gains from trade realised), each the mean over the scored games; `tablePoints` (the
 * joint score of the traders) and `contracts` (the contracts filled), each summed over the scored games; `trades`
 * (the trades made), `credit` (the trades with goods delivered later, as a promise or in escrow) and `brokenPromises`
 * (the settled deliveries that were broken), each counted over the games started. Each is absent when the run has no
 * event it counts, or no game started.
 *
 * @internal
 */
export function saltMarketMetrics(events: SaltMarketEvents): readonly MetricDefinition[] {
	const scored = ["market_game_scored"] as const;
	const trades = ["market_game_started", "market_trade"] as const;
	return [
		defineMetric(events, { id: "gainOverIdle", title: "Gain over idle", reads: scored, compute: (games) => mean(games.map(({ payload }) => payload.reference.gainOverIdle)) }),
		defineMetric(events, { id: "efficiency", title: "Gains from trade realised", reads: scored, compute: (games) => mean(games.map(({ payload }) => payload.reference.efficiency)) }),
		defineMetric(events, { id: "tablePoints", title: "Table points", unit: "points", reads: scored, compute: (games) => (games.length === 0 ? undefined : sum(games.map(({ payload }) => payload.reference.total))) }),
		defineMetric(events, {
			id: "contracts",
			title: "Contracts filled",
			unit: "contracts",
			reads: scored,
			compute: (games) => (games.length === 0 ? undefined : sum(games.map(({ payload }) => payload.reference.contractsMet))),
		}),
		defineMetric(events, { id: "trades", title: "Trades", unit: "trades", reads: trades, compute: (made) => count(made, ({ type }) => type === "market_trade") }),
		defineMetric(events, { id: "credit", title: "Trades with a later delivery", unit: "trades", reads: trades, compute: (made) => count(made, (event) => event.type === "market_trade" && event.payload.later !== undefined) }),
		defineMetric(events, {
			id: "brokenPromises",
			title: "Promises broken",
			unit: "promises",
			reads: ["market_game_started", "market_promise_settled"],
			compute: (settled) => count(settled, (event) => event.type === "market_promise_settled" && event.payload.status === "broken"),
		}),
	];
}
