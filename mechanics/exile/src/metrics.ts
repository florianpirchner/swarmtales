// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The metrics of the `exile` mechanic for the facts table of a City or Whispers run (`12-m5-spec.md`, issue 49):
 * the exiles and the ransoms, from its own events. The exile writes no event until a resident is sent to the gate or
 * banished, so a run without any of its events has both absent.
 */
import type { MetricDefinition } from "@swarmtales/contracts";
import { defineMetric } from "@swarmtales/sdk";
import { ExileEvents } from "./contract.ts";

const { events } = ExileEvents;
const reads = ["exile_gate", "exiled", "ransom_paid", "ransomed", "last_will"] as const;

/**
 * The metrics of the exile, for the `metrics` of its head.
 *
 * @returns `exiles` (the `exiled` events: residents banished, by a tribunal, a closed gate, a seal or a strike) and
 * `ransoms` (the `ransomed` events: residents bought back from the gate). Each is absent when the run has no event
 * of the exile.
 *
 * @internal
 */
export function exileMetrics(): readonly MetricDefinition[] {
	const counting = (type: (typeof reads)[number]) => (read: readonly { readonly type: string }[]) => (read.length === 0 ? undefined : read.filter((event) => event.type === type).length);
	return [
		defineMetric(events, { id: "exiles", title: "Residents exiled", unit: "residents", reads, compute: counting("exiled") }),
		defineMetric(events, { id: "ransoms", title: "Residents ransomed from the gate", unit: "residents", reads, compute: counting("ransomed") }),
	];
}
