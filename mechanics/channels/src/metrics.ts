// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The metric of the `channels` mechanic for the facts table of a City or Whispers run (`12-m5-spec.md`, issue 49):
 * the notes and posts of a Director (the gamemaker's `notify` and `boardNote`), from its own events. A run whose
 * board and notices stayed empty has it absent.
 */
import type { MetricDefinition } from "@swarmtales/contracts";
import { defineMetric } from "@swarmtales/sdk";
import { ChannelsEvents } from "./events.ts";

/**
 * The metrics of the channels, for the `metrics` of its head.
 *
 * @returns `directorNotes` (the `gamemaker_note` events: a Director's note to a resident or post on the board),
 * absent when the run has no `board_post`, `notice` or `gamemaker_note`.
 *
 * @internal
 */
export function channelsMetrics(): readonly MetricDefinition[] {
	return [
		defineMetric(ChannelsEvents.events, {
			id: "directorNotes",
			title: "Notes and posts of a Director",
			unit: "notes",
			reads: ["board_post", "notice", "gamemaker_note"],
			compute: (read) => (read.length === 0 ? undefined : read.filter(({ type }) => type === "gamemaker_note").length),
		}),
	];
}
