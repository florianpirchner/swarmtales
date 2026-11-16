// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The metrics of the `progression` mechanic for the facts table of a City or Whispers run (`12-m5-spec.md`, issue
 * 49): the doors passed, in all and per resident, each from its own events. A run without `act_started` played no
 * act, and both are absent.
 */
import type { MetricDefinition } from "@swarmtales/contracts";
import { defineMetric } from "@swarmtales/sdk";
import { ProgressionEvents } from "./contract.ts";

const { events } = ProgressionEvents;

/**
 * The metrics of the progression, for the `metrics` of its head.
 *
 * @returns `doorsPassed` (the `level_up` events: one door passed by one resident) and `doorsPerResident` (the same
 * over the residents the first act began with). Each is absent when the run has no `act_started`.
 *
 * @internal
 */
export function progressionMetrics(): readonly MetricDefinition[] {
	const reads = ["act_started", "level_up"] as const;
	return [
		defineMetric(events, {
			id: "doorsPassed",
			title: "Doors passed",
			unit: "doors",
			reads,
			compute: (read) => (read.some(({ type }) => type === "act_started") ? read.filter(({ type }) => type === "level_up").length : undefined),
		}),
		defineMetric(events, {
			id: "doorsPerResident",
			title: "Doors passed per resident",
			unit: "doors",
			reads,
			compute: (read) => {
				const first = read.find((event) => event.type === "act_started");
				if (first?.type !== "act_started" || first.payload.residents.length === 0) return undefined;
				return read.filter(({ type }) => type === "level_up").length / first.payload.residents.length;
			},
		}),
	];
}
