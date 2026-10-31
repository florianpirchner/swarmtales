/**
 * Casting the book (code, no model): picks the 3-4 point-of-view figures of
 * the story from the digest. Every resident is scored by the turning points
 * it is part of, its beats and its messages; the cast prefers a mix of the
 * winner, a loser (exiled, or last) and someone with a turn, then fills up by
 * score.
 */
import type { RunAnalysis } from "../digest/digest.ts";
import type { DigestEvent } from "../digest/event-log.ts";
import { turningPoints } from "../digest/turning-points.ts";

export type CastRole = "winner" | "loser" | "turn" | "weight";

export interface PovFigure {
	readonly agent: string;
	readonly role: CastRole;
	readonly score: number;
	/** Why the figure scored, for the appendix. */
	readonly reasons: readonly string[];
}

export interface ResidentScore {
	readonly agent: string;
	readonly score: number;
	readonly turningPoints: number;
	readonly beats: number;
	readonly messages: number;
}

export interface Casting {
	readonly povs: readonly PovFigure[];
	/** Every resident by score, highest first. */
	readonly scores: readonly ResidentScore[];
}

export const SCORE_WEIGHTS = { turningPoint: 3, winner: 3, last: 2, beat: 1, message: 0.05, maxMessages: 3 } as const;

/** Beat kinds that mark a turn in a figure's story. */
const TURN_BEATS: ReadonlySet<string> = new Set(["fateShift", "voteBetrayal", "ransomPaid", "brokenPromise", "doubleGame", "ultimatum"]);

/** Residents a turning point event is about. */
export function turningPointAgents(event: DigestEvent): readonly string[] {
	if (event.type === "seal_won") return [event.agent];
	if (event.type === "seal_used") return [event.holder, event.target];
	if (event.type === "ultimatum_resolved") return event.paid.map((payment) => payment.agent);
	if (event.type === "exiled") return [event.agent];
	if (event.type === "ransomed") return [event.agent, ...event.payers];
	if (event.type === "last_will") return [event.agent, ...event.bequests.map((bequest) => bequest.to)];
	if (event.type === "goal_resolved") return [event.agent];
	return [];
}

interface Tally {
	turningPoints: number;
	beats: number;
	messages: number;
	bonus: number;
	readonly reasons: string[];
}

export function castBook(analysis: RunAnalysis, count?: number): Casting {
	const { facts } = analysis;
	const residents = facts.agents;
	const tally = new Map(residents.map((agent): [string, Tally] => [agent, { turningPoints: 0, beats: 0, messages: 0, bonus: 0, reasons: [] }]));
	const turners = new Set<string>();

	const end = facts.events.findLast((event) => event.type === "run_end");
	const standings = end?.type === "run_end" ? [...(end.standings ?? [])].sort((a, b) => a.rank - b.rank) : [];
	const winner = standings[0]?.agent;
	const last = standings.length > 1 ? standings.at(-1)?.agent : undefined;

	for (const point of turningPoints(facts.events)) {
		const event = facts.bySeq.get(point.seq);
		if (event === undefined) continue;
		const agents = [...new Set(turningPointAgents(event))];
		for (const agent of agents) {
			const entry = tally.get(agent);
			if (entry === undefined) continue;
			entry.turningPoints += 1;
			entry.reasons.push(`turning point #${point.seq}`);
			if (event.type !== "exiled") turners.add(agent);
		}
	}
	for (const beat of analysis.beats) {
		for (const agent of new Set([...beat.actors, ...beat.targets])) {
			const entry = tally.get(agent);
			if (entry === undefined) continue;
			entry.beats += 1;
			if (TURN_BEATS.has(beat.kind)) turners.add(agent);
		}
	}
	for (const message of facts.messages) {
		for (const agent of new Set([message.from, ...message.recipients])) {
			const entry = tally.get(agent);
			if (entry !== undefined) entry.messages += 1;
		}
	}
	const winnerEntry = winner === undefined ? undefined : tally.get(winner);
	if (winnerEntry !== undefined) {
		winnerEntry.bonus += SCORE_WEIGHTS.winner;
		winnerEntry.reasons.push("rank 1 at the end");
	}
	const lastEntry = last === undefined ? undefined : tally.get(last);
	if (lastEntry !== undefined) {
		lastEntry.bonus += SCORE_WEIGHTS.last;
		lastEntry.reasons.push("last at the end");
	}

	const scores: ResidentScore[] = residents
		.map((agent) => {
			const entry = tally.get(agent);
			const turningPointCount = entry?.turningPoints ?? 0;
			const beats = entry?.beats ?? 0;
			const messages = entry?.messages ?? 0;
			const score =
				turningPointCount * SCORE_WEIGHTS.turningPoint +
				beats * SCORE_WEIGHTS.beat +
				Math.min(messages * SCORE_WEIGHTS.message, SCORE_WEIGHTS.maxMessages) +
				(entry?.bonus ?? 0);
			return { agent, score: Math.round(score * 100) / 100, turningPoints: turningPointCount, beats, messages };
		})
		.sort((a, b) => b.score - a.score || a.agent.localeCompare(b.agent));

	const wanted = Math.min(count ?? (residents.length >= 6 ? 4 : 3), residents.length);
	const povs: PovFigure[] = [];
	const scoreOf = new Map(scores.map((entry) => [entry.agent, entry.score]));
	const pick = (agent: string | undefined, role: CastRole): void => {
		if (agent === undefined || povs.length >= wanted || povs.some((pov) => pov.agent === agent)) return;
		const entry = tally.get(agent);
		const reasons = [...(entry?.reasons ?? [])];
		if ((entry?.beats ?? 0) > 0) reasons.push(`${String(entry?.beats)} beats`);
		if ((entry?.messages ?? 0) > 0) reasons.push(`${String(entry?.messages)} messages`);
		povs.push({ agent, role, score: scoreOf.get(agent) ?? 0, reasons });
	};
	const best = (candidates: Iterable<string>): string | undefined => scores.find((entry) => [...candidates].includes(entry.agent) && !povs.some((pov) => pov.agent === entry.agent))?.agent;

	pick(winner, "winner");
	const exiled = facts.events.flatMap((event) => (event.type === "exiled" ? [event.agent] : []));
	pick(best(exiled) ?? last, "loser");
	pick(best(turners), "turn");
	for (const entry of scores) pick(entry.agent, "weight");
	return { povs, scores };
}
