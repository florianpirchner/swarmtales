// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The metrics of the `morris-referee` mechanic: the numbers it exports about a finished run, computed from its
 * `move_scored` events. The definitions are those of the old runs of nine men's morris (`stories/morris-teams/runs/`
 * on `legacy`, P106, P109 and P201): the turns the search classes as a blunder (a piece or more lost against the best
 * turn), their rate per 100 turns, the blunders of side X (the residents' side against the engine) and the missed
 * wins. The old reports divided by every turn of the games; the Referee sees only the turns it scored (a turn without
 * an alternative is not scored), so the rate here is per 100 scored turns.
 */
import type { MetricDefinition } from "@swarmtales/contracts";
import { Side } from "@swarmtales/mechanic-morris/rules";
import { defineMetric, type MetricEvent } from "@swarmtales/sdk";
import { Type } from "typebox";

// The payload of `move_scored`: values are from the point of view of the side that moved.
const MOVE_SCORED = Type.Object({
	game: Type.Integer(),
	turnNo: Type.Integer({ description: "The scored turn's number in its game, as in move_played." }),
	side: Side,
	class: Type.Union([Type.Literal("best"), Type.Literal("inaccuracy"), Type.Literal("blunder"), Type.Literal("missed_win")]),
	best: Type.Integer({ description: "The search value of the best turn, for the side that moved (100 = one piece)." }),
	played: Type.Integer({ description: "The search value of the played turn." }),
	depth: Type.Integer({ description: "Whole turns searched." }),
	alternatives: Type.Integer({ description: "Legal turns in the position." }),
	missedMill: Type.Boolean({ description: "A turn that closes a mill was legal and the played turn closed none." }),
});

/**
 * The event schemas of the morris referee, by event type: the `events` of its head, here so that its metrics are
 * typed by them.
 *
 * @internal
 */
export const refereeEvents = { move_scored: MOVE_SCORED };
type RefereeEvents = typeof refereeEvents;
type Scored = MetricEvent<RefereeEvents, "move_scored">;

// The number of the scored turns that pass, or undefined (absent) when no turn was scored.
const count = (scored: readonly Scored[], passes: (turn: Scored["payload"]) => boolean): number | undefined => (scored.length === 0 ? undefined : scored.filter(({ payload }) => passes(payload)).length);

/**
 * The metrics of the morris referee, for the `metrics` of its head.
 *
 * @param events - The event schemas of the head.
 * @returns `blunders` (the scored turns classed `blunder`, both sides), `blunderRate` (those per 100 scored turns),
 * `xBlunders` (the blunders of side X) and `missedWins` (the scored turns classed `missed_win`, both sides). Each is
 * absent when the run has no scored turn.
 *
 * @internal
 */
export function refereeMetrics(events: RefereeEvents): readonly MetricDefinition[] {
	const reads = ["move_scored"] as const;
	return [
		defineMetric(events, { id: "blunders", title: "Blunders", unit: "turns", reads, compute: (scored) => count(scored, (turn) => turn.class === "blunder") }),
		defineMetric(events, {
			id: "blunderRate",
			title: "Blunders per 100 scored turns",
			reads,
			compute: (scored) => {
				const blunders = count(scored, (turn) => turn.class === "blunder");
				return blunders === undefined ? undefined : (100 * blunders) / scored.length;
			},
		}),
		defineMetric(events, { id: "xBlunders", title: "Blunders of side X", unit: "turns", reads, compute: (scored) => count(scored, (turn) => turn.side === "X" && turn.class === "blunder") }),
		defineMetric(events, { id: "missedWins", title: "Missed wins", unit: "turns", reads, compute: (scored) => count(scored, (turn) => turn.class === "missed_win") }),
	];
}
