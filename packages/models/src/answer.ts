// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The reading of a Director's answer text (decision A100, P480). The whole text is read first, as one JSON value
 * (a code fence around it is dropped). When it is no value that the schema of the output accepts, the answer is
 * the last JSON object in the text that the schema accepts: a model may write the schema back before its verdict,
 * or reason past a first verdict to a second one. An object that the schema accepts is taken whole, and the objects
 * inside it are not read; inside one that it refuses, the search goes on. A text with no such object is `invalid`,
 * with the detail of the whole text's reading.
 */
import type { TSchema } from "typebox";
import { Check } from "typebox/value";

/** The reading of one answer text: its value, or why it has none. */
export type AnswerReading = { readonly ok: true; readonly value: unknown } | { readonly ok: false; readonly detail: string };

const NO_JSON = "the answer is no JSON, or its schema cannot be checked";
const NO_FIT = "the answer does not fit the schema of the output";

function isSchema(value: unknown): value is TSchema {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

// The index after the object that opens at `start`, or -1 when it does not close; strings and their escapes are skipped.
function closing(text: string, start: number): number {
	let depth = 0;
	let quoted = false;
	for (let at = start; at < text.length; at += 1) {
		const char = text[at];
		if (quoted) {
			if (char === "\\") at += 1;
			else if (char === '"') quoted = false;
		} else if (char === '"') quoted = true;
		else if (char === "{") depth += 1;
		else if (char === "}" && --depth === 0) return at + 1;
	}
	return -1;
}

// The value of one piece of text when the schema accepts it; a piece that is no JSON or cannot be checked has none.
function fitting(piece: string, output: TSchema): { readonly value: unknown } | undefined {
	try {
		const value: unknown = JSON.parse(piece);
		return Check(output, value) ? { value } : undefined;
	} catch {
		return undefined;
	}
}

// The last object in the text that the schema accepts, searched from the left.
function lastFitting(text: string, output: TSchema): { readonly value: unknown } | undefined {
	let found: { readonly value: unknown } | undefined;
	let at = text.indexOf("{");
	while (at !== -1) {
		const end = closing(text, at);
		const fit = end === -1 ? undefined : fitting(text.slice(at, end), output);
		if (fit !== undefined) found = fit;
		at = text.indexOf("{", fit === undefined ? at + 1 : end);
	}
	return found;
}

// The whole text as one value: undefined when it is no JSON or its schema cannot be checked.
function whole(text: string, output: unknown): { readonly value: unknown; readonly fits: boolean } | undefined {
	const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(text.trim());
	try {
		const value: unknown = JSON.parse(fenced?.[1] ?? text);
		return { value, fits: !isSchema(output) || Check(output, value) };
	} catch {
		return undefined;
	}
}

/**
 * Reads the value of a Director's answer text against the schema of its output.
 *
 * @param text - The text of the answer, its text blocks joined.
 * @param output - The JSON schema of the output; a value that is no schema object checks nothing, and then only the
 * whole text is read.
 * @returns The value: the whole text when the schema accepts it, else the last object in the text that the schema
 * accepts; or the detail of why there is none.
 * @example
 * ```ts
 * readAnswer('{"type":"object"}\n\nThe verdict: {"allowed":true,"reason":"No secret."}', GuardAnswer); // { ok: true, value: { allowed: true, reason: "No secret." } }
 * ```
 *
 * @internal
 */
export function readAnswer(text: string, output: unknown): AnswerReading {
	const read = whole(text, output);
	if (read?.fits === true) return { ok: true, value: read.value };
	const found = isSchema(output) ? lastFitting(text, output) : undefined;
	if (found !== undefined) return { ok: true, value: found.value };
	return { ok: false, detail: read === undefined ? NO_JSON : NO_FIT };
}
