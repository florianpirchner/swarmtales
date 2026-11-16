// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The errors of this package: the catalogue of the codes `SWT-P010` to `SWT-P015`. The package builds them itself
 * as an `SwtError` of the contracts (it may not import the sdk, whose catalogue holds `SWT-P003`).
 */
import { SwtError } from "@swarmtales/contracts";

/**
 * A prompt file that is missing, malformed or used with the wrong variables: an `SwtError` with one issue of the
 * codes `SWT-P010` to `SWT-P015`. The summary names the file or the prompt and what is wrong with it.
 *
 * @remarks
 * `SWT-P010` no folder has the file; `SWT-P011` the frontmatter is missing or malformed; `SWT-P012` the file states
 * another id than its path; `SWT-P013` the file and its owner declare different variables; `SWT-P014` a render
 * with a missing, an unknown or an undeclared variable; `SWT-P015` there is no `library/prompts/`.
 *
 * @example
 * ```ts
 * try {
 * 	lookup.render("grid-game", "grid-game/tools/playMove", {}, []);
 * } catch (error) {
 * 	if (error instanceof PromptError && error.code === "SWT-P010") console.error(error.message);
 * }
 * ```
 *
 * @internal
 */
export class PromptError extends SwtError {}

const issue = (code: string, summary: string, why: string, fix: string, file?: string): PromptError =>
	new PromptError(file === undefined ? { code, summary, why, fix } : { code, summary, where: { file }, why, fix });

/**
 * `SWT-P010`: no folder has a file for the prompt.
 *
 * @param owner - The id of the plugin that owns the prompt.
 * @param id - The prompt id.
 * @returns The error.
 */
export function noFile(owner: string, id: string): PromptError {
	return issue("SWT-P010", `prompt "${id}" of ${owner}: no file in the game, the owner's folder or the library`, "Every prompt a plugin declares needs a text file.", `Add ${id}.md to the prompts folder of ${owner}, of the game or of the library.`);
}

/**
 * `SWT-P011`: the frontmatter of a prompt file is missing or malformed.
 *
 * @param file - The file's name.
 * @param problem - What is wrong, as the rest of a sentence that starts with the file's name.
 * @returns The error.
 */
export function badFrontmatter(file: string, problem: string): PromptError {
	return issue("SWT-P011", `${file}: ${problem}`, "A prompt file starts with a frontmatter that holds `id` and `variables`.", "Write `---`, `id: <path without .md>`, `variables: <names, separated by commas>` and `---` above the text.", file);
}

/**
 * `SWT-P012`: a prompt file states another id than the one it was found under.
 *
 * @param file - The file's path.
 * @param found - The id the file states.
 * @param expected - The id that was asked for.
 * @returns The error.
 */
export function wrongId(file: string, found: string, expected: string): PromptError {
	return issue("SWT-P012", `${file}: the file's id is "${found}", expected "${expected}"`, "A prompt file states its own id: its path under the prompts folder, without `.md`.", `Set the id to "${expected}", or move the file.`, file);
}

/**
 * `SWT-P013`: a prompt file and the owner of the prompt declare different variables.
 *
 * @param file - The file's path.
 * @param variables - The variables the file declares.
 * @param owner - The id of the plugin that owns the prompt.
 * @param declared - The variables the owner declares.
 * @returns The error.
 */
export function variablesDiffer(file: string, variables: readonly string[], owner: string, declared: readonly string[]): PromptError {
	return issue("SWT-P013", `${file}: declares variables [${variables.join(", ")}], ${owner} declares [${declared.join(", ")}]`, "A prompt file declares exactly the variables its owner declares.", "Make the `variables` line of the file and the declaration of the owner the same.", file);
}

/**
 * `SWT-P014`: a prompt is rendered with a missing, an unknown or an undeclared variable.
 *
 * @param id - The prompt id.
 * @param problem - What is wrong, as the rest of a sentence that starts with the prompt.
 * @returns The error.
 */
export function badVariable(id: string, problem: string): PromptError {
	return issue("SWT-P014", `prompt ${id}: ${problem}`, "A prompt is rendered with a value for exactly the variables it declares.", "Pass a value for every declared variable and for no other, and declare every variable the text uses.");
}

/**
 * `SWT-P015`: no directory above the package holds `library/prompts/`.
 *
 * @param start - The directory the search started in.
 * @returns The error.
 */
export function noLibrary(start: string): PromptError {
	return issue("SWT-P015", `No library/prompts found above ${start}`, "The prompt library is the last place a prompt is looked up in.", "Run from a checkout or from an installed package that carries `library/prompts/`.");
}
