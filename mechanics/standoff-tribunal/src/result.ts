// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** A value or a structured error code, for the court's actions that can fail (carried from the old `result.ts`). */

/**
 * A value, or an error code with its detail.
 *
 * @public
 */
export type Result<T, E extends string> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E; readonly detail?: string };

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
 * An error.
 *
 * @param error - The code.
 * @param detail - The detail.
 * @returns The result.
 */
export function err<E extends string>(error: E, detail?: string): { readonly ok: false; readonly error: E; readonly detail?: string } {
	return detail === undefined ? { ok: false, error } : { ok: false, error, detail };
}
