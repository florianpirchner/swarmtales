/**
 * The writer's calls (model): the prologue, one chapter from its pack, a
 * gamemaker interlude from the control room's thinking, the edit pass over
 * the whole text and the translation, part by part. Answers are prose; the code strips what is not (headings,
 * fences) and refuses an edit that lost the story's structure.
 */
import type { NovelModel, NovelSpend } from "./model.ts";
import { addSpend, MAX_TOKENS, NO_SPEND, NovelRequestError } from "./model.ts";
import {
	buildChapterPrompt,
	buildEditPrompt,
	buildInterludePrompt,
	buildProloguePrompt,
	EDIT_DELIMITER,
	EDIT_SYSTEM_PROMPT,
	INTERLUDE_SYSTEM_PROMPT,
	PROLOGUE_SYSTEM_PROMPT,
	translateSystemPrompt,
	WRITER_SYSTEM_PROMPT,
	type ChapterPromptInput,
	type GlossaryEntry,
	type InterludePromptInput,
	type ProloguePromptInput,
} from "./prompts.ts";

export interface WrittenText {
	readonly text: string;
	readonly spend: NovelSpend;
}

export async function writeChapter(model: NovelModel, input: ChapterPromptInput): Promise<WrittenText> {
	const answer = await model.complete(WRITER_SYSTEM_PROMPT, buildChapterPrompt(input), MAX_TOKENS.chapter);
	return { text: cleanProse(answer.text), spend: answer.spend };
}

export async function writePrologue(model: NovelModel, input: ProloguePromptInput): Promise<WrittenText> {
	const answer = await model.complete(PROLOGUE_SYSTEM_PROMPT, buildProloguePrompt(input), MAX_TOKENS.chapter);
	return { text: cleanProse(answer.text), spend: answer.spend };
}

export async function writeInterlude(model: NovelModel, input: InterludePromptInput): Promise<WrittenText> {
	const answer = await model.complete(INTERLUDE_SYSTEM_PROMPT, buildInterludePrompt(input), MAX_TOKENS.interlude);
	return { text: italicize(cleanProse(answer.text)), spend: answer.spend };
}

export interface EditedStory {
	readonly text: string;
	readonly contradictions: readonly string[];
	/** Why the edit was not taken, if it was not. */
	readonly warnings: readonly string[];
	readonly spend: NovelSpend;
}

export async function editStory(model: NovelModel, story: string, outline: readonly string[], facts: readonly string[] = [], glossary: readonly GlossaryEntry[] = []): Promise<EditedStory> {
	const answer = await model.complete(EDIT_SYSTEM_PROMPT, buildEditPrompt(story, outline, facts, glossary), MAX_TOKENS.edit);
	return { ...interpretEdit(story, answer.text), spend: answer.spend };
}

/** Splits the editor's answer; keeps the unedited story when the edit lost headings or much of the text. */
export function interpretEdit(original: string, answer: string): Omit<EditedStory, "spend"> {
	const warnings: string[] = [];
	const at = answer.lastIndexOf(EDIT_DELIMITER);
	if (at < 0) warnings.push(`the editor's answer has no "${EDIT_DELIMITER}" line; it lists no contradictions`);
	let body = stripFences(at < 0 ? answer : answer.slice(0, at)).trim();
	// "Here is the corrected story:" before the title would end up in the book.
	const title = body.search(/^# /m);
	if (original.startsWith("# ") && title > 0) {
		warnings.push("the editor's answer had text before the title; it was removed");
		body = body.slice(title);
	}
	const contradictions =
		at < 0
			? []
			: answer
					.slice(at + EDIT_DELIMITER.length)
					.split(/\r?\n/)
					.map((line) => line.trim())
					.filter((line) => line.startsWith("- "))
					.map((line) => line.slice(2).trim())
					.filter((line) => line.length > 0 && line.toLowerCase() !== "none");
	// The structure: headings and the `* * *` lines around the interludes.
	const headings = (text: string): string =>
		text
			.split(/\r?\n/)
			.filter((line) => line.startsWith("#") || line.trim() === "* * *")
			.join("\n");
	if (headings(body) !== headings(original)) {
		warnings.push("the edited text changed or lost chapter headings or interludes; the unedited text was kept");
		return { text: original, contradictions, warnings };
	}
	if (body.length < original.length * 0.7) {
		warnings.push(`the edited text is much shorter (${String(body.length)} of ${String(original.length)} characters); the unedited text was kept`);
		return { text: original, contradictions, warnings };
	}
	return { text: `${body}\n`, contradictions, warnings };
}

export interface TranslatedStory {
	readonly text: string;
	readonly spend: NovelSpend;
	/** Parts the fallback model translated, and why. */
	readonly warnings: readonly string[];
}

/**
 * Translates the story part by part (the header, the prologue, then each
 * chapter with the interlude after it), so no answer has to hold the whole
 * book. A part the model refuses, or whose headings or interlude lines it
 * loses, goes to the fallback model, which gets two tries (Anthropic refuses
 * some harmless parts, P56); if all fail, the error says which part.
 */
export async function translateStory(
	model: NovelModel,
	story: string,
	language: string,
	options: { readonly fallback?: NovelModel; readonly onPart?: (part: number, parts: number, model: NovelModel) => void } = {},
): Promise<TranslatedStory> {
	const parts = storyParts(story);
	const system = translateSystemPrompt(language);
	let spend = NO_SPEND;
	const warnings: string[] = [];
	const translated: string[] = [];
	const attempt = async (by: NovelModel, whole: string, where: string): Promise<string> => {
		// Models drop a closing `* * *` at the very end of a part; it is kept out of the request and put back.
		const tail = /(?:\n\s*\* \* \*\s*)+$/.exec(whole)?.[0] ?? "";
		const part = whole.slice(0, whole.length - tail.length);
		let answer;
		try {
			answer = await by.complete(system, part, MAX_TOKENS.chapter);
		} catch (error) {
			if (error instanceof NovelRequestError) throw new TranslationError(`${where}: ${error.message}`, addSpend(spend, error.spend));
			throw error;
		}
		spend = addSpend(spend, answer.spend);
		const text = stripFences(answer.text).trim();
		if (structure(text).length !== structure(part).length) throw new TranslationError(`${where}: the translation changed the headings or interlude lines`, spend);
		return tail.length === 0 ? text : `${text}\n\n${tail.trim().split(/\s*\n\s*/).join("\n\n")}`;
	};
	for (const [index, part] of parts.entries()) {
		const where = `part ${String(index + 1)} of ${String(parts.length)}`;
		// The writer, then the fallback twice: a lost heading is seldom repeated on a second try.
		const tries = options.fallback === undefined ? [model, model] : [model, options.fallback, options.fallback];
		for (const [attemptIndex, by] of tries.entries()) {
			options.onPart?.(index + 1, parts.length, by);
			try {
				translated.push(await attempt(by, part, where));
				break;
			} catch (error) {
				if (!(error instanceof TranslationError)) throw error;
				if (attemptIndex === tries.length - 1) throw new TranslationError([...warnings, error.message].join("; "), error.spend);
				spend = error.spend;
				const next = tries[attemptIndex + 1] ?? by;
				warnings.push(`${error.message}; ${next === by ? "tried again" : `${next.label} translated it instead`}`);
			}
		}
	}
	return { text: `${translated.join("\n\n")}\n`, spend, warnings };
}

/** The translation of a part was unusable; what it cost so far is kept. */
export class TranslationError extends NovelRequestError {}

/** The story cut before every chapter heading (`## `). */
export function storyParts(story: string): readonly string[] {
	return story
		.split(/\r?\n(?=## )/)
		.map((part) => part.trim())
		.filter((part) => part.length > 0);
}

function structure(text: string): readonly string[] {
	return text.split(/\r?\n/).filter((line) => line.startsWith("#") || line.trim() === "* * *");
}

/** Prose only: no code fences and no heading lines. */
export function cleanProse(text: string): string {
	return stripFences(text)
		.split(/\r?\n/)
		.filter((line) => !line.trimStart().startsWith("#"))
		.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

function stripFences(text: string): string {
	return text.replace(/^\s*```[a-z]*\s*\n/i, "").replace(/\n\s*```\s*$/i, "");
}

/** Every paragraph in `*italics*`. */
export function italicize(text: string): string {
	return text
		.split(/\n\s*\n/)
		// Inner emphasis would break the italics around the paragraph.
		.map((paragraph) => paragraph.replace(/\*+/g, "").trim().replace(/^_+|_+$/g, "").trim())
		.filter((paragraph) => paragraph.length > 0)
		.map((paragraph) => `*${paragraph.replace(/\s*\n\s*/g, " ")}*`)
		.join("\n\n");
}

/** The last paragraphs of a chapter, for the next chapter's continuity. */
export function lastParagraphs(text: string, count = 3, maxChars = 1_500): string {
	const paragraphs = text.split(/\n\s*\n/).filter((paragraph) => paragraph.trim().length > 0);
	const ending = paragraphs.slice(-count).join("\n\n");
	return ending.length <= maxChars ? ending : ending.slice(ending.length - maxChars);
}
