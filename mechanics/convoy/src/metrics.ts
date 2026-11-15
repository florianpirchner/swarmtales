// SPDX-License-Identifier: Apache-2.0
/**
 * The metrics of the `convoy` mechanic: the numbers it exports about a finished run, each computed from its own
 * events. The definitions are those of the old runs of Convoy (`stories/convoy/runs/` on `legacy`, P150 to P155 and
 * P270 to P275): the games the saboteurs won, the damaged stages, a saboteur's damage cards per chance, the loyal
 * accusations and votes against the truth, and the crews voted down.
 */
import type { MetricDefinition } from "@swarmtales/contracts";
import { defineMetric, type MetricEvent } from "@swarmtales/sdk";
import type { ConvoyEvents } from "./head.ts";
import type { SeatReference } from "./model.ts";

type Scored = MetricEvent<ConvoyEvents, "convoy_game_scored">;

const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);
// A part over its whole, or undefined (absent) when the whole is 0.
const ratio = (part: number, whole: number): number | undefined => (whole === 0 ? undefined : part / whole);
// The seat lines of one role, game by game.
const lines = (scored: readonly Scored[], role: SeatReference["role"]): readonly SeatReference[] => scored.flatMap(({ payload }) => Object.values(payload.seats).filter((seat) => seat.role === role));
// The accusations a loyal seat could hit in a game: one per saboteur of that game.
const hittable = ({ payload }: Scored): number => {
	const seats = Object.values(payload.seats);
	return seats.filter((seat) => seat.role === "loyal").length * seats.filter((seat) => seat.role === "saboteur").length;
};

/**
 * The metrics of Convoy, for the `metrics` of its head.
 *
 * @param events - The event schemas of the head.
 * @returns `saboteurWins` (the games the saboteurs won, over the games), `damaged` (the damaged stages of a game, the
 * mean over the games), `damagePerChance` (the damage cards of the saboteurs over their chances: stages on a crew
 * with damage allowed), `loyalHits` (the saboteurs among the loyal seats' accusations, over one per loyal seat and
 * saboteur), `rightVotes` (the loyal votes that matched the crew's truth, over the loyal votes) and `crewsDown` (the
 * crews the table voted down). Each is absent when the run has no event it counts, or its whole is 0.
 *
 * @internal
 */
export function convoyMetrics(events: ConvoyEvents): readonly MetricDefinition[] {
	const ended = ["convoy_game_ended"] as const;
	const scored = ["convoy_game_scored"] as const;
	return [
		defineMetric(events, { id: "saboteurWins", title: "Games won by the saboteurs", reads: ended, compute: (games) => ratio(games.filter(({ payload }) => payload.winner === "saboteurs").length, games.length) }),
		defineMetric(events, { id: "damaged", title: "Damaged stages per game", unit: "stages", reads: ended, compute: (games) => ratio(sum(games.map(({ payload }) => payload.damaged)), games.length) }),
		defineMetric(events, {
			id: "damagePerChance",
			title: "Saboteur damage cards per chance",
			reads: scored,
			compute: (games) => ratio(sum(lines(games, "saboteur").map((seat) => seat.damage)), sum(lines(games, "saboteur").map((seat) => seat.chances))),
		}),
		defineMetric(events, { id: "loyalHits", title: "Loyal accusation hits", reads: scored, compute: (games) => ratio(sum(lines(games, "loyal").map((seat) => seat.hits)), sum(games.map(hittable))) }),
		defineMetric(events, {
			id: "rightVotes",
			title: "Loyal votes that matched the crew",
			reads: scored,
			compute: (games) => ratio(sum(lines(games, "loyal").map((seat) => seat.rightVotes)), sum(lines(games, "loyal").map((seat) => seat.votes))),
		}),
		defineMetric(events, {
			id: "crewsDown",
			title: "Crews voted down",
			unit: "crews",
			reads: ["convoy_votes_revealed"],
			compute: (votes) => (votes.length === 0 ? undefined : votes.filter(({ payload }) => !payload.confidence).length),
		}),
	];
}
