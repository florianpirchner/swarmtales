/** Text templates with `{name}` placeholders (a copy of packages/kernel/src/templates.ts). */
const PLACEHOLDER = /\{([A-Za-z][A-Za-z0-9]*)\}/g;

/** Replaces `{name}` with `values[name]`; an unknown placeholder throws. */
export function renderTemplate(template: string, values: Readonly<Partial<Record<string, string>>>): string {
	return template.replace(PLACEHOLDER, (_match: string, name: string) => {
		const value = values[name];
		if (value === undefined) throw new Error(`Unknown placeholder {${name}}`);
		return value;
	});
}
