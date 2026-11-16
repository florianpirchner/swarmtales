// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The metrics of the `tribunal` mechanic for the facts table of a City run (`12-m5-spec.md`, issue 49): the
 * tribunals counted, the secret votes and the tribunals the gamemaker planned, from its own events. A run in which no
 * tribunal was planned (Act I) has all three absent.
 */
import type { MetricDefinition } from "@swarmtales/contracts";
import { defineMetric, type MetricEvent } from "@swarmtales/sdk";
import { TribunalEvents } from "./contract.ts";

const { events } = TribunalEvents;
const reads = ["tribunal_scheduled", "tribunal_vote", "tribunal_result"] as const;
type Read = MetricEvent<typeof events, (typeof reads)[number]>;

// The events that pass, or undefined (absent) when no tribunal was planned.
const counting = (passes: (event: Read) => boolean) => (read: readonly Read[]) => (read.some(({ type }) => type === "tribunal_scheduled") ? read.filter(passes).length : undefined);

/**
 * The metrics of the tribunal, for the `metrics` of its head.
 *
 * @returns `tribunals` (the `tribunal_result` events: tribunals whose vote was counted), `votes` (the
 * `tribunal_vote` events: secret votes cast) and `gamemakerTribunals` (the `tribunal_scheduled` events the
 * gamemaker planned). Each is absent when the run has no `tribunal_scheduled`.
 *
 * @internal
 */
export function tribunalMetrics(): readonly MetricDefinition[] {
	return [
		defineMetric(events, { id: "tribunals", title: "Tribunals counted", unit: "tribunals", reads, compute: counting(({ type }) => type === "tribunal_result") }),
		defineMetric(events, { id: "votes", title: "Secret votes of a tribunal", unit: "votes", reads, compute: counting(({ type }) => type === "tribunal_vote") }),
		defineMetric(events, {
			id: "gamemakerTribunals",
			title: "Tribunals the gamemaker planned",
			unit: "tribunals",
			reads,
			compute: counting((event) => event.type === "tribunal_scheduled" && event.payload.by === "gamemaker"),
		}),
	];
}
