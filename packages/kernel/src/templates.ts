/**
 * Text templates with `{name}` placeholders.
 *
 * The type helpers catch unknown placeholders at compile time when a template
 * is a string literal; {@link renderTemplate} and the validator catch the rest.
 */

const PLACEHOLDER = /\{([A-Za-z][A-Za-z0-9]*)\}/g;

/** Union of placeholder names in a literal template. */
export type PlaceholdersOf<S extends string> = S extends `${string}{${infer Name}}${infer Rest}`
	? Name | PlaceholdersOf<Rest>
	: never;

/**
 * `S` when every placeholder in `S` is allowed, otherwise a descriptive string
 * type that no literal can satisfy, which turns the typo into a compile error.
 */
export type CheckedTemplate<S extends string, Allowed extends string> = [Exclude<PlaceholdersOf<S>, Allowed>] extends [
	never,
]
	? S
	: `Unknown placeholder {${Exclude<PlaceholdersOf<S>, Allowed>}} in template`;

export class TemplateError extends Error {
	override readonly name = "TemplateError";
}

/** Placeholder names used in a template, in order of appearance. */
export function placeholdersOf(template: string): readonly string[] {
	return [...template.matchAll(PLACEHOLDER)].map((match) => match[1] ?? "");
}

/** Placeholder names not contained in `allowed`. */
export function unknownPlaceholders(template: string, allowed: readonly string[]): readonly string[] {
	return placeholdersOf(template).filter((name) => !allowed.includes(name));
}

/** Replaces `{name}` with `values[name]`; an unknown placeholder throws. */
export function renderTemplate(template: string, values: Readonly<Partial<Record<string, string>>>): string {
	return template.replace(PLACEHOLDER, (_match: string, name: string) => {
		const value = values[name];
		if (value === undefined) throw new TemplateError(`Unknown placeholder {${name}}`);
		return value;
	});
}
