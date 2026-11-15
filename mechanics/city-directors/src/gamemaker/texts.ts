// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The gamemaker's prompt files are carried byte for byte under `prompts/gamemaker/` of this package, with their old
 * ids. A Director reads no file: the game composes the texts when it builds the gamemaker's options
 * (`gamemakerOptions`), through the prompt lookup it is given, and the Director reads them from its options.
 */
import type { PromptLookup } from "@swarmtales/contracts";

/**
 * The owner the gamemaker's prompt files are looked up under: the folder of this package.
 *
 * @public
 */
export const GAMEMAKER_PROMPT_OWNER = "city-directors";

/**
 * The two ways the composer reads a prompt file (the old `text` and `render` of the prompts package).
 *
 * @public
 */
export interface GamemakerTexts {
	/** A prompt without variables. */
	text(id: string): string;
	/** A prompt with the value of each of its variables; the file must declare exactly these. */
	render(id: string, values: Readonly<Record<string, string | number>>): string;
}

/**
 * The texts of the gamemaker through a prompt lookup.
 *
 * @param lookup - The game's prompt lookup (the prompts package's `createPromptLookup()`).
 * @returns The two readers, each under {@link GAMEMAKER_PROMPT_OWNER}.
 * @throws Whatever the lookup throws, from a reader: a missing file, or variables that differ from the file's.
 *
 * @public
 */
export function gamemakerTexts(lookup: PromptLookup): GamemakerTexts {
	const render = (id: string, values: Readonly<Record<string, string | number>>): string => lookup.render(GAMEMAKER_PROMPT_OWNER, id, values, Object.keys(values));
	return { text: (id) => render(id, {}), render };
}

/**
 * Fills the variables of a template that the options hold (a prompt rendered with `{{name}}` for each variable):
 * every `{{name}}` of `values` is replaced in one pass, so a value that holds braces stays as it is.
 *
 * @param template - The template.
 * @param values - The value of each variable.
 * @returns The text.
 *
 * @public
 */
export function fillTemplate(template: string, values: Readonly<Record<string, string | number>>): string {
	return template.replace(/\{\{([A-Za-z][A-Za-z0-9]*)\}\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
}
