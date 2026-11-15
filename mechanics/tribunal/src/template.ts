// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** Small helpers carried from the old `template.ts` (copies of the old kernel's template and the old engine's `Result`). */
import { SwtError } from "@swarmtales/contracts";
import { optionMismatch } from "@swarmtales/sdk";

const PLACEHOLDER = /\{([A-Za-z][A-Za-z0-9]*)\}/g;

/**
 * Replaces `{name}` with `values[name]` (old `renderTemplate`).
 *
 * @param template - A text of the options.
 * @param values - The values by name.
 * @returns The text filled in.
 * @throws SwtError `SWT-G020` when the text names a placeholder that has no value.
 */
export function renderTemplate(template: string, values: Readonly<Partial<Record<string, string>>>): string {
	return template.replace(PLACEHOLDER, (_match: string, name: string) => {
		const value = values[name];
		if (value === undefined) throw new SwtError(optionMismatch({ owner: "tribunal", package: "@swarmtales/mechanic-tribunal", path: "options.texts", message: `has a text with the unknown placeholder {${name}}` }));
		return value;
	});
}

/**
 * "A04", "A04 and A05", "A02, A04 and A05"; `nobody` for none (old `namesOf`).
 *
 * @param ids - The ids.
 * @returns The list in words.
 */
export function namesOf(ids: readonly string[]): string {
	if (ids.length === 0) return "nobody";
	const last = ids.at(-1) ?? "";
	return ids.length === 1 ? last : `${ids.slice(0, -1).join(", ")} and ${last}`;
}

/**
 * A value or a refusal code with its detail (the old engine's `Result`).
 *
 * @public
 */
export type Result<T, E extends string> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E; readonly detail: string };

/**
 * A value.
 *
 * @param value - The value.
 * @returns The result.
 */
export function ok<T>(value: T): { readonly ok: true; readonly value: T } {
	return { ok: true, value };
}

/**
 * A refusal.
 *
 * @param error - The code.
 * @param detail - The detail.
 * @returns The result.
 */
export function err<E extends string>(error: E, detail: string): { readonly ok: false; readonly error: E; readonly detail: string } {
	return { ok: false, error, detail };
}
