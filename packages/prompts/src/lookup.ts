/**
 * The layered prompt lookup the new core's host uses (`PromptLookup` in contracts): for one owner
 * (a mechanic id, or `core`) and prompt id, the story's file wins, then the owner's own folder,
 * then `library/prompts/`. The file must declare exactly the variables its owner declared.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parsePromptFile, renderBody, type PromptFile } from "./file.ts";
import { libraryDir } from "./library.ts";

export interface PromptLookupOptions {
	/** The story's prompt folder (`stories/<name>/prompts`). */
	readonly story?: string;
	/** Each mechanic's prompt folder, by mechanic id. */
	readonly mechanics?: Readonly<Record<string, string>>;
	/** Defaults to the repository's `library/prompts`. */
	readonly library?: string;
}

export interface LayeredPrompts {
	render(owner: string, id: string, variables: Readonly<Record<string, string | number>>, declared: readonly string[]): string;
	/** The file that supplies a prompt, or undefined. */
	pathOf(owner: string, id: string): string | undefined;
}

export function createPromptLookup(options: PromptLookupOptions = {}): LayeredPrompts {
	const cache = new Map<string, PromptFile>();
	const pathOf = (owner: string, id: string): string | undefined => {
		const folders = [options.story, options.mechanics?.[owner], options.library ?? libraryDir()];
		return folders.flatMap((folder) => (folder === undefined ? [] : [join(folder, `${id}.md`)])).find((path) => existsSync(path));
	};
	const load = (owner: string, id: string, declared: readonly string[]): PromptFile => {
		const path = pathOf(owner, id);
		if (path === undefined) throw new Error(`prompt "${id}" of ${owner}: no file in the story, the owner's folder or the library`);
		const cached = cache.get(path);
		if (cached !== undefined) return cached;
		const file = parsePromptFile(readFileSync(path, "utf8"), path);
		if (file.id !== id) throw new Error(`${path}: the file's id is "${file.id}", expected "${id}"`);
		if (file.variables.length !== declared.length || !declared.every((name) => file.variables.includes(name))) {
			throw new Error(`${path}: declares variables [${file.variables.join(", ")}], ${owner} declares [${declared.join(", ")}]`);
		}
		cache.set(path, file);
		return file;
	};
	return {
		render: (owner, id, variables, declared) => renderBody(load(owner, id, declared), variables),
		pathOf,
	};
}
