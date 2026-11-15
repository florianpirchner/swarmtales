// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The game's `{name}` templates of the script's texts, carried from `legacy` `mechanics/script/src/template.ts` (a
 * copy of the old kernel's templates, because a mechanic takes only the authoring calls from the platform).
 */
const PLACEHOLDER = /\{([A-Za-z][A-Za-z0-9]*)\}/g;

/**
 * The placeholder names a template uses, in order of appearance.
 *
 * @param template - The text.
 * @returns The names.
 */
export function placeholdersOf(template: string): readonly string[] {
	return [...template.matchAll(PLACEHOLDER)].map((match) => match[1] ?? "");
}

/**
 * Replaces `{name}` with `values[name]`.
 *
 * @param template - The text.
 * @param values - The values by name.
 * @returns The text with every placeholder replaced.
 * @throws RangeError for a placeholder without a value (the kernel ends the run).
 */
export function renderTemplate(template: string, values: Readonly<Partial<Record<string, string>>>): string {
	return template.replace(PLACEHOLDER, (_match: string, name: string) => {
		const value = values[name];
		if (value === undefined) throw new RangeError(`script: unknown placeholder {${name}}`);
		return value;
	});
}
