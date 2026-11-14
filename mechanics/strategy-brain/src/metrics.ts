// SPDX-License-Identifier: Apache-2.0
/** The metric of the `strategy-brain` mechanic: the number it exports about a finished run, computed from its own events. */
import type { MetricDefinition } from "@swarmtales/contracts";
import { defineMetric } from "@swarmtales/sdk";
import type { StrategyBrainEvents } from "./head.ts";

/**
 * The metrics of the strategy brain, for the `metrics` of its head.
 *
 * @param events - The event schemas of the head.
 * @returns `brainWrites`: the count of `brain_written`. It is absent when no brain was written, which is every run
 * with `enabled: false`.
 *
 * @internal
 */
export function strategyBrainMetrics(events: StrategyBrainEvents): readonly MetricDefinition[] {
	return [defineMetric(events, { id: "brainWrites", title: "Brains written", reads: ["brain_written"], compute: (written) => (written.length === 0 ? undefined : written.length) })];
}
