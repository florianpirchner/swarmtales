/**
 * `freeRide`: a competitor solved a level after another sent them a piece of
 * it, and never answered that giver afterwards: no DM, no post in a group the
 * giver could read, no payment and no public statement the classifier
 * labelled as thanks, an offer or a promise to the giver (a thank-you on the
 * board counts), up to the end of the log. A piece is a fragment from a
 * teammate (same team on that level; other teams' fragments cannot help), or
 * a factor the competitor needed (counter-factor, team certificate, city factor).
 *
 * Two shares are no free ride by the structure of the wall: a team certificate
 * (or a team's own city factor) handed to a teammate (it serves the whole team), and on a ring level a
 * counter-factor from the previous resident of the ring when the solver passes
 * the counter-factor it holds on to the next one (in a ring nobody can give
 * back to their giver; passing on is the answer). Nor is a city factor or
 * certificate its giver handed to 3 or more residents: that is one `generous`
 * beat for the giver instead.
 */
import { draft, type BeatDraft } from "../beats.ts";
import { eventsOfType } from "../event-log.ts";
import { isPrivateSource } from "@swarmtales/legacy-log";
import { PIECE_TEXT, reachedAfter, sameTeam, type RunFacts, type SharedPiece } from "../facts.ts";
import { generousGifts, isGenerous } from "./generous.ts";

export function detectFreeRides(facts: RunFacts): readonly BeatDraft[] {
	const beats: BeatDraft[] = [];
	const gifts = generousGifts(facts);
	for (const solved of eventsOfType(facts.events, "level_up")) {
		const level = solved.from;
		const givers = new Map<string, number[]>();
		const pieces = new Map<string, SharedPiece[]>();
		for (const share of facts.shares) {
			if (share.level !== level || share.to !== solved.agent || share.from === solved.agent || share.seq > solved.seq) continue;
			// Factor shares only ever reach someone who needs them; fragments only help within the team.
			if (share.piece === "fragment" && !sameTeam(facts, level, share.from, solved.agent)) continue;
			if (share.piece === "certificate" && sameTeam(facts, level, share.from, solved.agent)) continue;
			// A team's own city factor serves the whole team, like its certificate.
			if (share.piece === "cityFactor" && (facts.factors.get(level)?.teamCityFactors.size ?? 0) > 0 && sameTeam(facts, level, share.from, solved.agent)) continue;
			if (share.piece === "counterFactor" && passedOnInRing(facts, level, share.from, solved.agent)) continue;
			if (isGenerous(gifts, share)) continue;
			const list = givers.get(share.from) ?? [];
			list.push(share.seq);
			givers.set(share.from, list);
			const given = pieces.get(share.from) ?? [];
			if (!given.includes(share.piece)) given.push(share.piece);
			pieces.set(share.from, given);
		}
		for (const [giver, seqs] of [...givers].sort(([a], [b]) => a.localeCompare(b))) {
			const what = (pieces.get(giver) ?? ["fragment"]).map((piece) => PIECE_TEXT[piece]).join(" and ");
			const firstShare = Math.min(...seqs);
			if (reachedAfter(facts, solved.agent, giver, firstShare) || repaidAfter(facts, solved.agent, giver, firstShare)) continue;
			beats.push(
				draft({
					kind: "freeRide",
					seq: solved.seq,
					minute: solved.minute,
					actors: [solved.agent],
					targets: [giver],
					summary: `${solved.agent} solved level ${level} with ${giver}'s ${what} and never answered ${giver}.`,
					evidence: [...seqs, solved.seq],
				}),
			);
		}
	}
	return beats;
}

/**
 * Whether `agent` passed the counter-factor it holds on to its owner, the next
 * resident of a ring that runs through `giver`, `agent` and that owner inside
 * one team (any time on the level). On a mutual level the owner is the giver,
 * and the ordinary answer rules apply.
 */
function passedOnInRing(facts: RunFacts, level: number, giver: string, agent: string): boolean {
	const deal = facts.factors.get(level);
	if (deal === undefined) return false;
	const next = [...deal.holdings.values()].find((holding) => holding.counterHolder === agent)?.agent;
	if (next === undefined || next === giver || !sameTeam(facts, level, agent, next) || !sameTeam(facts, level, agent, giver)) return false;
	return facts.shares.some((share) => share.level === level && share.piece === "counterFactor" && share.from === agent && share.to === next);
}

/** Whether `from` publicly thanked, offered or promised something to `to` after `afterSeq` (classifier labels). */
function repaidAfter(facts: RunFacts, from: string, to: string, afterSeq: number): boolean {
	for (const [ref, entries] of facts.interpretations) {
		if (ref <= afterSeq) continue;
		const repaid = entries.some(
			(entry) =>
				entry.agent === from &&
				!isPrivateSource(entry.source) &&
				entry.targets.includes(to) &&
				entry.labels.some((label) => label === "thanks" || label === "offer" || label === "promise"),
		);
		if (repaid) return true;
	}
	return false;
}
