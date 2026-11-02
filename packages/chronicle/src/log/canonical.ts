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
