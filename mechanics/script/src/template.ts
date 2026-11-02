/**
 * The story's `{name}` templates (copied from packages/kernel/src/templates.ts: a mechanic takes
 * only the authoring calls from the kernel).
 */
const PLACEHOLDER = /\{([A-Za-z][A-Za-z0-9]*)\}/g;

/** Placeholder names used in a template, in order of appearance. */
export function placeholdersOf(template: string): readonly string[] {
	return [...template.matchAll(PLACEHOLDER)].map((match) => match[1] ?? "");
}

/** Replaces `{name}` with `values[name]`; an unknown placeholder throws. */
export function renderTemplate(template: string, values: Readonly<Partial<Record<string, string>>>): string {
	return template.replace(PLACEHOLDER, (_match: string, name: string) => {
		const value = values[name];
		if (value === undefined) throw new Error(`Unknown placeholder {${name}}`);
		return value;
	});
}
