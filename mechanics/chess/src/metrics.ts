// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The metrics of the `chess` mechanic: the numbers it exports about a finished run, each computed from its own events.
 * The definitions are those of the old runs index of chess (`stories/chess/runs/README.md` on `legacy`): the
 * half-moves played (the divisor of "requests per half-move") and the refused moves (reported per 100 half-moves).
 */
import type { MetricDefinition } from "@swarmtales/contracts";
import { defineMetric } from "@swarmtales/sdk";
import type { ChessEvents } from "./head.ts";

/**
 * The metrics of chess, for the `metrics` of its head.
 *
 * @param events - The event schemas of the head.
 * @returns `plies` (the half-moves played in every game of the run, forfeit moves included) and `refusedMoves` (the
 * moves chess.js refused as illegal or unreadable, every seat and game together). Each is absent when the run has no
 * half-move and no refused move: no game was played.
 *
 * @internal
 */
export function chessMetrics(events: ChessEvents): readonly MetricDefinition[] {
	return [
		defineMetric(events, { id: "plies", title: "Half-moves played", unit: "half-moves", reads: ["move_played"], compute: (played) => (played.length === 0 ? undefined : played.length) }),
		defineMetric(events, {
			id: "refusedMoves",
			title: "Refused moves",
			reads: ["move_played", "move_refused"],
			compute: (read) => (read.length === 0 ? undefined : read.filter((event) => event.type === "move_refused").length),
		}),
	];
}
