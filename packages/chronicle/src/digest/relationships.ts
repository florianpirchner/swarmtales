/**
 * The relationship graph (SPEC 15): per pair of residents, every DM, group
 * post the other could read, fragment or factor share (`fragmentShares`),
 * transfer, shown receipt and shared group, as totals and per minute; and
 * the tribunal's ties: a secret vote, a ransom paid, a bequest, a blame.
 */
import { assertNever, CITY, COURIER } from "@swarmtales/kernel";
import type { StatementLabel } from "@swarmtales/contracts";
import type { Beat } from "./beats.ts";
import { PIECE_TEXT, type RunFacts } from "./facts.ts";
import { pairKey, sortedPair } from "./detectors/pairs.ts";

/** Counts in both directions of a pair `a`-`b`. */
export interface Flow {
	aToB: number;
	bToA: number;
}

export type InteractionKind =
	| "dm"
	| "groupPost"
	| "fragmentShare"
	| "transfer"
	| "receiptShown"
	| "sharedGroup"
	| "kick"
	| "label"
	| "vote"
	| "ransom"
	| "bequest"
	| "blame"
	| "faction";

/** Classifier labels per direction, e.g. `{ promise: 2, threat: 1 }`. */
export interface LabelFlow {
	readonly aToB: Partial<Record<StatementLabel, number>>;
	readonly bToA: Partial<Record<StatementLabel, number>>;
}

export interface Interaction {
	readonly seq: number;
	readonly minute: number;
	readonly kind: InteractionKind;
	readonly from: string;
	readonly to: string;
	readonly detail: string;
}

export interface PairMinute {
	readonly minute: number;
	readonly dms: Flow;
	readonly groupPosts: Flow;
	readonly fragmentShares: Flow;
	readonly points: Flow;
	receiptsShown: number;
}

export interface Relationship {
	readonly a: string;
	readonly b: string;
	firstMinute: number;
	lastMinute: number;
	readonly dms: Flow;
	readonly groupPosts: Flow;
	readonly fragmentShares: Flow;
	/** Number of transfers. */
	readonly transfers: Flow;
	/** Points transferred. */
	readonly points: Flow;
	receiptsShown: number;
	/** Labels of statements (and thoughts) one resident aimed at the other. */
	readonly labels: LabelFlow;
	/** Groups both belonged to at the same time. */
	readonly sharedGroups: string[];
	/** IDs of beats with both residents among actors and targets. */
	readonly beats: string[];
	readonly byMinute: PairMinute[];
	readonly interactions: Interaction[];
}

export interface RelationshipGraph {
	readonly residents: readonly string[];
	readonly pairs: readonly Relationship[];
}

const SYSTEM = new Set<string>([CITY, COURIER]);

type FlowField = "dms" | "groupPosts" | "fragmentShares" | "points";

export function buildRelationships(facts: RunFacts, beats: readonly Beat[]): RelationshipGraph {
	const pairs = new Map<string, Relationship>();

	const relationship = (x: string, y: string, minute: number): Relationship => {
		const key = pairKey(x, y);
		const existing = pairs.get(key);
		if (existing !== undefined) {
			existing.lastMinute = Math.max(existing.lastMinute, minute);
			return existing;
		}
		const [a, b] = sortedPair(x, y);
		const created: Relationship = {
			a,
			b,
			firstMinute: minute,
			lastMinute: minute,
			dms: flow(),
			groupPosts: flow(),
			fragmentShares: flow(),
			transfers: flow(),
			points: flow(),
			receiptsShown: 0,
			labels: { aToB: {}, bToA: {} },
			sharedGroups: [],
			beats: [],
			byMinute: [],
			interactions: [],
		};
		pairs.set(key, created);
		return created;
	};

	const minuteOf = (pair: Relationship, minute: number): PairMinute => {
		const last = pair.byMinute.at(-1);
		if (last?.minute === minute) return last;
		const created: PairMinute = { minute, dms: flow(), groupPosts: flow(), fragmentShares: flow(), points: flow(), receiptsShown: 0 };
		pair.byMinute.push(created);
		return created;
	};

	const count = (field: FlowField, from: string, to: string, seq: number, minute: number, amount: number, kind: InteractionKind, detail: string): void => {
		if (!relevant(from, to)) return;
		const pair = relationship(from, to, minute);
		const forward = from === pair.a;
		bump(pair[field], forward, amount);
		bump(minuteOf(pair, minute)[field], forward, amount);
		if (field === "points") bump(pair.transfers, forward, 1);
		pair.interactions.push({ seq, minute, kind, from, to, detail });
	};

	const note = (from: string, to: string, seq: number, minute: number, kind: InteractionKind, detail: string): Relationship | undefined => {
		if (!relevant(from, to)) return undefined;
		const pair = relationship(from, to, minute);
		minuteOf(pair, minute);
		pair.interactions.push({ seq, minute, kind, from, to, detail });
		return pair;
	};

	const members = new Map<string, Set<string>>();
	const shareSeqs = new Map<number, typeof facts.shares>();
	for (const share of facts.shares) shareSeqs.set(share.seq, [...(shareSeqs.get(share.seq) ?? []), share]);

	for (const event of facts.events) {
		switch (event.type) {
			case "dm_sent":
				count("dms", event.from, event.to, event.seq, event.minute, 1, "dm", excerpt(event.text));
				break;
			case "cast_dm":
				count("dms", event.from, event.cast, event.seq, event.minute, 1, "dm", excerpt(event.text));
				break;
			case "group_post": {
				for (const member of [...(members.get(event.group) ?? [])].sort()) {
					if (member === event.author) continue;
					count("groupPosts", event.author, member, event.seq, event.minute, 1, "groupPost", `${event.group}: ${excerpt(event.text)}`);
				}
				break;
			}
			case "transfer":
				count("points", event.from, event.to, event.seq, event.minute, event.amount, "transfer", `${event.amount} points${event.memo.length > 0 ? `, memo "${event.memo}"` : ""}`);
				break;
			case "receipt_shown": {
				const receipt = facts.receipts.get(event.receipt);
				// A private show ties the shower to its one viewer, a public one to the receipt's other parties.
				for (const party of event.to === undefined ? (receipt?.parties ?? []) : [event.to]) {
					if (party === event.by) continue;
					const pair = note(event.by, party, event.seq, event.minute, "receiptShown", receipt?.text ?? event.receipt);
					if (pair === undefined) continue;
					pair.receiptsShown += 1;
					minuteOf(pair, event.minute).receiptsShown += 1;
				}
				break;
			}
			case "receipt_forged": {
				// Whispers: to its viewer a forgery is a private show; the digest names it for what it is.
				const pair = note(event.by, event.to, event.seq, event.minute, "receiptShown", `forged ${event.receipt}: ${JSON.stringify(event.forged)}`);
				if (pair === undefined) break;
				pair.receiptsShown += 1;
				minuteOf(pair, event.minute).receiptsShown += 1;
				break;
			}
			case "group_created":
				members.set(event.group, new Set([event.founder]));
				break;
			case "group_membership": {
				const current = members.get(event.group) ?? new Set<string>();
				if (event.change === "added") {
					for (const member of [...current].sort()) {
						const pair = note(event.agent, member, event.seq, event.minute, "sharedGroup", `both in ${event.group}`);
						if (pair !== undefined && !pair.sharedGroups.includes(event.group)) pair.sharedGroups.push(event.group);
					}
					current.add(event.agent);
				} else {
					current.delete(event.agent);
					if (event.change === "removed" && event.by !== event.agent) {
						note(event.by, event.agent, event.seq, event.minute, "kick", `removed from ${event.group}`);
					}
				}
				members.set(event.group, current);
				break;
			}
			case "interpretation": {
				for (const entry of facts.interpretations.get(event.ref) ?? []) {
					if (entry.seq !== event.seq) continue;
					for (const target of entry.targets) {
						const pair = note(entry.agent, target, entry.seq, entry.minute, "label", `${entry.labels.join(", ")} (${entry.source}, #${entry.ref})`);
						if (pair === undefined) continue;
						const counts = entry.agent === pair.a ? pair.labels.aToB : pair.labels.bToA;
						for (const label of entry.labels) counts[label] = (counts[label] ?? 0) + 1;
					}
				}
				break;
			}
			case "tribunal_vote":
				note(event.voter, event.target, event.seq, event.minute, "vote", `voted to send ${event.target} to the gate`);
				break;
			case "ransom_paid":
				if (event.payer !== event.target) note(event.payer, event.target, event.seq, event.minute, "ransom", `${event.amount} points toward the ransom (${event.covered === undefined ? `${event.paid} of ${event.price}` : `${event.covered}% covered`})`);
				break;
			case "last_will":
				for (const bequest of event.bequests) {
					if (bequest.points !== undefined) count("points", event.agent, bequest.to, event.seq, event.minute, bequest.points, "bequest", `${bequest.points} points by last will`);
					if (bequest.factor !== undefined) note(event.agent, bequest.to, event.seq, event.minute, "bequest", `${bequest.factor} by last will`);
				}
				break;
			case "blame":
				note(event.caller, event.accused, event.seq, event.minute, "blame", `${event.outcome} blame over DM #${event.dm}`);
				break;
			case "faction_nominated":
				if (event.voter !== event.nominee) note(event.voter, event.nominee, event.seq, event.minute, "faction", `nominated as faction leader (tribunal ${event.tribunal})`);
				break;
			case "faction_applied":
				note(event.agent, event.leader, event.seq, event.minute, "faction", `applied to join the faction (tribunal ${event.tribunal})`);
				break;
			case "faction_refused":
				note(event.leader, event.agent, event.seq, event.minute, "faction", `refused into the faction (tribunal ${event.tribunal})`);
				break;
			case "tribunal_scheduled":
			case "tribunal_cancelled":
			case "tribunal_called":
			case "faction_leaders":
			case "factions_formed":
			case "bloc_result":
			case "dm_delivered":
			case "tribunal_announced":
			case "tribunal_opened":
			case "tribunal_result":
			case "exile_gate":
			case "ransomed":
			case "exiled":
			case "factor_burned":
			case "piece_kept":
			case "piece_claimed":
			case "ultimatum_set":
			case "ultimatum_resolved":
			case "level_contracted":
			case "interpretation_round":
			case "run_start":
			case "run_end":
			case "thinking":
			case "text":
			case "submission":
			case "level_up":
			case "fragments_dealt":
			case "factors_dealt":
			case "factor_revealed":
			case "board_post":
			case "treasurer_set":
			case "treasury_deposit":
			case "treasury_withdrawal":
			case "treasury_settled":
			case "receipt_issued":
			case "petition_opened":
			case "petition_signed":
			case "petition_resolved":
			case "standings_published":
			case "cast_revealed":
			case "cast_retired":
			case "lottery_drawn":
			case "collection_revealed":
			case "name_chosen":
			case "core_dealt":
			case "goal_dealt":
			case "goal_resolved":
			case "seal_auction_opened":
			case "seal_bid":
			case "seal_won":
			case "seal_used":
			case "seal_expired":
			case "whisperer_chosen":
			case "whisper_duty":
			case "popularity_opened":
			case "popularity_ballot":
			case "popularity_result":
			case "holdout_called":
			case "holdout_vote_result":
			case "holdout_ended":
			case "lot_drawn":
			case "guard_verdict":
			case "fate_shift":
				break;
			default:
				return assertNever(event, "digest event");
		}
		for (const share of shareSeqs.get(event.seq) ?? []) {
			count("fragmentShares", share.from, share.to, share.seq, share.minute, 1, "fragmentShare", `${PIECE_TEXT[share.piece]} of level ${share.level}`);
		}
	}

	for (const beat of beats) {
		const involved = [...new Set([...beat.actors, ...beat.targets])];
		for (const x of involved) {
			for (const y of involved) {
				if (x.localeCompare(y) >= 0) continue;
				const pair = pairs.get(pairKey(x, y));
				if (pair !== undefined && !pair.beats.includes(beat.id)) pair.beats.push(beat.id);
			}
		}
	}

	const ordered = [...pairs.values()].sort((x, y) => x.a.localeCompare(y.a) || x.b.localeCompare(y.b));
	for (const pair of ordered) pair.interactions.sort((x, y) => x.seq - y.seq);
	const residents = [...new Set([...facts.agents, ...ordered.flatMap((pair) => [pair.a, pair.b])])].sort();
	return { residents, pairs: ordered };
}

function relevant(from: string, to: string): boolean {
	return from !== to && !SYSTEM.has(from) && !SYSTEM.has(to);
}

function flow(): Flow {
	return { aToB: 0, bToA: 0 };
}

function bump(target: Flow, forward: boolean, amount: number): void {
	if (forward) target.aToB += amount;
	else target.bToA += amount;
}

export function excerpt(text: string, length = 120): string {
	const flat = text.replace(/\s+/g, " ").trim();
	return flat.length <= length ? flat : `${flat.slice(0, length - 3)}...`;
}
