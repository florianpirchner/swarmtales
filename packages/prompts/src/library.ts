// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** Where the prompt library is: `library/prompts/`, the last place a prompt is looked up in. */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { noLibrary } from "./errors.ts";

let root: string | undefined;

/**
 * Finds the directory that holds `library/prompts/` by walking up from this module, so it is the
 * same from the sources (`packages/prompts/src`), from a build (`packages/prompts/dist`) and from an
 * installed package (which carries its own `library/`). Resolved on first use, never at import.
 *
 * @returns The directory.
 * @throws PromptError `SWT-P015` when no directory above this module holds `library/prompts/`.
 * @public
 */
export function libraryRoot(): string {
	if (root !== undefined) return root;
	const start = dirname(fileURLToPath(import.meta.url));
	let directory = start;
	while (!existsSync(join(directory, "library", "prompts"))) {
		const parent = dirname(directory);
		if (parent === directory) throw noLibrary(start);
		directory = parent;
	}
	root = directory;
	return directory;
}

/**
 * Names `library/prompts/`, where the prompt files of the library live.
 *
 * @returns The directory.
 * @throws PromptError `SWT-P015` when there is no `library/prompts/` above this module.
 * @public
 */
export function libraryDir(): string {
	return join(libraryRoot(), "library", "prompts");
}
