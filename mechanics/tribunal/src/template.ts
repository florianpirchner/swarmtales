/** Small helpers copied from the kernel and the old engine (a mechanic imports only the kernel's authoring calls). */

const PLACEHOLDER = /\{([A-Za-z][A-Za-z0-9]*)\}/g;

/** Replaces `{name}` with `values[name]`; an unknown placeholder throws (a copy of packages/kernel/src/templates.ts). */
export function renderTemplate(template: string, values: Readonly<Partial<Record<string, string>>>): string {
	return template.replace(PLACEHOLDER, (_match: string, name: string) => {
		const value = values[name];
		if (value === undefined) throw new Error(`Unknown placeholder {${name}}`);
		return value;
	});
}

/** "A04", "A04 and A05", "A02, A04 and A05"; `nobody` for none (old `namesOf`, factions.ts). */
export function namesOf(ids: readonly string[]): string {
	if (ids.length === 0) return "nobody";
	const last = ids.at(-1) ?? "";
	return ids.length === 1 ? last : `${ids.slice(0, -1).join(", ")} and ${last}`;
}

/** A value or a structured error code (a copy of the old engine's `Result`). */
export type Result<T, E extends string> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E; readonly detail?: string };

export function ok<T>(value: T): { readonly ok: true; readonly value: T } {
	return { ok: true, value };
}

export function err<E extends string>(error: E, detail?: string): { readonly ok: false; readonly error: E; readonly detail?: string } {
	return detail === undefined ? { ok: false, error } : { ok: false, error, detail };
}
