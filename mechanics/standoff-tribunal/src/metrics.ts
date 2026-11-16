// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The metrics of the `standoff-tribunal` mechanic for the facts table of a Whispers run (`12-m5-spec.md`, issue
 * 49): the holdout tribunals called and their secret ballots, from its own events. A run in which the city found no
 * blocker has both absent.
 */
import type { MetricDefinition } from "@swarmtales/contracts";
import { defineMetric } from "@swarmtales/sdk";
import { StandoffTribunalEvents } from "./contract.ts";

const { events } = StandoffTribunalEvents;
const reads = ["blocker_found", "holdout_called", "holdout_ballot"] as const;

// The events of one type, or undefined (absent) when the run has no event of these types.
const counting = (type: (typeof reads)[number]) => (read: readonly { readonly type: string }[]) => (read.length === 0 ? undefined : read.filter((event) => event.type === type).length);

/**
 * The metrics of the holdout tribunal, for the `metrics` of its head.
 *
 * @returns `holdouts` (the `holdout_called` events) and `votes` (the `holdout_ballot` events: secret ballots cast).
 * Each is absent when the run has no `blocker_found`, `holdout_called` or `holdout_ballot`.
 *
 * @internal
 */
export function standoffTribunalMetrics(): readonly MetricDefinition[] {
	return [
		defineMetric(events, { id: "holdouts", title: "Holdout tribunals called", unit: "tribunals", reads, compute: counting("holdout_called") }),
		defineMetric(events, { id: "votes", title: "Secret ballots of a holdout tribunal", unit: "votes", reads, compute: counting("holdout_ballot") }),
	];
}
