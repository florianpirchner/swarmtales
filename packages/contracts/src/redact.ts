// SPDX-License-Identifier: Apache-2.0
/**
 * Secrets out of a text before it reaches a signed log, a file of a run folder or the terminal. A thrown message
 * or a provider's error text is recorded as written, and a signed line cannot be edited later: Node's `Request`
 * echoes a URL with its credentials whole, and a provider may echo the key it was given. The patterns are
 * deliberately narrow: the credentials of a URL, keys of the form `sk-...` and bearer tokens.
 */

/**
 * A function that takes secrets out of a text.
 *
 * @public
 */
export type Redact = (text: string) => string;

const PATTERNS: readonly (readonly [RegExp, string])[] = [
	// scheme://user:secret@host, scheme://token@host
	[/\b([a-z][a-z0-9+.-]*:\/\/)[^\s/@]+@/gi, "$1[redacted]@"],
	// API keys shaped like sk-..., sk-ant-..., sk-or-v1-...
	[/\bsk-[A-Za-z0-9_-]{16,}/g, "sk-[redacted]"],
	[/\b(Bearer\s+)[A-Za-z0-9._~+/=-]{16,}/g, "$1[redacted]"],
];

/**
 * URL credentials, keys of the form `sk-...` and bearer tokens become `[redacted]`.
 *
 * @param text - The text: an error message, a line of a log, a line for the terminal.
 * @returns The text without those secrets; the same text when it holds none.
 * @example
 * ```ts
 * redactSecrets("fetch https://user:pass@host/v1 failed"); // "fetch https://[redacted]@host/v1 failed"
 * ```
 *
 * @public
 */
export function redactSecrets(text: string): string {
	return PATTERNS.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), text);
}

function isPlainObject(value: unknown): value is Readonly<Record<string, unknown>> {
	return Object.prototype.toString.call(value) === "[object Object]";
}

/**
 * Applies `redact` to every string value of a JSON value (not to object keys); the value is not changed in place.
 *
 * @param value - The value: a string, an array, a plain object, or anything else, which is returned as it is.
 * @param redact - The function every string value goes through.
 * @returns A copy of the value with every string value redacted.
 * @public
 */
export function redactValue<T>(value: T, redact: Redact): T;
export function redactValue(value: unknown, redact: Redact): unknown {
	if (typeof value === "string") return redact(value);
	if (Array.isArray(value)) return value.map((item: unknown) => redactValue(item, redact));
	if (isPlainObject(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redactValue(item, redact)]));
	return value;
}

/**
 * Both in order: `first`, then `second`.
 *
 * @param first - The function that sees the text as it is.
 * @param second - The function that sees what `first` returned.
 * @returns One function that applies both.
 * @public
 */
export function redactWith(first: Redact, second: Redact): Redact {
	return (text) => second(first(text));
}
