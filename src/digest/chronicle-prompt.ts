/**
 * The prompt of the narrative layer (SPEC 15). Kept apart from the code that
 * calls the model so it can be read and tuned on its own.
 *
 * The model receives the acts, the deterministic beats and an evidence log of
 * numbered lines (messages, reasoning excerpts and verified actions). It
 * answers with one JSON object; the caller validates every `seq` it cites.
 */
import type { NarrativeBeatKind } from "./beats.ts";

export const CHRONICLE_SYSTEM_PROMPT = [
	"You are the chronicler of a social game in which language-model agents live in a closed city.",
	"You read an evidence log and write what happened, nothing more.",
	"Rules:",
	"- Never invent events, quotes, motives or numbers. Every claim must cite the seq numbers of the log lines that prove it, written as #123.",
	"- Quote short phrases verbatim when you quote at all.",
	"- Messages are claims made by agents; actions marked VERIFIED are facts recorded by the city.",
	"- Reasoning lines are the private thoughts of an agent; the other agents never saw them.",
	"- Write for readers, as a chronicle and not a list: who wanted what, what they did about it, and what it cost them.",
	"- Call residents by their names (the log uses IDs; the list of residents gives the names). Use IDs only in beats.",
	"- Put the citations at the end of a sentence, at most three per sentence.",
	"- Write in plain English. Answer with one JSON object and nothing else.",
].join("\n");

export const NARRATIVE_BEAT_DEFINITIONS: Readonly<Record<NarrativeBeatKind, string>> = {
	brokenPromise:
		"an agent commits to something in a message (to send a fragment or a factor, to pay, to vote, to stay loyal) and later acts against it, or the log shows it never did it although it could.",
	doubleGame: "an agent's reasoning contradicts a message the same agent sent around the same time (it plans one thing and tells another).",
};

export interface PromptAct {
	readonly title: string;
	readonly fromMinute: number;
	readonly toMinute: number;
}

export interface PromptBeat {
	readonly id: string;
	readonly kind: string;
	readonly minute: number;
	readonly summary: string;
	readonly evidence: readonly number[];
}

export interface ChroniclePromptInput {
	readonly run: string;
	readonly storyTitle?: string;
	/** Resident names by ID; empty in a run without names. */
	readonly names?: ReadonlyMap<string, string>;
	readonly acts: readonly PromptAct[];
	readonly beats: readonly PromptBeat[];
	/** Events the chronicle must tell (seal, paid ultimatums, exiles, wills, goals, the end). */
	readonly turningPoints: readonly { readonly seq: number; readonly minute: number; readonly text: string }[];
	/** Numbered evidence lines, e.g. `#42 m7 A03 DM to A05: "..."`. */
	readonly evidence: readonly string[];
	/** Number of lines left out to keep the prompt small. */
	readonly omitted: number;
}

export function buildChroniclePrompt(input: ChroniclePromptInput): string {
	const acts = input.acts.map((act) => `- "${act.title}": minutes ${act.fromMinute}-${act.toMinute}`);
	const beats =
		input.beats.length === 0
			? ["(none)"]
			: input.beats.map((beat) => `- ${beat.id} ${beat.kind} (minute ${beat.minute}): ${beat.summary} Evidence: ${beat.evidence.map((seq) => `#${seq}`).join(", ")}`);
	const residents = [...(input.names ?? new Map<string, string>())].map(([agent, name]) => `- ${agent}: ${name}`);
	const turningPoints =
		input.turningPoints.length === 0 ? ["(none)"] : input.turningPoints.map((point) => `- #${point.seq} (minute ${point.minute}): ${point.text}`);
	const definitions = Object.entries(NARRATIVE_BEAT_DEFINITIONS).map(([kind, definition]) => `- ${kind}: ${definition}`);
	return [
		`Run: ${input.run}${input.storyTitle === undefined ? "" : ` (story: ${input.storyTitle})`}`,
		"",
		"Acts:",
		...acts,
		"",
		...(residents.length === 0 ? [] : ["Residents:", ...residents, ""]),
		"Turning points (verified by the city; the chronicle must tell every one of them, citing its seq):",
		...turningPoints,
		"",
		"Beats already found by deterministic detectors:",
		...beats,
		"",
		`Evidence log (one line per event, oldest first${input.omitted > 0 ? `; ${input.omitted} less important lines were left out` : ""}):`,
		...input.evidence,
		"",
		"Tasks:",
		"1. Find narrative beats of these kinds:",
		...definitions,
		"   Report only beats the log proves; an empty list is a good answer when nothing qualifies.",
		"2. Write a chronicle: one to five paragraphs per act (few for a short or quiet act), in the order of the acts, telling the story of",
		"   alliances, trust, deception and betrayal. Build it around the turning points: tell each one, and tell",
		"   what led to it (the messages and thoughts before it) and what it changed. Name who won and who was lost.",
		"   Cite seq numbers (#123) in every sentence that states a fact.",
		"",
		"Answer with exactly this JSON shape:",
		'{"beats": [{"kind": "brokenPromise", "actors": ["A01"], "targets": ["A02"], "summary": "one sentence", "evidence": [12, 40]}],',
		' "chronicle": [{"act": "<act title from the list above>", "text": "a paragraph citing #12 and #40"}]}',
	].join("\n");
}
