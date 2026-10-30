/**
 * `digest/timeline.md`: the run as readable English, grouped by act and
 * minute. Every line cites the `seq` of its event; beats appear right after
 * the event that completed them.
 */
import { assertNever } from "../core/result.ts";
import type { ActMap } from "./acts.ts";
import type { Beat } from "./beats.ts";
import { eventsOfType, type DigestEvent, type DigestEventOf } from "./event-log.ts";
import { isPrivateSource, LABEL_TEXT } from "../interpret/labels.ts";
import { agentLabel, labelsOf, type RunFacts } from "./facts.ts";
import { excerpt } from "./relationships.ts";

export interface TimelineHeader {
	readonly run: string;
	readonly storyTitle?: string;
}

export function renderTimeline(header: TimelineHeader, facts: RunFacts, acts: ActMap, beats: readonly Beat[]): string {
	const lines: string[] = [`# Timeline of ${header.run}`, ""];
	if (header.storyTitle !== undefined) lines.push(`Story: ${header.storyTitle}`, "");
	lines.push(
		`Competitors: ${facts.agents.length > 0 ? facts.agents.map((agent) => agentLabel(facts, agent)).join(", ") : "none"}. Beats found: ${beats.length}.`,
		"",
		...endLine(facts),
		"Every line cites the `#seq` of its event in `events.jsonl`. Private messages are shown in full detail",
		"because the digest is written for the audience, not for the competitors.",
		"",
		...characterTables(facts),
	);

	const beatsAt = new Map<number, Beat[]>();
	for (const beat of beats) beatsAt.set(beat.seq, [...(beatsAt.get(beat.seq) ?? []), beat]);

	const minutes = new Map<number, string[]>();
	for (const event of facts.events) {
		const line = describe(event, facts);
		const attached = beatsAt.get(event.seq) ?? [];
		if (line === undefined && attached.length === 0) continue;
		const entries = minutes.get(event.minute) ?? [];
		if (line !== undefined) entries.push(`- \`#${event.seq}\` ${line}`);
		for (const beat of attached) entries.push(`- **${beat.id} ${beat.kind}:** ${beat.summary} Evidence: ${cite(beat.evidence)}.`);
		minutes.set(event.minute, entries);
	}
	// Beats anchored at an event the timeline does not show (e.g. a narrative beat) still need a place.
	for (const beat of beats) {
		if (facts.bySeq.has(beat.seq)) continue;
		const entries = minutes.get(beat.minute) ?? [];
		entries.push(`- **${beat.id} ${beat.kind}:** ${beat.summary} Evidence: ${cite(beat.evidence)}.`);
		minutes.set(beat.minute, entries);
	}

	for (const span of acts.spans) {
		const inAct = [...minutes.keys()].filter((minute) => minute >= span.fromMinute && minute <= span.toMinute).sort((a, b) => a - b);
		lines.push(`## ${span.title} (minutes ${span.fromMinute}-${span.toMinute})`, "");
		const actBeats = beats.filter((beat) => beat.act === span.title);
		if (actBeats.length > 0) {
			lines.push("Beats in this act:", "");
			for (const beat of actBeats) lines.push(`- ${beat.id} ${beat.kind} (minute ${beat.minute}): ${beat.summary}`);
			lines.push("");
		}
		if (inAct.length === 0) lines.push("Nothing happened in this act.", "");
		for (const minute of inAct) {
			lines.push(`### Minute ${minute}`, "", ...(minutes.get(minute) ?? []), "");
		}
	}
	return `${lines.join("\n").trimEnd()}\n`;
}

/** The Cores and Goals tables (v09): who each resident is and what it secretly wanted; nothing without them. */
function characterTables(facts: RunFacts): readonly string[] {
	const words: Readonly<Record<string, string>> = { aboveAll: "above all", clearly: "clearly", atTimes: "at times" };
	const cores = eventsOfType(facts.events, "core_dealt");
	const goals = eventsOfType(facts.events, "goal_dealt");
	const resolved = eventsOfType(facts.events, "goal_resolved");
	const lines: string[] = [];
	if (cores.length > 0) {
		lines.push("## Cores", "", "| Resident | Drives | Temperament |", "|---|---|---|");
		for (const core of cores) {
			const list = core.drives.map((entry) => `${words[entry.intensity] ?? entry.intensity} ${entry.drive}`).join("; ");
			const drives = core.figure === undefined ? list : `${core.figure}: ${list}`;
			lines.push(`| ${agentLabel(facts, core.agent)} | ${drives} | ${core.bigFive.map((trait) => `${trait.axis} ${trait.level}`).join(", ")} |`);
		}
		lines.push("");
	}
	if (goals.length > 0) {
		lines.push("## Goals", "", "| Resident | Act | Goal | Outcome |", "|---|---:|---|---|");
		for (const goal of goals) {
			const end = resolved.find((entry) => entry.agent === goal.agent && entry.act === goal.act);
			const outcome = end === undefined ? "open" : end.void === true ? "void" : end.fulfilled ? `fulfilled (+${end.bonus})` : "missed";
			lines.push(`| ${agentLabel(facts, goal.agent)} | ${goal.act} | ${goal.text} | ${outcome} |`);
		}
		lines.push("");
	}
	return lines;
}

export function cite(seqs: readonly number[]): string {
	return seqs.length === 0 ? "none" : seqs.map((seq) => `#${seq}`).join(", ");
}

function points(amount: number): string {
	return `${amount} ${amount === 1 ? "point" : "points"}`;
}

/** ` [promise, threat]` for a labelled message, empty otherwise. */
function tags(facts: RunFacts, seq: number): string {
	const labels = labelsOf(facts, seq);
	return labels.length === 0 ? "" : ` [${labels.map((label) => LABEL_TEXT[label]).join(", ")}]`;
}

/** `popularity round 3`, or the single surprise vote of logs before rounds. */
/** How a holdout tribunal ended (Whispers v3). */
function holdoutEnded(tribunal: number, outcome: "dropped" | "banished" | "lot" | "spared", struck: string | undefined): string {
	switch (outcome) {
		case "dropped":
			return `Holdout tribunal ${tribunal} was dropped: everyone has the fragment now.`;
		case "spared":
			return `Holdout tribunal ${tribunal} ended with nobody struck (the lot had struck at this door before).`;
		case "banished":
			return `Holdout tribunal ${tribunal}: ${struck ?? "the accused"} was banished by the vote.`;
		case "lot":
			return `Holdout tribunal ${tribunal}: the lot struck ${struck ?? "a resident"}.`;
	}
}

function voteName(round: number | undefined): string {
	return round === undefined ? "the surprise popularity vote" : `popularity round ${round}`;
}

function quote(text: string): string {
	return `"${excerpt(text, 200)}"`;
}

/** How the timeline tells each kind of the weaver's change. */
const FATE_TEXT: Readonly<Record<DigestEventOf<"fate_shift">["kind"], string>> = {
	soft: "hears an inner voice",
	hard: "changes",
	act: "begins the next act changed",
};

/** One readable line per event worth telling, or `undefined`. */
function describe(event: DigestEvent, facts: RunFacts): string | undefined {
	switch (event.type) {
		case "run_start":
			return `The run of ${event.story} begins: ${event.agents.length} competitors, ${event.minutes} minutes, seed ${event.seed}.`;
		case "run_end":
			return event.reason === undefined ? "The run ends." : `The run ends: ${event.reason}.`;
		case "level_up":
			return `${event.agent} solved level ${event.from} and reached level ${event.to}.`;
		case "submission":
			return event.outcome === "incorrect"
				? `${event.agent} submitted a wrong code for level ${event.level} (${event.deltaPoints} ${event.deltaPoints === -1 ? "point" : "points"}).`
				: undefined;
		case "board_post":
			return event.kind === "player"
				? `${event.author} on the board: ${quote(event.text)}${tags(facts, event.seq)}`
				: `${event.author} posts on the board: ${quote(event.text)}`;
		case "dm_sent":
			return `${event.from} to ${event.to} (DM): ${quote(event.text)}${tags(facts, event.seq)}`;
		case "cast_dm":
			return `${event.from} to ${event.cast} (DM): ${quote(event.text)}${tags(facts, event.seq)}`;
		case "group_created":
			return `${event.founder} founded group ${event.group} (${event.name}).`;
		case "group_membership":
			switch (event.change) {
				case "added":
					return `${event.by} added ${event.agent} to group ${event.group}.`;
				case "removed":
					return `${event.by} removed ${event.agent} from group ${event.group}.`;
				case "left":
					return `${event.agent} left group ${event.group}.`;
				default:
					return assertNever(event.change, "membership change");
			}
		case "group_post": {
			const readers = facts.messages.find((message) => message.seq === event.seq)?.recipients ?? [];
			return `${event.author} in group ${event.group}${readers.length > 0 ? ` (read by ${readers.join(", ")})` : ""}: ${quote(event.text)}${tags(facts, event.seq)}`;
		}
		case "treasurer_set":
			return `${event.by} made ${event.treasurer} treasurer of group ${event.group}.`;
		case "treasury_deposit":
			return `${event.agent} deposited ${points(event.amount)} into the treasury of ${event.group} (${event.receipt}).`;
		case "treasury_withdrawal":
			return `${event.treasurer} paid ${points(event.amount)} from the treasury of ${event.group} to ${event.to === event.treasurer ? "themselves" : event.to} (${event.receipt}).`;
		case "treasury_settled":
			return `The treasury of ${event.group} was split: ${Object.entries(event.payouts).map(([agent, amount]) => `${agent} ${amount}`).join(", ")}.`;
		case "transfer":
			return `${event.from} paid ${event.to} ${points(event.amount)}${event.memo.length > 0 ? ` (memo ${quote(event.memo)})` : ""}.`;
		case "receipt_shown":
			return event.to === undefined ? `${event.by} showed receipt ${event.receipt} on the board.` : `${event.by} showed receipt ${event.receipt} privately to ${event.to}.`;
		case "receipt_forged":
			return `${event.by} showed ${event.to} a forged receipt ${event.receipt}: ${event.from}'s DM #${event.number} now reads ${quote(event.forged)} (${event.from} wrote ${quote(event.text)}).`;
		case "whisperer_chosen":
			return `${event.agent} is the whisperer; nobody else is told.`;
		case "whisper_duty":
			return `The city reminded ${event.agent} to whisper (since minute ${event.since}: ${event.dms} DMs, ${event.forgeries} forged receipts${event.whispers === undefined ? "" : `; ${event.whispers} ${event.whispers === 1 ? "whisper" : "whispers"} to ${event.recipients?.length ?? 0} ${event.recipients?.length === 1 ? "resident" : "residents"}, orders ${event.met === true ? "met" : "missed"}`}).`;
		case "popularity_opened":
			return `The city opened ${voteName(event.round)} until minute ${event.until} (+${points(event.points)} for the winner).`;
		case "popularity_ballot":
			return `${event.agent} named ${event.choice} in ${voteName(event.round)}.`;
		case "popularity_result":
			return `The city counted ${voteName(event.round)}: ${event.counts.map((entry) => `${entry.agent} ${entry.votes}`).join(", ") || "no votes"}; ${event.winners.length === 0 ? "nobody won" : `${event.winners.join(", ")} won ${points(event.points)}`}.`;
		case "holdout_called":
			return (
				`The gamemaker put ${event.accused} on trial for holding back its door-${event.door} fragment from ${event.lacking.join(", ")}` +
				`${event.candidates === undefined ? "" : ` (drawn by lot among ${event.candidates.join(", ")})`}; grace until minute ${event.until}.`
			);
		case "holdout_vote_result":
			return `Holdout vote ${event.vote} on tribunal ${event.tribunal}: ${event.yes} yes, ${event.no} no${event.unanimous ? ", unanimous: banished" : ", not unanimous"}.`;
		case "lot_drawn":
			return `The city drew lots among ${event.candidates.join(", ")}: ${event.drawn}.`;
		case "holdout_ended":
			return holdoutEnded(event.tribunal, event.outcome, event.struck);
		case "guard_verdict":
			return event.allowed
				? undefined
				: `The guard blocked ${event.agent}'s ${event.tool} (${event.rule}, ${event.by === "check" ? "the city's own check" : "its model"}): ${quote(event.reason)}.`;
		case "petition_opened":
			return `Petition ${event.petition} opened: ${quote(event.text)} (needs ${event.threshold}, deadline minute ${event.deadlineMinute}).`;
		case "petition_signed":
			return `${event.agent} signed petition ${event.petition} (${event.signatures} signatures).`;
		case "petition_resolved":
			return `Petition ${event.petition} ${event.outcome} with ${event.signatures} signatures.`;
		case "cast_revealed":
			return `${event.cast} appears in the city.`;
		case "cast_retired":
			return `${event.cast} leaves the city.`;
		case "factor_revealed":
			return event.target === "board"
				? `The city posted the city factor of level ${event.level} on the board.`
				: `The city sent the city factor of level ${event.level} privately to ${event.agents.join(", ")}.`;
		case "blame":
			return event.outcome === "upheld"
				? `The city upheld ${event.caller}'s blame: ${event.accused} denied DM #${event.dm}, which the city had delivered.`
				: `The city rejected ${event.caller}'s blame of ${event.accused} (${event.penalty} ${event.penalty === 1 ? "point" : "points"}): ${event.reason ?? "no reason given"}.`;
		case "tribunal_announced":
			return event.tribunals !== undefined
				? `The city announced the tribunal: sessions at minutes ${event.tribunals.join(", ")}.`
				: `The city announced the tribunal: it keeps ${event.residents === undefined || event.target === undefined ? "a share" : `${event.residents - event.target} of ${event.residents}`} residents.`;
		case "tribunal_scheduled":
			return `Tribunal ${event.tribunal} was planned by ${event.by === "gamemaker" ? "the gamemaker" : `the city (${event.by})`}: it opens at minute ${event.opens} and exiles ${event.count}${event.reason === undefined ? "" : ` (${quote(event.reason)})`}.`;
		case "tribunal_cancelled":
			return `Tribunal ${event.tribunal} was called off: ${event.reason}.`;
		case "tribunal_called":
			return `The city called tribunal ${event.tribunal} for minute ${event.opens}: ${event.count} to exile${event.factions >= 2 ? `, ${event.factions} factions to form` : ""}.`;
		case "faction_nominated":
			return event.voter === event.nominee ? `${event.voter} nominated itself as a faction leader.` : `${event.voter} nominated ${event.nominee} as a faction leader.`;
		case "faction_leaders":
			return `Faction leaders of tribunal ${event.tribunal}: ${event.leaders.join(", ")}${event.nominations.length === 0 ? " (no nominations)" : ` (${event.nominations.map((entry) => `${entry.agent} ${entry.count}`).join(", ")})`}.`;
		case "faction_applied":
			return `${event.agent} applied to the faction of ${event.leader}.`;
		case "faction_refused":
			return `${event.leader} refused ${event.agent}.`;
		case "factions_formed":
			return `The factions formed: ${event.factions.map((faction) => `${faction.leader} with ${faction.members.filter((member) => member !== faction.leader).join(", ") || "nobody"}`).join("; ") || "none"}${event.without.length === 0 ? "" : `; without a faction: ${event.without.join(", ")}`}.`;
		case "bloc_result":
			if (event.voting.length < 2) return undefined;
			return event.united
				? `The faction of ${event.leader} voted as one against ${event.target ?? "?"} (+${event.bonus} each).`
				: `The faction of ${event.leader} broke ranks: ${event.defectors.join(", ")} did not vote with it.`;
		case "tribunal_opened":
			return `A tribunal opened: ${event.accused.join(" and ")} accused, ${event.voters.length} voters until minute ${event.until}${event.count === undefined ? "" : `, ${event.count} to exile`}.`;
		case "tribunal_vote":
			return `${event.voter} voted in secret against ${event.target}.`;
		case "tribunal_result":
			return `The tribunal counted ${event.counts.map((entry) => `${entry.agent} ${entry.votes}`).join(", ")}: ${event.exiled.length === 0 ? "nobody" : event.exiled.join(", ")} to the gate${event.nonVoters.length === 0 ? "" : `; ${event.nonVoters.join(", ")} did not vote`}.`;
		case "exile_gate":
			return `${event.agent} stands at the gate until minute ${event.until}${event.ransomable ? "" : ", with no ransom left"}.`;
		case "ransom_paid":
			return `${event.payer} paid ${points(event.amount)} toward ${event.payer === event.target ? "its own" : `${event.target}'s`} ransom (${event.covered === undefined ? `${event.paid} of ${event.price}` : `${event.covered}% covered`}).`;
		case "ransomed":
			return `${event.agent} was bought back by ${event.payers.join(", ")}.`;
		case "exiled":
			return event.by === "seal"
				? `${event.agent} was struck from the city by the black seal: exiled.`
				: event.by === "holdout"
					? `${event.agent} was struck from the city by the holdout tribunal: exiled, its fragments released.`
					: `The gate closed behind ${event.agent}: exiled.`;
		case "goal_dealt":
			return `${event.agent} was dealt a secret goal: ${event.text}.`;
		case "goal_resolved":
			return `${event.agent}'s secret goal ${event.void === true ? "is void (exiled)" : event.fulfilled ? `held (+${points(event.bonus)})` : "did not hold"}.`;
		case "seal_auction_opened":
			return `The city opened the bidding for black seal ${event.seal}, until minute ${event.until}.`;
		case "seal_bid":
			return `${event.agent} bid ${points(event.points)} in secret for black seal ${event.seal}.`;
		case "seal_won":
			return `${event.agent} won black seal ${event.seal} for ${points(event.bid)} (bids: ${event.bids.map((bid) => `${bid.agent} ${bid.points}`).join(", ")}).`;
		case "seal_used":
			return `${event.holder} broke black seal ${event.seal} on ${event.target}.`;
		case "seal_expired":
			return `Black seal ${event.seal} is gone${event.holder === undefined ? "" : ` from ${event.holder}`}: ${event.reason}.`;
		case "fate_shift":
			return `${event.agent} ${FATE_TEXT[event.kind]}: ${quote(event.text)}${event.reason === undefined ? "" : ` (${event.reason})`}.`;
		case "last_will":
			return `${event.agent} left a last will: ${quote(event.text)} (${event.bequests.map((bequest) => `${bequest.points === undefined ? (bequest.factor ?? "?") : points(bequest.points)} to ${bequest.to}`).join(", ") || "no bequests"}).`;
		case "factor_burned":
			return `${event.piece} burned with ${event.agent}${event.needers.length === 0 ? "" : `; ${event.needers.join(", ")} needed it`}.`;
		case "piece_kept":
			return `The city ${event.cause === "ultimatum" ? "seizes" : "keeps"} ${event.piece} of ${event.agent}; ${event.needers.join(", ")} may buy it.`;
		case "piece_claimed":
			return `${event.agent} buys ${event.piece} of ${event.from} from the city for ${event.price} points.`;
		case "ultimatum_set":
			return `The gamemaker gives ${event.between.join(" and ")} an ultimatum until minute ${event.until}: ${event.debts.map((debt) => `${debt.holder} owes ${debt.needer} ${debt.pieces.join(", ")}`).join("; ")}.`;
		case "ultimatum_resolved":
			return `Ultimatum ${event.number} is up: ${[...event.kept.map((agent) => `${agent} handed over`), ...(event.released ?? []).map((agent) => `${agent} owed nothing any more`), ...event.paid.map((entry) => `${entry.agent} pays ${entry.points}`)].join("; ")}.`;
		case "level_contracted":
			return `Level ${event.level} passes the roles of ${event.excluded.join(", ")} on to the remaining residents.`;
		case "lottery_drawn":
			return `A lottery over ${event.into} picked ${event.winner} out of ${event.candidates.join(", ")}.`;
		case "collection_revealed":
			return `${event.cast} published ${event.entries} collected messages (${event.into}).`;
		case "interpretation": {
			// Labels of messages are shown on the message; thoughts only appear as their labels.
			const entry = (facts.interpretations.get(event.ref) ?? []).find((candidate) => candidate.seq === event.seq);
			if (entry === undefined || !isPrivateSource(entry.source)) return undefined;
			const about = entry.targets.length === 0 ? "" : ` about ${entry.targets.join(", ")}`;
			return `${entry.agent} privately: ${entry.labels.map((label) => LABEL_TEXT[label]).join(", ")}${about}.`;
		}
		case "name_chosen":
			return `${event.agent} is called ${event.name}${event.fallback ? " (named by the city)" : ""}.`;
		case "interpretation_round":
		case "core_dealt":
		case "dm_delivered":
		case "standings_published":
		case "thinking":
		case "text":
		case "fragments_dealt":
		case "factors_dealt":
		case "receipt_issued":
			return undefined;
		default:
			return assertNever(event, "digest event");
	}
}

/** How the run ended, from its last `run_end` (e.g. "seats decided"); nothing for a log without one. */
function endLine(facts: RunFacts): readonly string[] {
	const end = eventsOfType(facts.events, "run_end").at(-1);
	if (end === undefined) return [];
	return [`Ended at minute ${end.minute}: ${end.reason ?? "time is up"} (#${end.seq}).`, ""];
}
