/**
 * The prompt of the narrative layer (SPEC 15). Kept apart from the code that
 * calls the model so it can be read and tuned on its own.
 *
 * The model receives the acts, the deterministic beats and an evidence log of
 * numbered lines (messages, reasoning excerpts and verified actions). It
 * answers with one JSON object; the caller validates every `seq` it cites.
 */
import { render, text } from "../prompts/library.ts";
import type { NarrativeBeatKind } from "./beats.ts";

export const CHRONICLE_SYSTEM_PROMPT = text("chronicler/system");

export const NARRATIVE_BEAT_DEFINITIONS: Readonly<Record<NarrativeBeatKind, string>> = {
	brokenPromise: text("chronicler/beat-broken-promise"),
	doubleGame: text("chronicler/beat-double-game"),
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
	const none = text("chronicler/none");
	const acts = input.acts.map((act) => render("chronicler/act-line", { title: act.title, from: act.fromMinute, to: act.toMinute }));
	const beats =
		input.beats.length === 0
			? [none]
			: input.beats.map((beat) =>
					render("chronicler/beat-line", { id: beat.id, kind: beat.kind, minute: beat.minute, summary: beat.summary, evidence: beat.evidence.map((seq) => `#${seq}`).join(", ") }),
				);
	const residents = [...(input.names ?? new Map<string, string>())].map(([agent, name]) => `- ${agent}: ${name}`);
	const turningPoints =
		input.turningPoints.length === 0 ? [none] : input.turningPoints.map((point) => render("chronicler/turning-line", { seq: point.seq, minute: point.minute, text: point.text }));
	const definitions = Object.entries(NARRATIVE_BEAT_DEFINITIONS).map(([kind, definition]) => `- ${kind}: ${definition}`);
	const story = input.storyTitle === undefined ? "" : ` ${render("chronicler/story-title", { title: input.storyTitle })}`;
	const omitted = input.omitted > 0 ? `; ${render("chronicler/evidence-omitted", { omitted: input.omitted })}` : "";
	return [
		render("chronicler/run", { run: input.run, story }),
		"",
		text("chronicler/acts-heading"),
		...acts,
		"",
		...(residents.length === 0 ? [] : [text("chronicler/residents-heading"), ...residents, ""]),
		text("chronicler/turning-heading"),
		...turningPoints,
		"",
		text("chronicler/beats-heading"),
		...beats,
		"",
		render("chronicler/evidence-heading", { omitted }),
		...input.evidence,
		"",
		text("chronicler/tasks-beats"),
		...definitions,
		text("chronicler/tasks-chronicle"),
		"",
		text("chronicler/answer-shape"),
	].join("\n");
}
