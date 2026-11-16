// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Canonical JSON after RFC 8785 (JSON Canonicalization Scheme) for parsed JSON values: object keys
 * sorted by their UTF-16 code units, no whitespace, strings and numbers serialised as ECMAScript's
 * `JSON.stringify` does (which is what the RFC prescribes). The input is a value `JSON.parse`
 * returned, so it holds only objects, arrays, strings, finite numbers, booleans and null; anything
 * else is refused rather than silently dropped, so two different values never share a form.
 */

/**
 * Thrown by {@link canonicalJson} for a value that is no JSON value.
 *
 * @public
 */
export class CanonicalJsonError extends Error {}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Compares by UTF-16 code units (RFC 8785 §3.2.3), which is what `<` does on strings.
function byCodeUnits(left: string, right: string): number {
	if (left === right) return 0;
	return left < right ? -1 : 1;
}

/** A lone (unpaired) UTF-16 surrogate: under the `u` flag a string is read by code points, so only an unpaired half is `Cs`. */
const LONE_SURROGATE = /\p{Cs}/u;

/** Where the scan for duplicate keys stands: one entry per open object (its keys so far) or array (undefined). */
interface KeyScan {
	readonly open: (Set<string> | undefined)[];
	expectKey: boolean;
}

// The index of the quote that closes the string literal starting at `start`.
function stringEnd(text: string, start: number): number {
	let end = start + 1;
	while (end < text.length && text[end] !== '"') end += text[end] === "\\" ? 2 : 1;
	return end;
}

// Notes a string literal; returns its value when it is a key its object already has.
function noteString(scan: KeyScan, literal: string): string | undefined {
	const keys = scan.open.at(-1);
	if (scan.expectKey && keys !== undefined) {
		const key: unknown = JSON.parse(literal);
		if (typeof key === "string") {
			if (keys.has(key)) return key;
			keys.add(key);
		}
	}
	scan.expectKey = false;
	return undefined;
}

// Notes a character outside a string literal.
function notePunctuation(scan: KeyScan, char: string | undefined): void {
	if (char === "{") {
		scan.open.push(new Set());
		scan.expectKey = true;
	} else if (char === "[") {
		scan.open.push(undefined);
	} else if (char === "}" || char === "]") {
		scan.open.pop();
	} else if (char === ",") {
		scan.expectKey = scan.open.at(-1) !== undefined;
	}
}

// The first object key that occurs twice in one object of a JSON text (escapes decoded); the text is valid JSON.
function duplicateKey(text: string): string | undefined {
	const scan: KeyScan = { open: [], expectKey: false };
	let index = 0;
	while (index < text.length) {
		if (text[index] !== '"') {
			notePunctuation(scan, text[index]);
			index += 1;
			continue;
		}
		const end = stringEnd(text, index);
		const duplicate = noteString(scan, text.slice(index, end + 1));
		if (duplicate !== undefined) return duplicate;
		index = end + 1;
	}
	return undefined;
}

function hasLoneSurrogate(value: unknown): boolean {
	if (typeof value === "string") return LONE_SURROGATE.test(value);
	if (Array.isArray(value)) return value.some((entry: unknown) => hasLoneSurrogate(entry));
	if (isRecord(value)) return Object.entries(value).some(([key, entry]) => LONE_SURROGATE.test(key) || hasLoneSurrogate(entry));
	return false;
}

/**
 * Says why a JSON text is not I-JSON (RFC 7493), which RFC 8785 assumes: a duplicate key (parsers differ
 * in which value they keep) or a lone surrogate (not UTF-8 encodable, so another JCS implementation
 * cannot hash it).
 *
 * @param text - The JSON text.
 * @param value - `JSON.parse(text)`.
 * @returns The reason, or `undefined` when the text is I-JSON.
 */
export function iJsonIssue(text: string, value: unknown): string | undefined {
	const key = duplicateKey(text);
	if (key !== undefined) return `duplicate key ${JSON.stringify(key)}`;
	if (hasLoneSurrogate(value)) return "a lone surrogate in a string";
	return undefined;
}

/**
 * Replaces every lone surrogate by U+FFFD, so what a run writes is always I-JSON.
 *
 * @param text - Any string.
 * @returns The string without lone surrogates.
 * @internal
 */
export function wellFormed(text: string): string {
	return text.replace(/\p{Cs}/gu, "�");
}

function canonicalNumber(value: number): string {
	if (!Number.isFinite(value)) throw new CanonicalJsonError(`canonical JSON: ${String(value)} is not a JSON number`);
	// ECMAScript's Number serialisation (RFC 8785 §3.2.2.3); -0 becomes 0.
	return JSON.stringify(value);
}

function canonicalObject(value: object): string {
	// `Array.from` visits a hole of a sparse array as `undefined`, which is refused; `map` would skip it.
	if (Array.isArray(value)) return `[${Array.from(value, (entry: unknown) => canonicalJson(entry)).join(",")}]`;
	// A Date, a Map or a Set has no own keys and would be written as `{}`: two different values with one form.
	if (!isRecord(value) || Object.prototype.toString.call(value) !== "[object Object]") throw new CanonicalJsonError("canonical JSON: not a JSON object");
	const keys = Object.keys(value).sort(byCodeUnits);
	return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

/**
 * Writes a parsed JSON value as canonical JSON (RFC 8785).
 *
 * @param value - A value as `JSON.parse` returns it.
 * @returns The canonical text.
 * @throws CanonicalJsonError when the value holds something that is no JSON value (`undefined`, a function, a
 * bigint, a symbol, a number that is not finite, a hole in an array, a Date, a Map or a Set).
 * @example
 * ```ts
 * canonicalJson({ b: [1e21, -0, "é"], a: null }); // {"a":null,"b":[1e+21,0,"é"]}
 * ```
 * @public
 */
export function canonicalJson(value: unknown): string {
	if (value === null) return "null";
	if (typeof value === "boolean") return value ? "true" : "false";
	if (typeof value === "string") return JSON.stringify(value);
	if (typeof value === "number") return canonicalNumber(value);
	if (typeof value === "object") return canonicalObject(value);
	throw new CanonicalJsonError(`canonical JSON: a ${typeof value} is not a JSON value`);
}
