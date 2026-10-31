/** A value or a structured error code, for the book's actions that can fail (a copy of the old engine's `Result`, since mechanics import only the authoring calls of the kernel). */
export type Result<T, E extends string> =
	| { readonly ok: true; readonly value: T }
	| { readonly ok: false; readonly error: E; readonly detail?: string };

export function ok<T>(value: T): { readonly ok: true; readonly value: T } {
	return { ok: true, value };
}

export function err<E extends string>(error: E, detail?: string): { readonly ok: false; readonly error: E; readonly detail?: string } {
	return detail === undefined ? { ok: false, error } : { ok: false, error, detail };
}
