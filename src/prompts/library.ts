/**
 * The prompt library. Lookup order: the story's own file (`stories/<story>/prompts/<id>.md`), then
 * `library/prompts/<id>.md`. A plugin layer between the two comes with plugins.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parsePromptFile, renderBody, type PromptFile } from "./file.ts";
import { PROMPTS, type PlainPromptId, type PromptId, type PromptVariables } from "./registry.ts";

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const STORIES_DIR = join(REPO_ROOT, "stories");
export const LIBRARY_DIR = join(REPO_ROOT, "library", "prompts");

export interface RenderOptions {
	/** The story whose `prompts/` folder may override the library's file. */
	readonly story?: string;
	/** Where the stories live; the repository's `stories/` unless a test points elsewhere. */
	readonly storiesDir?: string;
}

const cache = new Map<string, PromptFile>();

/** The file that supplies `id`: the story's override when there is one, else the library's. */
export function promptPath(id: PromptId, options: RenderOptions = {}): string {
	if (options.story !== undefined) {
		const override = join(options.storiesDir ?? STORIES_DIR, options.story, "prompts", `${id}.md`);
		if (existsSync(override)) return override;
	}
	return join(LIBRARY_DIR, `${id}.md`);
}

export function loadPrompt(id: PromptId, options: RenderOptions = {}): PromptFile {
	const path = promptPath(id, options);
	const cached = cache.get(path);
	if (cached !== undefined) return cached;
	const file = parsePromptFile(readFileSync(path, "utf8"), path);
	const expected: readonly string[] = PROMPTS[id];
	if (file.id !== id) throw new Error(`${path}: the file's id is "${file.id}", expected "${id}"`);
	if (file.variables.length !== expected.length || !expected.every((name) => file.variables.includes(name))) {
		throw new Error(`${path}: declares variables [${file.variables.join(", ")}], expected [${expected.join(", ")}]`);
	}
	cache.set(path, file);
	return file;
}

/** Renders a prompt; throws on a missing or unknown variable. */
export function render<I extends PromptId>(id: I, variables: PromptVariables<I>, options: RenderOptions = {}): string {
	return renderBody(loadPrompt(id, options), variables);
}

/** A prompt without variables, as it stands in its file. */
export function text(id: PlainPromptId, options: RenderOptions = {}): string {
	return loadPrompt(id, options).body;
}
