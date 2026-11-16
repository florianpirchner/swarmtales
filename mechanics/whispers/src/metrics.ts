// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The metrics of the `whispers` mechanic for the facts table of a Whispers run (`12-m5-spec.md`, issue 49): the
 * whisperer's direct messages as its duty notices count them, its forgeries and the ballots of the popularity vote,
 * from its own events. A control run chooses no whisperer and has the first two absent.
 */
import type { MetricDefinition } from "@swarmtales/contracts";
import { defineMetric } from "@swarmtales/sdk";
import { WhispersEvents } from "./contract.ts";

const { events } = WhispersEvents;

/**
 * The metrics of the whisperer and the popularity vote, for the `metrics` of its head.
 *
 * @returns `whisperDms` (the sum of `dms` over the `whisper_duty` notices: the whisperer's direct messages in the
 * windows its notices reported on; absent without a notice), `forgeries` (the `receipt_forged` events; absent when
 * no whisperer was chosen) and `popularityBallots` (the `popularity_ballot` events; absent when no round opened).
 *
 * @internal
 */
export function whispersMetrics(): readonly MetricDefinition[] {
	return [
		defineMetric(events, {
			id: "whisperDms",
			title: "The whisperer's direct messages, by its duty notices",
			unit: "messages",
			reads: ["whisper_duty"],
			compute: (duty) => (duty.length === 0 ? undefined : duty.reduce((sum, { payload }) => sum + payload.dms, 0)),
		}),
		defineMetric(events, {
			id: "forgeries",
			title: "Receipts forged",
			unit: "receipts",
			reads: ["whisperer_chosen", "receipt_forged"],
			compute: (read) => (read.some(({ type }) => type === "whisperer_chosen") ? read.filter(({ type }) => type === "receipt_forged").length : undefined),
		}),
		defineMetric(events, {
			id: "popularityBallots",
			title: "Ballots of the popularity vote",
			unit: "votes",
			reads: ["popularity_opened", "popularity_ballot"],
			compute: (read) => (read.some(({ type }) => type === "popularity_opened") ? read.filter(({ type }) => type === "popularity_ballot").length : undefined),
		}),
	];
}
