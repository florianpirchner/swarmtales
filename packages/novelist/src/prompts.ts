/**
 * Every prompt of the novelist (SPEC 15, "Novelist"): the outline, the prologue, the
 * residents' and the gamemaker's chapters, the edit pass and the translation. Their text
 * lives in `library/prompts/novelist/`, where it can be read and tuned on its own; this file
 * joins the pieces with the run's material.
 */
import { render, text } from "@swarmtales/prompts";

/**
 * What the material is, said plainly at the top of every system prompt: the
 * keys, codes and seizures are a word-puzzle game, not computer crime.
 * Anthropic blocked harmless parts as "cyber content" without it (P56).
 */
export const storyContext = (): string => text("novelist/context");

/** The glossary lines for a prompt, or nothing when the outline has none. */
function glossaryLines(glossary: readonly GlossaryEntry[]): readonly string[] {
	if (glossary.length === 0) return [];
	return ["", text("novelist/glossary/heading"), ...glossary.map((entry) => render("novelist/glossary/entry", { term: entry.term, story: entry.story }))];
}

/** A game term and the word the story uses for it. */
export interface GlossaryEntry {
	readonly term: string;
	readonly story: string;
}

/** The `pov` of a chapter told from the gamemaker's control room. */
export const GAMEMAKER_POV = "GAMEMAKER";

/** The gamemaker's team: real parts of the city, each with traces in the log. */
export const gamemakerTeam = (): string => text("novelist/gamemaker-team");

/** What every stage shares: the story is based on true events and may not change them. */
const truth = (): string => text("novelist/truth-rules");

/**
 * How the prose should read: like literary fiction, not like a game log.
 * Shared by the prologue, the chapters and the edit pass.
 */
const craft = (): string => text("novelist/craft-rules");

export const outlineSystemPrompt = (): string => render("novelist/outline-system", { context: storyContext(), truth: truth(), pov: GAMEMAKER_POV });

export interface OutlinePromptInput {
	readonly run: string;
	readonly storyTitle?: string;
	readonly words: number;
	readonly chapters: number;
	readonly lastMinute: number;
	/** `Hedda (A03)` for every resident. */
	readonly residents: readonly string[];
	readonly acts: readonly { readonly title: string; readonly fromMinute: number; readonly toMinute: number }[];
	readonly povs: readonly { readonly agent: string; readonly label: string; readonly role: string; readonly dossier: string }[];
	readonly turningPoints: readonly { readonly seq: number; readonly minute: number; readonly text: string }[];
	readonly beats: readonly string[];
	readonly chronicle?: string;
	readonly evidence: readonly string[];
	readonly omitted: number;
	/** What every resident was told about the city, when the run has it. */
	readonly world?: string;
	/** The gamemaker's arc in brief: its summaries, moves and the refusals it met, one line each. */
	readonly gamemaker: readonly string[];
}

export function buildOutlinePrompt(input: OutlinePromptInput): string {
	const story = input.storyTitle === undefined ? "" : ` ${render("novelist/outline/story-title", { title: input.storyTitle })}`;
	const none = text("novelist/outline/none");
	const lines = [
		render("novelist/outline/run", { run: input.run, story, lastMinute: String(input.lastMinute) }),
		render("novelist/outline/plan", { words: String(input.words), chapters: String(input.chapters) }),
		"",
		...(input.world === undefined ? [] : [text("novelist/outline/world-heading"), input.world, ""]),
		text("novelist/outline/residents-heading"),
		input.residents.join(", "),
		"",
		text("novelist/outline/acts-heading"),
		...(input.acts.length === 0
			? [text("novelist/outline/acts-none")]
			: input.acts.map((act) => render("novelist/outline/act-line", { title: act.title, from: String(act.fromMinute), to: String(act.toMinute) }))),
		"",
		text("novelist/outline/povs-heading"),
	];
	for (const pov of input.povs) lines.push("", render("novelist/outline/pov-heading", { label: pov.label, role: pov.role }), "", pov.dossier);
	lines.push("", render("novelist/outline/gamemaker-heading", { pov: GAMEMAKER_POV }), "", gamemakerTeam(), "", text("novelist/outline/gamemaker-moves-heading"));
	lines.push(...(input.gamemaker.length === 0 ? [text("novelist/outline/gamemaker-none")] : input.gamemaker));
	lines.push("", text("novelist/outline/turning-heading"));
	lines.push(
		...(input.turningPoints.length === 0
			? [none]
			: input.turningPoints.map((point) => render("novelist/outline/turning-line", { seq: String(point.seq), minute: String(point.minute), text: point.text }))),
	);
	lines.push("", text("novelist/outline/beats-heading"), ...(input.beats.length === 0 ? [none] : input.beats));
	if (input.chronicle !== undefined) lines.push("", text("novelist/outline/chronicle-heading"), "", input.chronicle.trim());
	lines.push("", text("novelist/outline/evidence-heading"), ...input.evidence);
	if (input.omitted > 0) lines.push(render("novelist/outline/omitted", { omitted: String(input.omitted) }));
	lines.push("", text("novelist/outline/answer-shape"));
	return lines.join("\n");
}

export const writerSystemPrompt = (): string => render("novelist/writer-system", { context: storyContext(), truth: truth(), craft: craft() });

export interface ChapterPromptInput {
	readonly storyTitle: string;
	readonly outline: readonly string[];
	readonly chapterNumber: number;
	readonly chapterTitle: string;
	readonly povName: string;
	readonly words: number;
	readonly pack: string;
	/** The last paragraphs of the previous chapter (or of the prologue). */
	readonly previousEnding?: string;
	readonly question?: string;
	readonly glossary?: readonly GlossaryEntry[];
}

export function buildChapterPrompt(input: ChapterPromptInput): string {
	const lines = [
		render("novelist/chapter/story-outline", { title: input.storyTitle }),
		...input.outline,
		"",
		render("novelist/chapter/write", { number: String(input.chapterNumber), title: input.chapterTitle, pov: input.povName, words: String(input.words) }),
		...(input.question === undefined ? [] : [render("novelist/chapter/question", { question: input.question })]),
		text("novelist/chapter/instruction"),
		...glossaryLines(input.glossary ?? []),
	];
	if (input.previousEnding !== undefined) lines.push("", text("novelist/chapter/previous-heading"), "", input.previousEnding);
	lines.push("", text("novelist/chapter/material-heading"), "", input.pack);
	return lines.join("\n");
}

export const prologueSystemPrompt = (): string => render("novelist/prologue-system", { context: storyContext(), truth: truth(), craft: craft() });

export interface ProloguePromptInput {
	readonly storyTitle: string;
	readonly outline: readonly string[];
	readonly beats: readonly string[];
	readonly world?: string;
	/** `Hedda: ...` one line per point-of-view figure. */
	readonly figures: readonly string[];
	readonly glossary: readonly GlossaryEntry[];
}

export function buildProloguePrompt(input: ProloguePromptInput): string {
	return [
		render("novelist/prologue/story-chapters", { title: input.storyTitle }),
		...input.outline,
		"",
		text("novelist/prologue/beats-heading"),
		...(input.beats.length === 0 ? [text("novelist/prologue/beats-none")] : input.beats.map((beat) => `- ${beat}`)),
		...(input.world === undefined ? [] : ["", text("novelist/prologue/world-heading"), input.world]),
		"",
		text("novelist/prologue/figures-heading"),
		...input.figures,
		...glossaryLines(input.glossary),
	].join("\n");
}

export const gamemakerSystemPrompt = (): string => render("novelist/gamemaker-system", { context: storyContext(), team: gamemakerTeam(), truth: truth(), craft: craft() });

/** The edit pass answers with the story, this line, then its list of contradictions. */
export const EDIT_DELIMITER = "=== CONTRADICTIONS ===";

export const editSystemPrompt = (): string => render("novelist/edit-system", { context: storyContext(), truth: truth(), craft: craft(), delimiter: EDIT_DELIMITER });

export function buildEditPrompt(story: string, outline: readonly string[], facts: readonly string[] = [], glossary: readonly GlossaryEntry[] = []): string {
	return [
		text("novelist/edit/outline-heading"),
		...outline,
		...(facts.length === 0 ? [] : ["", text("novelist/edit/facts-heading"), ...facts.map((fact) => `- ${fact}`)]),
		...glossaryLines(glossary),
		"",
		text("novelist/edit/story-heading"),
		"",
		story,
	].join("\n");
}

/** Language codes `--translate` accepts, with the name the translator is told. */
export const LANGUAGES: Readonly<Record<string, string>> = { de: "German", fr: "French", es: "Spanish", it: "Italian" };

export function translateSystemPrompt(language: string): string {
	return render("novelist/translate-system", { context: storyContext(), language });
}
