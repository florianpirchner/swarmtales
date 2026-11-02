/**
 * Canonical JSON after RFC 8785 (JSON Canonicalization Scheme) for parsed JSON values: object keys
 * sorted by their UTF-16 code units, no whitespace, strings and numbers serialised as ECMAScript's
 * `JSON.stringify` does (which is what the RFC prescribes). The input is a value `JSON.parse`
 * returned, so it holds only objects, arrays, strings, finite numbers, booleans and null; anything
 * else is refused rather than silently dropped, so two different values never share a form.
 */

export class CanonicalJsonError extends Error {}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Compares by UTF-16 code units (RFC 8785 §3.2.3), which is what `<` does on strings. */
function byCodeUnits(left: string, right: string): number {
	if (left === right) return 0;
	return left < right ? -1 : 1;
}

/** A lone (unpaired) UTF-16 surrogate: under the `u` flag a string is read by code points, so only an unpaired half is `Cs`. */
const LONE_SURROGATE = /\p{Cs}/u;

/** The first object key that occurs twice in one object of a JSON text (escapes decoded); the text is valid JSON. */
function duplicateKey(text: string): string | undefined {
	// One entry per open object (its keys so far) or array (undefined).
	const open: (Set<string> | undefined)[] = [];
	let expectKey = false;
	let index = 0;
	while (index < text.length) {
		const char = text[index];
		if (char === '"') {
			let end = index + 1;
			while (end < text.length && text[end] !== '"') end += text[end] === "\\" ? 2 : 1;
			const keys = open.at(-1);
			if (expectKey && keys !== undefined) {
				const key: unknown = JSON.parse(text.slice(index, end + 1));
				if (typeof key === "string") {
					if (keys.has(key)) return key;
					keys.add(key);
				}
			}
			expectKey = false;
			index = end + 1;
			continue;
		}
		if (char === "{") {
			open.push(new Set());
			expectKey = true;
		} else if (char === "[") {
			open.push(undefined);
		} else if (char === "}" || char === "]") {
			open.pop();
		} else if (char === ",") {
			expectKey = open.at(-1) !== undefined;
		}
		index += 1;
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
 * Why a JSON text is not I-JSON (RFC 7493), which RFC 8785 assumes: a duplicate key (parsers differ
 * in which value they keep) or a lone surrogate (not UTF-8 encodable, so another JCS implementation
 * cannot hash it). `undefined` when it is I-JSON. `value` is `JSON.parse(text)`.
 */
export function iJsonIssue(text: string, value: unknown): string | undefined {
	const key = duplicateKey(text);
	if (key !== undefined) return `duplicate key ${JSON.stringify(key)}`;
	if (hasLoneSurrogate(value)) return "a lone surrogate in a string";
	return undefined;
}

/** A string with every lone surrogate replaced by U+FFFD, so what a run writes is always I-JSON. */
export function wellFormed(text: string): string {
	return text.replace(/\p{Cs}/gu, "�");
}

export function canonicalJson(value: unknown): string {
	if (value === null) return "null";
	switch (typeof value) {
		case "boolean":
			return value ? "true" : "false";
		case "string":
			return JSON.stringify(value);
		case "number":
			if (!Number.isFinite(value)) throw new CanonicalJsonError(`canonical JSON: ${String(value)} is not a JSON number`);
			// ECMAScript's Number serialisation (RFC 8785 §3.2.2.3); -0 becomes 0.
			return JSON.stringify(value);
		case "object": {
			if (Array.isArray(value)) return `[${value.map((entry: unknown) => canonicalJson(entry)).join(",")}]`;
			if (!isRecord(value)) throw new CanonicalJsonError("canonical JSON: not a JSON object");
			const keys = Object.keys(value).sort(byCodeUnits);
			return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
		}
		case "bigint":
		case "function":
		case "symbol":
		case "undefined":
			break;
	}
	throw new CanonicalJsonError(`canonical JSON: a ${typeof value} is not a JSON value`);
}
