// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The metrics of the `seal` mechanic for the facts table of a City run (`12-m5-spec.md`, issue 49): the seals won
 * at auction and the seals broken on a resident, from its own events. A run in which no seal was auctioned or let go
 * has both absent.
 */
import type { MetricDefinition } from "@swarmtales/contracts";
import { defineMetric } from "@swarmtales/sdk";
import { SealEvents } from "./contract.ts";

const { events } = SealEvents;
const reads = ["seal_auction_opened", "seal_won", "seal_used", "seal_expired"] as const;

// The events of one type, or undefined (absent) when the run has no event of the seal.
const counting = (type: (typeof reads)[number]) => (read: readonly { readonly type: string }[]) => (read.length === 0 ? undefined : read.filter((event) => event.type === type).length);

/**
 * The metrics of the seal, for the `metrics` of its head.
 *
 * @returns `sealsWon` (the `seal_won` events) and `sealsUsed` (the `seal_used` events: a resident banished by the
 * bearer). Each is absent when the run has no auction, win, use or expiry of a seal.
 *
 * @internal
 */
export function sealMetrics(): readonly MetricDefinition[] {
	return [
		defineMetric(events, { id: "sealsWon", title: "Seals won at auction", unit: "seals", reads, compute: counting("seal_won") }),
		defineMetric(events, { id: "sealsUsed", title: "Seals broken on a resident", unit: "seals", reads, compute: counting("seal_used") }),
	];
}
