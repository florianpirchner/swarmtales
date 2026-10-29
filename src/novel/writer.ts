/**
 * The writer's three calls (model): one chapter from its pack, a gamemaker
 * interlude from the control room's thinking, and the edit pass over the
 * whole text. Answers are prose; the code strips what is not (headings,
 * fences) and refuses an edit that lost the story's structure.
 */
import type { NovelModel, NovelSpend } from "./model.ts";
import { MAX_TOKENS } from "./model.ts";
import {
	buildChapterPrompt,
	buildEditPrompt,
	buildInterludePrompt,
	EDIT_DELIMITER,
	EDIT_SYSTEM_PROMPT,
	INTERLUDE_SYSTEM_PROMPT,
	WRITER_SYSTEM_PROMPT,
	type ChapterPromptInput,
	type InterludePromptInput,
} from "./prompts.ts";

export interface WrittenText {
	readonly text: string;
	readonly spend: NovelSpend;
}

export async function writeChapter(model: NovelModel, input: ChapterPromptInput): Promise<WrittenText> {
	const answer = await model.complete(WRITER_SYSTEM_PROMPT, buildChapterPrompt(input), MAX_TOKENS.chapter);
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

export async function editStory(model: NovelModel, story: string, outline: readonly string[]): Promise<EditedStory> {
	const answer = await model.complete(EDIT_SYSTEM_PROMPT, buildEditPrompt(story, outline), MAX_TOKENS.edit);
	return { ...interpretEdit(story, answer.text), spend: answer.spend };
}

/** Splits the editor's answer; keeps the unedited story when the edit lost headings or much of the text. */
export function interpretEdit(original: string, answer: string): Omit<EditedStory, "spend"> {
	const warnings: string[] = [];
	const at = answer.lastIndexOf(EDIT_DELIMITER);
	if (at < 0) warnings.push(`the editor's answer has no "${EDIT_DELIMITER}" line; it lists no contradictions`);
	const body = stripFences(at < 0 ? answer : answer.slice(0, at)).trim();
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
	const headings = (text: string): string => text.split(/\r?\n/).filter((line) => line.startsWith("#")).join("\n");
	if (headings(body) !== headings(original)) {
		warnings.push("the edited text changed or lost chapter headings; the unedited text was kept");
		return { text: original, contradictions, warnings };
	}
	if (body.length < original.length * 0.7) {
		warnings.push(`the edited text is much shorter (${String(body.length)} of ${String(original.length)} characters); the unedited text was kept`);
		return { text: original, contradictions, warnings };
	}
	return { text: `${body}\n`, contradictions, warnings };
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
