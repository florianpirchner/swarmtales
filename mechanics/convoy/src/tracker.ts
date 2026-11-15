// SPDX-License-Identifier: Apache-2.0
/**
 * The reference of a game for the report: every seat's accusations and votes against a Bayesian tracker of the public
 * record (the crews, the damage counts, the audit), and what the sealed cards and the talk show of its play.
 */
import type { ConvoyCtx } from "./head.ts";
import { posterior, revealsSelf, topSuspects, type Observation, type SeatReference, type StageRecord } from "./model.ts";

const observations = (stages: readonly StageRecord[]): Observation[] => stages.map((stage) => ({ crew: stage.crew, damage: stage.damage, ...(stage.audit === undefined ? {} : { audit: { seat: stage.audit.seat, card: stage.audit.card } }) }));

const round = (value: number): number => Math.round(value * 1000) / 1000;

// The votes of a loyal seat that matched the crew: yes on a crew without a saboteur, no on one with. A saboteur votes by its own plan, so only a loyal seat's votes are scored.
function rightVotes(seat: string, voted: readonly StageRecord[], saboteurs: readonly string[]): number {
	return voted.filter((stage) => {
		const crew = stage.rejected?.crew ?? stage.crew;
		const clean = !crew.some((member) => saboteurs.includes(member));
		return (stage.votes[seat] === "yes") === clean;
	}).length;
}

/**
 * The reference of the game that ends, the payload of `convoy_game_scored` without its game number.
 *
 * @param ctx - The context of the mechanic.
 * @returns Every seat's reference, the tracker's top suspects from the public record alone, and their posteriors.
 *
 * @public
 */
export function referenceOf(ctx: ConvoyCtx): { seats: Record<string, SeatReference>; tracker: string[]; posterior: Record<string, number> } {
	const state = ctx.state;
	const seen = observations(state.stages);
	const saboteurs = state.seats.filter((seat) => state.roles[seat] === "saboteur");
	const count = ctx.options.saboteurs;
	const open = posterior(state.seats, count, seen);
	const seats = Object.fromEntries(
		state.seats.map((seat): [string, SeatReference] => {
			const role = state.roles[seat] ?? "loyal";
			const accused = state.accusations[seat] ?? [];
			const own = role === "loyal" ? posterior(state.seats, count, seen, seat) : open;
			const top = topSuspects(own, state.seats, count, role === "loyal" ? seat : undefined);
			const voted = state.stages.filter((stage) => stage.votes[seat] !== undefined && !(stage.noVote ?? []).includes(seat));
			const plays = state.sealed.filter((entry) => entry.seat === seat);
			return [
				seat,
				{
					role,
					accused: [...accused],
					hits: accused.filter((id) => saboteurs.includes(id)).length,
					trackerHits: top.filter((id) => saboteurs.includes(id)).length,
					trackerMass: round(accused.reduce((sum, id) => sum + (own[id] ?? 0), 0)),
					rightVotes: role === "saboteur" ? 0 : rightVotes(seat, voted, saboteurs),
					votes: voted.length,
					chances: plays.filter((entry) => entry.mayDamage && !entry.missed).length,
					damage: plays.filter((entry) => entry.card === "damage").length,
					selfReveals: state.talk.filter((line) => line.from === seat && revealsSelf(line.text)).length,
					missed: state.missed[seat] ?? 0,
				},
			];
		}),
	);
	return { seats, tracker: topSuspects(open, state.seats, count), posterior: Object.fromEntries(Object.entries(open).map(([seat, value]) => [seat, round(value)])) };
}
