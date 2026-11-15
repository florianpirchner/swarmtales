// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The layered prompt lookup (`PromptLookup` in the contracts): for one owner (a mechanic id, or the
 * kernel) and prompt id, the game's file wins, then the owner's own folder, then `library/prompts/`.
 * The file must declare exactly the variables its owner declared.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { noFile, variablesDiffer, wrongId } from "./errors.ts";
import { parsePromptFile, renderBody, type PromptFile } from "./file.ts";
import { libraryDir, libraryRoot } from "./library.ts";
import type { PromptLookup } from "@swarmtales/contracts";

/**
 * Where a lookup finds its files.
 *
 * @public
 */
export interface PromptLookupOptions {
	/** The game's prompt folder (`games/<name>/prompts`). */
	readonly game?: string;
	/** Each mechanic's prompt folder, by mechanic id; defaults to `mechanicPromptFolders()`. */
	readonly mechanics?: Readonly<Record<string, string>>;
	/** Defaults to the repository's `library/prompts`. */
	readonly library?: string;
}

/**
 * A prompt lookup over folders.
 *
 * @public
 */
export interface LayeredPrompts extends PromptLookup {
	/**
	 * Finds the file that supplies a prompt.
	 *
	 * @param owner - The id of the plugin that owns the prompt.
	 * @param id - The prompt id.
	 * @returns The path of the file, or `undefined` when no folder has one.
	 */
	pathOf(owner: string, id: string): string | undefined;
}

/**
 * Lists the prompt folder of every mechanic package of the repository (`mechanics/<id>/prompts`).
 *
 * @returns The folders by mechanic id; empty where the repository's mechanics are not around (an installed
 * package).
 * @throws PromptError `SWT-P015` when there is no `library/prompts/` above this module.
 * @public
 */
export function mechanicPromptFolders(): Readonly<Record<string, string>> {
	const mechanics = join(libraryRoot(), "mechanics");
	if (!existsSync(mechanics)) return {};
	return Object.fromEntries(
		readdirSync(mechanics, { withFileTypes: true })
			.filter((entry) => entry.isDirectory() && existsSync(join(mechanics, entry.name, "prompts")))
			.map((entry) => [entry.name, join(mechanics, entry.name, "prompts")]),
	);
}

/**
 * Creates the layered lookup.
 *
 * @param options - The folders; by default the repository's mechanics and library, and no game folder.
 * @returns The lookup. Its `render` throws a `PromptError`: `SWT-P010` when no folder has the file, `SWT-P011` for
 * a malformed file, `SWT-P012` when the file's id is not the id asked for, `SWT-P013` when it does not declare
 * exactly the variables its owner declared, `SWT-P014` when the values given are not those variables.
 * @throws PromptError `SWT-P015` when a default folder is needed and there is no `library/prompts/` above this module.
 * @public
 */
export function createPromptLookup(options: PromptLookupOptions = {}): LayeredPrompts {
	const cache = new Map<string, PromptFile>();
	const mechanics = options.mechanics ?? mechanicPromptFolders();
	const pathOf = (owner: string, id: string): string | undefined => {
		const folders = [options.game, mechanics[owner], options.library ?? libraryDir()];
		return folders.flatMap((folder) => (folder === undefined ? [] : [join(folder, `${id}.md`)])).find((path) => existsSync(path));
	};
	const load = (owner: string, id: string, declared: readonly string[]): PromptFile => {
		const path = pathOf(owner, id);
		if (path === undefined) throw noFile(owner, id);
		const cached = cache.get(path);
		if (cached !== undefined) return cached;
		const file = parsePromptFile(readFileSync(path, "utf8"), path);
		if (file.id !== id) throw wrongId(path, file.id, id);
		if (file.variables.length !== declared.length || !declared.every((name) => file.variables.includes(name))) {
			throw variablesDiffer(path, file.variables, owner, declared);
		}
		cache.set(path, file);
		return file;
	};
	return {
		render: (owner, id, variables, declared) => renderBody(load(owner, id, declared), variables),
		pathOf,
	};
}
