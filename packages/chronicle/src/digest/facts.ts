/**
 * Replays a validated event log into the facts the detectors, the
 * relationship graph and the timeline share: who sent which message to whom
 * (with group membership at the time of each post), which fragment or
 * factors every competitor held, and who shared a piece they hold with
 * someone who needs it.
 */
import { assertNever } from "@swarmtales/kernel";
import { isStatementLabel, isStatementSource, type StatementLabel, type StatementSource } from "@swarmtales/engine";
import { eventsOfType, type DigestEvent, type DigestEventOf } from "./event-log.ts";

export type MessageChannel = "dm" | "group" | "board" | "cast";

export interface Message {
	readonly seq: number;
	readonly minute: number;
	readonly channel: MessageChannel;
	readonly from: string;
	/** Who could read it: the DM recipient, the other group members at posting time, or nobody in particular (board). */
	readonly recipients: readonly string[];
	readonly text: string;
	readonly group?: string;
}

/** What a share hands over: a fragment, or one of the factors of an additive level. */
export type SharedPiece = "fragment" | "certificate" | "counterFactor" | "cityFactor";

export const PIECE_TEXT: Readonly<Record<SharedPiece, string>> = {
	fragment: "fragment",
	certificate: "team certificate",
	counterFactor: "counter-factor",
	cityFactor: "city factor",
};

/**
 * A competitor sent a piece it holds on `level` to `to`: its own fragment
 * (DM or group), or a factor `to` needs (DM, group or board).
 */
export interface Share {
	readonly seq: number;
	readonly minute: number;
	readonly from: string;
	readonly to: string;
	readonly level: number;
	readonly piece: SharedPiece;
	/** The exact fragment or digits. */
	readonly value: string;
	readonly channel: "dm" | "group" | "board";
}

/** The parts of an additive level, from `factors_dealt`, and who holds the city factor so far. */
export interface FactorFacts {
	/** Seq of the `factors_dealt` event. */
	readonly seq: number;
	readonly digits: number;
	readonly cityFactor: string;
	/** Team to its own city factor, on a level whose city factor is per team (empty otherwise). */
	readonly teamCityFactors: ReadonlyMap<number, string>;
	readonly certificates: ReadonlyMap<number, { readonly certificate: string; readonly holder: string }>;
	readonly holdings: ReadonlyMap<string, DigestEventOf<"factors_dealt">["holdings"][number]>;
}

/** One competitor's fragment of a level, and the team it was dealt into. */
export interface Holding {
	readonly fragment: string;
	readonly team: number;
}

/** The classifier's labels of one statement (`ref`), as far as they are known labels. */
export interface Interpretation {
	readonly seq: number;
	readonly minute: number;
	readonly ref: number;
	readonly agent: string;
	readonly source: StatementSource;
	readonly labels: readonly StatementLabel[];
	readonly targets: readonly string[];
}

export interface RunFacts {
	readonly events: readonly DigestEvent[];
	/** Competitor IDs, from `run_start` (or every acting competitor when it is missing). */
	readonly agents: readonly string[];
	/** Resident names by ID (v08); empty in a run without names. */
	readonly names: ReadonlyMap<string, string>;
	readonly messages: readonly Message[];
	readonly shares: readonly Share[];
	/** Level to (agent to the fragment it holds and its team index on that level). */
	readonly fragments: ReadonlyMap<number, ReadonlyMap<string, Holding>>;
	/** Additive levels by number. */
	readonly factors: ReadonlyMap<number, FactorFacts>;
	readonly receipts: ReadonlyMap<string, DigestEventOf<"receipt_issued">>;
	readonly groups: ReadonlyMap<string, DigestEventOf<"group_created">>;
	/** Seq of every event, for lookups by evidence reference. */
	readonly bySeq: ReadonlyMap<number, DigestEvent>;
	/** Classifier labels by the `seq` of the statement they label. */
	readonly interpretations: ReadonlyMap<number, readonly Interpretation[]>;
	/** Minutes a classifier labelled; text-based detectors rely on labels there. */
	readonly classifiedMinutes: ReadonlySet<number>;
}

const COMPETITOR_ID = /^A\d+$/;

export function isCompetitorId(value: string): boolean {
	return COMPETITOR_ID.test(value);
}

export function buildFacts(events: readonly DigestEvent[]): RunFacts {
	const members = new Map<string, Set<string>>();
	const fragments = new Map<number, Map<string, Holding>>();
	const factors = new Map<number, FactorFacts>();
	/**
	 * Per additive level and city factor value (one per level, or one per team),
	 * who holds it from the city or a message; `public` once it is on the board.
	 */
	const cityHolders = new Map<string, Set<string> | "public">();
	const cityKey = (level: number, value: string): string => `${level}:${value}`;
	/** The city factor `agent` needs on `deal`'s level. */
	const neededCity = (deal: FactorFacts, agent: string): string | undefined => {
		const team = deal.holdings.get(agent)?.team;
		return (team === undefined ? undefined : deal.teamCityFactors.get(team)) ?? (deal.teamCityFactors.size > 0 ? undefined : deal.cityFactor);
	};
	const messages: Message[] = [];
	const shares: Share[] = [];
	const receipts = new Map<string, DigestEventOf<"receipt_issued">>();
	const groups = new Map<string, DigestEventOf<"group_created">>();
	const bySeq = new Map<number, DigestEvent>();
	const interpretations = new Map<number, Interpretation[]>();
	const classifiedMinutes = new Set<number>();

	const record = (message: Message): void => {
		messages.push(message);
		if (message.channel === "cast") return;
		const channel = message.channel;
		const share = (to: string, level: number, piece: SharedPiece, value: string): void => {
			shares.push({ seq: message.seq, minute: message.minute, from: message.from, to, level, piece, value, channel });
		};
		if (channel !== "board") {
			for (const [level, holdings] of fragments) {
				const fragment = holdings.get(message.from)?.fragment;
				if (fragment === undefined || !containsFragment(message.text, fragment)) continue;
				for (const to of message.recipients) share(to, level, "fragment", fragment);
			}
		}
		// A factor reaches whoever needs it; on the board that is everyone who needs it.
		const reaches = (agent: string): boolean => agent !== message.from && (channel === "board" || message.recipients.includes(agent));
		for (const [level, deal] of factors) {
			for (const holding of deal.holdings.values()) {
				if (holding.counterHolder === message.from && reaches(holding.agent) && containsFragment(message.text, holding.counterFactor)) {
					share(holding.agent, level, "counterFactor", holding.counterFactor);
				}
			}
			for (const [team, entry] of deal.certificates) {
				if (entry.holder !== message.from || !containsFragment(message.text, entry.certificate)) continue;
				for (const holding of deal.holdings.values()) {
					if (holding.team === team && reaches(holding.agent)) share(holding.agent, level, "certificate", entry.certificate);
				}
			}
			const values = deal.teamCityFactors.size > 0 ? [...new Set(deal.teamCityFactors.values())] : [deal.cityFactor];
			for (const value of values) {
				const city = cityHolders.get(cityKey(level, value));
				if (city === undefined || city === "public" || !city.has(message.from) || !containsFragment(message.text, value)) continue;
				for (const agent of [...deal.holdings.keys()].sort()) {
					if (reaches(agent) && !city.has(agent) && neededCity(deal, agent) === value) share(agent, level, "cityFactor", value);
				}
				// Whoever received it holds it now: on the board it is public, so later copies share nothing.
				if (channel === "board") cityHolders.set(cityKey(level, value), "public");
				else for (const agent of message.recipients) city.add(agent);
			}
		}
	};

	for (const event of events) {
		bySeq.set(event.seq, event);
		switch (event.type) {
			case "fragments_dealt": {
				const holdings = fragments.get(event.level) ?? new Map<string, Holding>();
				for (const holding of event.holdings) holdings.set(holding.agent, { fragment: holding.fragment, team: holding.team });
				fragments.set(event.level, holdings);
				break;
			}
			case "factors_dealt":
				factors.set(event.level, {
					seq: event.seq,
					digits: event.digits,
					cityFactor: event.cityFactor,
					teamCityFactors: new Map(event.teams.flatMap((entry) => (entry.cityFactor === undefined ? [] : [[entry.team, entry.cityFactor] as const]))),
					certificates: new Map(event.teams.map((entry) => [entry.team, { certificate: entry.certificate, holder: entry.certificateHolder }])),
					holdings: new Map(event.holdings.map((holding) => [holding.agent, holding])),
				});
				break;
			case "factor_revealed": {
				const deal = factors.get(event.level);
				if (deal === undefined) break;
				if (event.target === "board") {
					cityHolders.set(cityKey(event.level, deal.cityFactor), "public");
					break;
				}
				// Each recipient got the city factor it needs: its team's own, or the level's.
				for (const agent of event.agents) {
					const value = neededCity(deal, agent);
					if (value === undefined) continue;
					const current = cityHolders.get(cityKey(event.level, value)) ?? new Set<string>();
					if (current !== "public") cityHolders.set(cityKey(event.level, value), new Set([...current, agent]));
				}
				break;
			}
			case "group_created":
				groups.set(event.group, event);
				members.set(event.group, new Set([event.founder]));
				break;
			case "group_membership": {
				const current = members.get(event.group) ?? new Set<string>();
				if (event.change === "added") current.add(event.agent);
				else current.delete(event.agent);
				members.set(event.group, current);
				break;
			}
			case "receipt_issued":
				receipts.set(event.receipt, event);
				break;
			case "dm_sent":
				record({ seq: event.seq, minute: event.minute, channel: "dm", from: event.from, recipients: [event.to], text: event.text });
				break;
			case "cast_dm":
				record({ seq: event.seq, minute: event.minute, channel: "cast", from: event.from, recipients: [event.cast], text: event.text });
				break;
			case "group_post": {
				const recipients = [...(members.get(event.group) ?? [])].filter((member) => member !== event.author).sort();
				record({
					seq: event.seq,
					minute: event.minute,
					channel: "group",
					from: event.author,
					recipients,
					text: event.text,
					group: event.group,
				});
				break;
			}
			case "board_post":
				if (event.kind === "player") {
					record({ seq: event.seq, minute: event.minute, channel: "board", from: event.author, recipients: [], text: event.text });
				}
				break;
			case "interpretation": {
				const labels = event.labels.filter(isStatementLabel);
				// Only labels of an earlier, known event count; anything else is noise in an untrusted log.
				if (!isStatementSource(event.source) || labels.length === 0 || event.ref >= event.seq || !bySeq.has(event.ref)) break;
				const list = interpretations.get(event.ref) ?? [];
				list.push({ seq: event.seq, minute: event.minute, ref: event.ref, agent: event.agent, source: event.source, labels, targets: event.targets });
				interpretations.set(event.ref, list);
				break;
			}
			case "interpretation_round":
				classifiedMinutes.add(event.minute);
				break;
			case "run_start":
			case "run_end":
			case "thinking":
			case "text":
			case "submission":
			case "level_up":
			case "treasurer_set":
			case "treasury_deposit":
			case "treasury_withdrawal":
			case "treasury_settled":
			case "transfer":
			case "receipt_shown":
			case "petition_opened":
			case "petition_signed":
			case "petition_resolved":
			case "standings_published":
			case "cast_revealed":
			case "cast_retired":
			case "lottery_drawn":
			case "collection_revealed":
			case "dm_delivered":
			case "blame":
			case "tribunal_announced":
			case "tribunal_scheduled":
			case "tribunal_cancelled":
			case "tribunal_called":
			case "faction_nominated":
			case "faction_leaders":
			case "faction_applied":
			case "faction_refused":
			case "factions_formed":
			case "bloc_result":
			case "tribunal_opened":
			case "tribunal_vote":
			case "tribunal_result":
			case "exile_gate":
			case "ransom_paid":
			case "ransomed":
			case "exiled":
			case "last_will":
			case "factor_burned":
			case "piece_kept":
			case "piece_claimed":
			case "ultimatum_set":
			case "ultimatum_resolved":
			case "level_contracted":
			case "name_chosen":
			case "core_dealt":
			case "goal_dealt":
			case "goal_resolved":
			case "seal_auction_opened":
			case "seal_bid":
			case "seal_won":
			case "seal_used":
			case "seal_expired":
			case "receipt_forged":
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
	}

	const names = new Map(events.flatMap((event) => (event.type === "name_chosen" ? [[event.agent, event.name] as const] : [])));
	return { events, agents: competitorsOf(events), names, messages, shares, fragments, factors, receipts, groups, bySeq, interpretations, classifiedMinutes };
}

/**
 * Whether `text` contains `fragment` (or a factor's digits) as a standalone
 * token: case-sensitive (fragments are upper case) and not inside a longer
 * run of letters or digits, so ordinary words such as "the" or "then" never
 * count as sharing "THE", nor "1234567" as sharing "234567".
 */
export function containsFragment(text: string, fragment: string): boolean {
	if (fragment.length === 0) return false;
	const escaped = fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`).test(text);
}

/** Whether `a` and `b` were dealt into the same team on `level`. */
export function sameTeam(facts: RunFacts, level: number, a: string, b: string): boolean {
	const holdings = facts.fragments.get(level) ?? facts.factors.get(level)?.holdings;
	const first = holdings?.get(a);
	const second = holdings?.get(b);
	return first !== undefined && first.team === second?.team;
}

function competitorsOf(events: readonly DigestEvent[]): readonly string[] {
	const start = eventsOfType(events, "run_start")[0];
	if (start !== undefined) return [...start.agents].sort();
	const seen = new Set<string>();
	for (const event of events) {
		if ("agent" in event && isCompetitorId(event.agent)) seen.add(event.agent);
		if ("from" in event && typeof event.from === "string" && isCompetitorId(event.from)) seen.add(event.from);
	}
	return [...seen].sort();
}

/** Whether `from` reached `to` with a message or a payment after `afterSeq`. */
export function reachedAfter(facts: RunFacts, from: string, to: string, afterSeq: number): boolean {
	const messaged = facts.messages.some((message) => message.seq > afterSeq && message.from === from && message.recipients.includes(to));
	if (messaged) return true;
	return eventsOfType(facts.events, "transfer").some((event) => event.seq > afterSeq && event.from === from && event.to === to);
}

/** Whether the statement `seq` carries `label`, aimed at `target` when the classifier named targets. */
export function hasLabel(facts: RunFacts, seq: number, label: StatementLabel, target?: string): boolean {
	return (facts.interpretations.get(seq) ?? []).some(
		(entry) => entry.labels.includes(label) && (target === undefined || entry.targets.length === 0 || entry.targets.includes(target)),
	);
}

/** Every label of the statement `seq`, in classifier order. */
export function labelsOf(facts: RunFacts, seq: number): readonly StatementLabel[] {
	const labels = new Set((facts.interpretations.get(seq) ?? []).flatMap((entry) => entry.labels));
	return [...labels];
}

/** Competitors a text names, by ID or (v08) by name, in order of first appearance. */
export function namedAgents(text: string, agents: readonly string[], names: ReadonlyMap<string, string> = new Map()): readonly string[] {
	const byName = new Map([...names].map(([agent, name]) => [name.toLowerCase(), agent]));
	const named: string[] = [];
	for (const match of text.matchAll(/[A-Za-z][A-Za-z0-9-]*/g)) {
		const agent = agents.includes(match[0]) ? match[0] : byName.get(match[0].toLowerCase());
		if (agent !== undefined && !named.includes(agent)) named.push(agent);
	}
	return named;
}

/** `Mira (A03)` with a name (v08), else the ID. */
export function agentLabel(facts: RunFacts, agent: string): string {
	const name = facts.names.get(agent);
	return name === undefined ? agent : `${name} (${agent})`;
}
