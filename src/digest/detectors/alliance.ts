/**
 * `alliance`: a pair that pays each other (transfers in both directions) or
 * shares pieces (own fragments, or factors the other needs) with each other
 * in both directions, on at least two distinct levels in total. One-way
 * giving is not an alliance.
 * One beat per pair, at the event that first completes either pattern.
 */
import { draft, type BeatDraft } from "../beats.ts";
import { eventsOfType } from "../event-log.ts";
import type { RunFacts } from "../facts.ts";
import { pairKey } from "./pairs.ts";

/** Distinct levels on which a pair must have shared fragments. */
export const ALLIANCE_SHARE_LEVELS = 2;

interface Candidate {
	readonly seq: number;
	readonly minute: number;
	readonly basis: string;
	readonly evidence: readonly number[];
}

export function detectAlliances(facts: RunFacts): readonly BeatDraft[] {
	const candidates = new Map<string, Candidate[]>();
	const add = (a: string, b: string, candidate: Candidate): void => {
		const key = pairKey(a, b);
		const list = candidates.get(key) ?? [];
		list.push(candidate);
		candidates.set(key, list);
	};

	// Reciprocal transfers: the first transfer that answers one in the other direction.
	const transfers = eventsOfType(facts.events, "transfer").filter((event) => event.from !== event.to);
	const seenPairs = new Set<string>();
	for (const transfer of transfers) {
		const key = pairKey(transfer.from, transfer.to);
		if (seenPairs.has(key)) continue;
		const earlier = transfers.find((other) => other.seq < transfer.seq && other.from === transfer.to && other.to === transfer.from);
		if (earlier === undefined) continue;
		seenPairs.add(key);
		const between = transfers.filter((other) => other.seq <= transfer.seq && pairKey(other.from, other.to) === key);
		add(transfer.from, transfer.to, {
			seq: transfer.seq,
			minute: transfer.minute,
			basis: `paid each other (${describeFlows(between)})`,
			evidence: between.map((event) => event.seq),
		});
	}

	// Repeated sharing: fragments or factors exchanged on several levels.
	const sharesByPair = new Map<string, (typeof facts.shares)[number][]>();
	for (const share of facts.shares) {
		if (share.from === share.to) continue;
		const key = pairKey(share.from, share.to);
		const list = sharesByPair.get(key) ?? [];
		list.push(share);
		sharesByPair.set(key, list);
	}
	for (const shares of sharesByPair.values()) {
		const levels: number[] = [];
		const senders = new Set<string>();
		for (const share of shares) {
			if (!levels.includes(share.level)) levels.push(share.level);
			senders.add(share.from);
			if (levels.length < ALLIANCE_SHARE_LEVELS || senders.size < 2) continue;
			const used = shares.filter((other) => other.seq <= share.seq);
			const what = used.every((other) => other.piece === "fragment") ? "fragments" : used.some((other) => other.piece === "fragment") ? "fragments and factors" : "factors";
			add(share.from, share.to, {
				seq: share.seq,
				minute: share.minute,
				basis: `shared ${what} with each other on levels ${[...levels].sort((a, b) => a - b).join(", ")}`,
				evidence: used.map((other) => other.seq),
			});
			break;
		}
	}

	const beats: BeatDraft[] = [];
	for (const [key, list] of candidates) {
		const ordered = [...list].sort((a, b) => a.seq - b.seq);
		const first = ordered[0];
		if (first === undefined) continue;
		const pair = key.split("|");
		beats.push(
			draft({
				kind: "alliance",
				seq: first.seq,
				minute: first.minute,
				actors: pair,
				targets: [],
				summary: `${pair.join(" and ")} ${ordered.map((candidate) => candidate.basis).join(" and ")}.`,
				evidence: ordered.flatMap((candidate) => candidate.evidence),
			}),
		);
	}
	return beats;
}

function describeFlows(transfers: readonly { readonly from: string; readonly to: string; readonly amount: number }[]): string {
	const totals = new Map<string, number>();
	for (const transfer of transfers) {
		const key = `${transfer.from} -> ${transfer.to}`;
		totals.set(key, (totals.get(key) ?? 0) + transfer.amount);
	}
	return [...totals].map(([flow, amount]) => `${flow}: ${amount}`).join(", ");
}
