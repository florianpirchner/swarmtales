// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The prompt lookup: the one interface through which a text file is found and rendered. It is declared here so
 * that the sdk and the prompts package both name it without importing each other.
 */

/**
 * Finds and renders prompt files. Lookup order: the game's folder, then the owning mechanic's folder, then
 * `library/prompts/`. The prompts package implements it.
 *
 * @public
 */
export interface PromptLookup {
	/**
	 * Renders one prompt.
	 *
	 * @param owner - The id of the plugin that owns the prompt.
	 * @param id - The prompt id: a path under the owner's `prompts/` folder, without `.md`.
	 * @param variables - The value of every variable of the prompt.
	 * @param declared - The variable names the owner declared for `id`; the file must declare exactly these.
	 * @returns The rendered text.
	 * @throws When the file is missing or its variables differ from `declared`.
	 */
	render(owner: string, id: string, variables: Readonly<Record<string, string | number>>, declared: readonly string[]): string;
}
