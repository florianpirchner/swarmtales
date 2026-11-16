// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The metrics of the `receipts` mechanic for the facts table of a City or Whispers run (`12-m5-spec.md`, issue 49):
 * the blames settled and those upheld, from its own events. A blame needs a receipt, so a run in which the city issued
 * no receipt and settled no blame has both absent; one with receipts and no blame has 0.
 */
import type { MetricDefinition } from "@swarmtales/contracts";
import { defineMetric, type MetricEvent } from "@swarmtales/sdk";
import { ReceiptsEvents } from "./contract.ts";

const { events } = ReceiptsEvents;
const reads = ["receipt_issued", "blame"] as const;
type Read = MetricEvent<typeof events, (typeof reads)[number]>;

// The blames that pass, or undefined (absent) when the run has no receipt and no blame.
const counting = (passes: (outcome: "upheld" | "rejected") => boolean) => (read: readonly Read[]) =>
	read.length === 0 ? undefined : read.filter((event) => event.type === "blame" && passes(event.payload.outcome)).length;

/**
 * The metrics of the receipts, for the `metrics` of its head.
 *
 * @returns `blames` (the `blame` events: blames the city settled) and `blamesUpheld` (those whose accused had lied).
 * Each is absent when the run has neither a `receipt_issued` nor a `blame`.
 *
 * @internal
 */
export function receiptsMetrics(): readonly MetricDefinition[] {
	return [
		defineMetric(events, { id: "blames", title: "Blames settled", unit: "blames", reads, compute: counting(() => true) }),
		defineMetric(events, { id: "blamesUpheld", title: "Blames upheld", unit: "blames", reads, compute: counting((outcome) => outcome === "upheld") }),
	];
}
