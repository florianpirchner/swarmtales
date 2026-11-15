// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** Text templates with `{name}` placeholders (carried from the old `mechanics/goals/src/template.ts`). */
const PLACEHOLDER = /\{([A-Za-z][A-Za-z0-9]*)\}/g;

/**
 * Replaces `{name}` with `values[name]`.
 *
 * @param template - The template.
 * @param values - The value of each placeholder.
 * @returns The filled text.
 * @throws RangeError for an unknown placeholder.
 */
export function renderTemplate(template: string, values: Readonly<Partial<Record<string, string>>>): string {
	return template.replace(PLACEHOLDER, (_match: string, name: string) => {
		const value = values[name];
		if (value === undefined) throw new RangeError(`goals: unknown placeholder {${name}}`);
		return value;
	});
}
