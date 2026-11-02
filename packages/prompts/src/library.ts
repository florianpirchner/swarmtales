/**
 * The prompt library. Lookup order: the story's own file (`stories/<story>/prompts/<id>.md`), then
 * `library/prompts/<id>.md`. A plugin layer between the two comes with plugins.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parsePromptFile, renderBody, type PromptFile } from "./file.ts";
import { PROMPTS, type PlainPromptId, type PromptId, type PromptVariables } from "./registry.ts";

let root: string | undefined;

/**
 * The directory that holds `library/prompts/`: found by walking up from this module, so it is the
 * same from the sources (`packages/prompts/src`), from a build (`packages/prompts/dist`) and from an
 * installed package (which carries its own `library/`). Resolved on first use, never at import.
 */
export function libraryRoot(): string {
	if (root !== undefined) return root;
	const start = dirname(fileURLToPath(import.meta.url));
	let directory = start;
	while (!existsSync(join(directory, "library", "prompts"))) {
		const parent = dirname(directory);
		if (parent === directory) throw new Error(`No library/prompts found above ${start}`);
		directory = parent;
	}
	root = directory;
	return directory;
}

/** `library/prompts/`, where the prompt files live. */
export function libraryDir(): string {
	return join(libraryRoot(), "library", "prompts");
}

/** The repository's `stories/` folder, the default place for story overrides. */
export function storiesDir(): string {
	return join(libraryRoot(), "stories");
}

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
		const override = join(options.storiesDir ?? storiesDir(), options.story, "prompts", `${id}.md`);
		if (existsSync(override)) return override;
	}
	return join(libraryDir(), `${id}.md`);
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
