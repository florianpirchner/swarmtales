// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The metrics of the mechanic `interpretations` for the facts table of a City or Whispers run (`12-m5-spec.md`, issue
 * 49): the Confessor's labels per kind, from its own events. A run in which the Confessor finished no round and failed
 * none has every one absent; a round without a label of a kind counts 0 of it.
 */
import type { MetricDefinition } from "@swarmtales/contracts";
import { defineMetric } from "@swarmtales/sdk";
import type { InterpretationsEvents, LABELS } from "./interpretations.ts";

/**
 * The metrics of the Confessor, for the `metrics` of the head of `interpretations`.
 *
 * @param events - The event schemas of the head.
 * @param labels - The closed set of labels, in its order.
 * @returns For every label a metric `labelled<Label>` (`labelledPromise`, `labelledHelpRequest`, ...): the statements
 * labelled with it (the `interpretation` events that carry it), absent when the run has no `interpretation_round`
 * and no `interpretation_error`.
 *
 * @internal
 */
export function interpretationsMetrics(events: InterpretationsEvents, labels: typeof LABELS): readonly MetricDefinition[] {
	return labels.map((label) =>
		defineMetric(events, {
			id: `labelled${label.charAt(0).toUpperCase()}${label.slice(1)}`,
			title: `Statements the Confessor labelled ${label}`,
			unit: "statements",
			reads: ["interpretation", "interpretation_round", "interpretation_error"],
			compute: (read) => (read.some(({ type }) => type !== "interpretation") ? read.filter((event) => event.type === "interpretation" && event.payload.labels.includes(label)).length : undefined),
		}),
	);
}
