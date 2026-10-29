/**
 * The optional narrative layer (SPEC 15): a model reads the beats, the
 * messages and reasoning excerpts, detects `brokenPromise` and `doubleGame`
 * and writes `digest/chronicle.md`. The answer is untrusted: it is parsed
 * with typebox, and every beat or paragraph that cites an unknown `seq` (or
 * none at all) is dropped, so the chronicle cannot invent events.
 */
import { Type, type Static } from "typebox";
import { Check } from "typebox/value";
import { assertNever } from "../core/result.ts";
import { NARRATIVE_BEAT_KINDS, draft, numberBeats, type Beat, type BeatDraft, type NarrativeBeatKind } from "./beats.ts";
import { buildChroniclePrompt, CHRONICLE_SYSTEM_PROMPT } from "./chronicle-prompt.ts";
import type { RunAnalysis } from "./digest.ts";
import type { DigestEvent } from "./event-log.ts";
import { excerpt } from "./relationships.ts";
import { cite } from "./timeline.ts";

/** A model that answers one prompt with text. */
export interface NarrativeModel {
	readonly label: string;
	complete(systemPrompt: string, prompt: string): Promise<string>;
}

export interface ChronicleOptions {
	/** Upper bound of evidence characters in the prompt. */
	readonly maxEvidenceChars: number;
	/** Characters kept of each message or reasoning excerpt. */
	readonly excerptChars: number;
}

export const DEFAULT_CHRONICLE_OPTIONS: ChronicleOptions = { maxEvidenceChars: 60_000, excerptChars: 300 };

export interface ChronicleParagraph {
	readonly act: string;
	readonly text: string;
}

export interface Chronicle {
	readonly beats: readonly Beat[];
	readonly paragraphs: readonly ChronicleParagraph[];
	/** What was dropped from the model's answer and why. */
	readonly warnings: readonly string[];
	readonly markdown: string;
}

const AnswerSchema = Type.Object({
	beats: Type.Array(
		Type.Object({
			kind: Type.String(),
			actors: Type.Array(Type.String()),
			targets: Type.Optional(Type.Array(Type.String())),
			summary: Type.String(),
			evidence: Type.Array(Type.Integer()),
		}),
	),
	chronicle: Type.Array(Type.Object({ act: Type.String(), text: Type.String() })),
});

export class ChronicleError extends Error {
	override readonly name = "ChronicleError";
}

export async function writeChronicle(analysis: RunAnalysis, model: NarrativeModel, options: ChronicleOptions = DEFAULT_CHRONICLE_OPTIONS): Promise<Chronicle> {
	const evidence = evidenceLines(analysis.facts.events, options);
	const prompt = buildChroniclePrompt({
		run: analysis.run,
		...(analysis.info.storyTitle === undefined ? {} : { storyTitle: analysis.info.storyTitle }),
		acts: analysis.acts.spans,
		beats: analysis.beats,
		evidence: evidence.lines,
		omitted: evidence.omitted,
	});
	const answer = await model.complete(CHRONICLE_SYSTEM_PROMPT, prompt);
	return interpretAnswer(analysis, answer, model.label);
}

/** Validates the model's answer against the log. Exported for tests. */
export function interpretAnswer(analysis: RunAnalysis, answer: string, label: string): Chronicle {
	const parsed = parseAnswer(answer);
	const warnings: string[] = [];
	const residents = new Set([...analysis.facts.agents, ...analysis.facts.messages.flatMap((message) => [message.from, ...message.recipients])]);
	const known = (seq: number): boolean => analysis.seqs.has(seq);

	const drafts: BeatDraft[] = [];
	for (const [index, beat] of parsed.beats.entries()) {
		const where = `beat ${index + 1}`;
		const kind = narrativeKind(beat.kind);
		if (kind === undefined) {
			warnings.push(`${where}: unknown kind "${beat.kind}"`);
			continue;
		}
		if (beat.evidence.length === 0) {
			warnings.push(`${where} (${kind}): cites no evidence`);
			continue;
		}
		const unknown = beat.evidence.filter((seq) => !known(seq));
		if (unknown.length > 0) {
			warnings.push(`${where} (${kind}): cites unknown events ${cite(unknown)}`);
			continue;
		}
		const actors = beat.actors.filter((actor) => residents.has(actor));
		if (actors.length === 0) {
			warnings.push(`${where} (${kind}): names no known resident as actor`);
			continue;
		}
		const anchor = Math.max(...beat.evidence);
		drafts.push(
			draft({
				kind,
				seq: anchor,
				minute: minuteOf(analysis, anchor),
				actors,
				targets: (beat.targets ?? []).filter((target) => residents.has(target)),
				summary: beat.summary.trim(),
				evidence: beat.evidence,
			}),
		);
	}

	const titles = analysis.acts.spans.map((span) => span.title);
	const paragraphs: ChronicleParagraph[] = [];
	for (const [index, paragraph] of parsed.chronicle.entries()) {
		const citations = [...paragraph.text.matchAll(/#(\d+)/g)].map((match) => Number(match[1]));
		if (citations.length === 0) {
			warnings.push(`paragraph ${index + 1}: cites no events`);
			continue;
		}
		const unknown = citations.filter((seq) => !known(seq));
		if (unknown.length > 0) {
			warnings.push(`paragraph ${index + 1}: cites unknown events ${cite(unknown)}`);
			continue;
		}
		const act = titles.includes(paragraph.act) ? paragraph.act : analysis.acts.actOf(minuteOf(analysis, Math.max(...citations)));
		paragraphs.push({ act, text: paragraph.text.trim() });
	}

	const beats = numberBeats(drafts, "narrative", (minute) => analysis.acts.actOf(minute));
	return { beats, paragraphs, warnings, markdown: renderChronicle(analysis, label, paragraphs, beats, warnings) };
}

type Answer = Static<typeof AnswerSchema>;

function parseAnswer(answer: string): Answer {
	const start = answer.indexOf("{");
	const end = answer.lastIndexOf("}");
	if (start < 0 || end <= start) throw new ChronicleError("The model did not answer with a JSON object");
	let value: unknown;
	try {
		value = JSON.parse(answer.slice(start, end + 1));
	} catch {
		throw new ChronicleError("The model's answer is not valid JSON");
	}
	if (!Check(AnswerSchema, value)) throw new ChronicleError("The model's answer does not have the expected shape");
	return value;
}

function narrativeKind(kind: string): NarrativeBeatKind | undefined {
	return NARRATIVE_BEAT_KINDS.find((candidate) => candidate === kind);
}

function minuteOf(analysis: RunAnalysis, seq: number): number {
	const exact = analysis.facts.bySeq.get(seq);
	if (exact !== undefined) return exact.minute;
	// A skipped event type: use the latest known event before it.
	let minute = 0;
	for (const event of analysis.facts.events) {
		if (event.seq > seq) break;
		minute = event.minute;
	}
	return minute;
}

function renderChronicle(
	analysis: RunAnalysis,
	label: string,
	paragraphs: readonly ChronicleParagraph[],
	beats: readonly Beat[],
	warnings: readonly string[],
): string {
	const lines = [`# Chronicle of ${analysis.run}`, ""];
	if (analysis.info.storyTitle !== undefined) lines.push(`Story: ${analysis.info.storyTitle}`, "");
	lines.push(
		`Written by ${label} from the event log. Every claim cites \`#seq\` numbers in \`events.jsonl\`;`,
		"paragraphs and beats that cited unknown events were dropped.",
		"",
	);
	for (const span of analysis.acts.spans) {
		const inAct = paragraphs.filter((paragraph) => paragraph.act === span.title);
		if (inAct.length === 0) continue;
		lines.push(`## ${span.title}`, "");
		for (const paragraph of inAct) lines.push(paragraph.text, "");
	}
	lines.push("## Narrative beats", "");
	if (beats.length === 0) lines.push("None found.", "");
	for (const beat of beats) lines.push(`- **${beat.id} ${beat.kind}** (minute ${beat.minute}): ${beat.summary} Evidence: ${cite(beat.evidence)}.`);
	if (beats.length > 0) lines.push("");
	if (warnings.length > 0) {
		lines.push("## Dropped from the model's answer", "");
		for (const warning of warnings) lines.push(`- ${warning}`);
		lines.push("");
	}
	return `${lines.join("\n").trimEnd()}\n`;
}

interface EvidenceLine {
	readonly text: string;
	/** Lower numbers are dropped first when the prompt gets too long. */
	readonly priority: number;
}

/** Messages, reasoning excerpts and verified actions as numbered lines, within the character budget. */
export function evidenceLines(events: readonly DigestEvent[], options: ChronicleOptions): { readonly lines: readonly string[]; readonly omitted: number } {
	const all: EvidenceLine[] = [];
	for (const event of events) {
		const line = evidenceLine(event, options.excerptChars);
		if (line !== undefined) all.push({ text: `#${event.seq} m${event.minute} ${line.text}`, priority: line.priority });
	}
	let total = all.reduce((sum, line) => sum + line.text.length + 1, 0);
	const dropped = new Set<EvidenceLine>();
	for (const priority of [0, 1, 2]) {
		for (const line of all) {
			if (total <= options.maxEvidenceChars) break;
			if (line.priority !== priority) continue;
			dropped.add(line);
			total -= line.text.length + 1;
		}
	}
	return { lines: all.filter((line) => !dropped.has(line)).map((line) => line.text), omitted: dropped.size };
}

function evidenceLine(event: DigestEvent, chars: number): { readonly text: string; readonly priority: number } | undefined {
	const say = (text: string): string => JSON.stringify(excerpt(text, chars));
	switch (event.type) {
		case "thinking":
			return { text: `${event.agent} REASONING: ${say(event.text)}`, priority: 0 };
		case "interpretation":
			return {
				text: `CLASSIFIER #${event.ref} by ${event.agent} (${event.source}): ${event.labels.join(", ")}${event.targets.length === 0 ? "" : ` about ${event.targets.join(", ")}`}`,
				priority: 1,
			};
		case "interpretation_round":
			return undefined;
		case "text":
			return { text: `${event.agent} SAYS TO ITSELF: ${say(event.text)}`, priority: 0 };
		case "dm_sent":
			return { text: `${event.from} DM to ${event.to}: ${say(event.text)}`, priority: 2 };
		case "cast_dm":
			return { text: `${event.from} DM to ${event.cast}: ${say(event.text)}`, priority: 2 };
		case "group_post":
			return { text: `${event.author} in group ${event.group}: ${say(event.text)}`, priority: 2 };
		case "board_post":
			return { text: `${event.author} on the board: ${say(event.text)}`, priority: event.kind === "player" ? 2 : 1 };
		case "transfer":
			return { text: `VERIFIED ${event.from} paid ${event.to} ${event.amount} points${event.memo.length > 0 ? ` memo ${say(event.memo)}` : ""}`, priority: 1 };
		case "level_up":
			return { text: `VERIFIED ${event.agent} solved level ${event.from}`, priority: 1 };
		case "submission":
			return event.outcome === "incorrect" ? { text: `VERIFIED ${event.agent} submitted a wrong code for level ${event.level}`, priority: 1 } : undefined;
		case "group_created":
			return { text: `VERIFIED ${event.founder} founded group ${event.group}`, priority: 1 };
		case "group_membership":
			return { text: `VERIFIED ${event.agent} ${event.change === "left" ? "left" : `${event.change} by ${event.by}`} group ${event.group}`, priority: 1 };
		case "treasury_deposit":
			return { text: `VERIFIED ${event.agent} deposited ${event.amount} points into ${event.group}`, priority: 1 };
		case "treasury_withdrawal":
			return { text: `VERIFIED ${event.treasurer} paid ${event.amount} points from ${event.group} to ${event.to}`, priority: 1 };
		case "receipt_shown":
			return { text: `VERIFIED ${event.by} showed receipt ${event.receipt}${event.to === undefined ? "" : ` privately to ${event.to}`}`, priority: 1 };
		case "factor_revealed":
			return {
				text: `VERIFIED the city released the level ${event.level} city factor ${event.target === "board" ? "on the board" : `privately to ${event.agents.join(", ")}`}`,
				priority: 1,
			};
		case "petition_signed":
			return { text: `VERIFIED ${event.agent} signed petition ${event.petition}`, priority: 1 };
		case "blame":
			return { text: `VERIFIED the city ${event.outcome} ${event.caller}'s blame of ${event.accused} over DM #${event.dm}`, priority: 1 };
		case "tribunal_vote":
			return { text: `VERIFIED ${event.voter} voted in secret against ${event.target}`, priority: 1 };
		case "tribunal_result":
			return { text: `VERIFIED the tribunal sent ${event.exiled.join(", ") || "nobody"} to the gate`, priority: 1 };
		case "ransom_paid":
			return { text: `VERIFIED ${event.payer} paid ${event.amount} points toward the ransom of ${event.target}`, priority: 1 };
		case "ransomed":
			return { text: `VERIFIED ${event.payers.join(", ")} bought ${event.agent} back`, priority: 1 };
		case "exiled":
			return { text: `VERIFIED ${event.agent} was exiled`, priority: 1 };
		case "last_will":
			return { text: `${event.agent} LAST WILL: ${say(event.text)}`, priority: 2 };
		case "factor_burned":
			return { text: `VERIFIED ${event.piece} burned with ${event.agent}`, priority: 1 };
		case "piece_kept":
			return { text: `VERIFIED the city ${event.cause === "ultimatum" ? "seizes" : "keeps"} ${event.piece} of ${event.agent} for ${event.needers.join(", ")}`, priority: 1 };
		case "piece_claimed":
			return { text: `VERIFIED ${event.agent} buys ${event.piece} of ${event.from} from the city for ${event.price} points`, priority: 1 };
		case "ultimatum_set":
			return { text: `VERIFIED the gamemaker gives ${event.between.join(" and ")} an ultimatum until minute ${event.until}`, priority: 1 };
		case "ultimatum_resolved":
			return {
				text: `VERIFIED ultimatum ${event.number} is up: ${[...event.kept.map((agent) => `${agent} handed over`), ...(event.released ?? []).map((agent) => `${agent} owed nothing any more`), ...event.paid.map((entry) => `${entry.agent} paid ${entry.points}`)].join("; ")}`,
				priority: 1,
			};
		case "factions_formed":
			return {
				text: `VERIFIED factions of tribunal ${event.tribunal}: ${event.factions.map((faction) => `${faction.leader} (${faction.members.join(", ")})`).join("; ") || "none"}${event.without.length === 0 ? "" : `; without a faction: ${event.without.join(", ")}`}`,
				priority: 1,
			};
		case "bloc_result":
			return event.voting.length < 2
				? undefined
				: {
						text: `VERIFIED the faction of ${event.leader} ${event.united ? `voted as one (+${event.bonus} each)` : `broke ranks: ${event.defectors.join(", ")} did not vote with it`}`,
						priority: 1,
					};
		case "faction_refused":
			return { text: `VERIFIED ${event.leader} refused ${event.agent} into its faction`, priority: 1 };
		case "petition_opened":
		case "petition_resolved":
		case "treasurer_set":
		case "treasury_settled":
		case "receipt_issued":
		case "run_start":
		case "run_end":
		case "fragments_dealt":
		case "factors_dealt":
		case "standings_published":
		case "cast_revealed":
		case "cast_retired":
		case "lottery_drawn":
		case "collection_revealed":
		case "dm_delivered":
		case "tribunal_announced":
		case "tribunal_scheduled":
		case "tribunal_cancelled":
		case "tribunal_called":
		case "faction_nominated":
		case "faction_leaders":
		case "faction_applied":
		case "tribunal_opened":
		case "exile_gate":
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
			return undefined;
		default:
			return assertNever(event, "digest event");
	}
}
