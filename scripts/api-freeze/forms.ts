// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The breaks of a JSON text form that add lines only (decision A116, finding 3 of `docs/M5-REVIEW.md`): a text form
 * writes each `required` array one name per line, so a new required property, or a constraint added to a property
 * that was there, keeps every old line and would pass the line rule as an addition. The forms are compared as parsed
 * schemas too: a name that enters a `required` array, a property that leaves the `properties` of an object, and a
 * constraint keyword added to a schema that was there are breaks, whatever lines they add.
 */

/** The keywords that narrow what a schema accepts when they are added to it. */
const NARROWING = ["additionalProperties", "const", "enum", "exclusiveMaximum", "exclusiveMinimum", "format", "maxItems", "maxLength", "maximum", "minItems", "minLength", "minimum", "pattern"];

/** A JSON object of a parsed text form. */
interface Node {
	readonly [key: string]: unknown;
	readonly required?: unknown;
	readonly properties?: unknown;
	readonly type?: unknown;
}

const isNode = (value: unknown): value is Node => value !== null && typeof value === "object" && !Array.isArray(value);
const items = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);

/** The breaks at one node that was there before: the names new in `required`, the properties gone, the constraints added. */
function nodeBreaks(before: Node, now: Node, at: string): readonly string[] {
	const was = items(before.required);
	const required = items(now.required)
		.filter((name) => !was.includes(name))
		.map((name) => `${at}: ${JSON.stringify(name)} enters "required"`);
	const props = before.type === "object" && isNode(before.properties) ? Object.keys(before.properties) : [];
	const kept = isNode(now.properties) ? now.properties : {};
	const removed = props.filter((key) => !(key in kept)).map((key) => `${at}: the property "${key}" is removed`);
	const narrowed = typeof before.type === "string" ? NARROWING.filter((key) => !(key in before) && key in now).map((key) => `${at}: "${key}" is added`) : [];
	return [...required, ...removed, ...narrowed];
}

/** The breaks of a node and of every node below it that was there before; an array is walked by index while its length stays. */
function walk(before: unknown, now: unknown, at: string): readonly string[] {
	if (Array.isArray(before) && Array.isArray(now) && before.length === now.length) return before.flatMap((item, index) => walk(item, now[index], `${at}/${String(index)}`));
	if (!isNode(before) || !isNode(now)) return [];
	return [...nodeBreaks(before, now, at), ...Object.entries(before).flatMap(([key, value]) => walk(value, now[key], `${at}/${key}`))];
}

/** Parses a JSON text, or `undefined` when it is none. */
function parsed(text: string): unknown {
	try {
		const value: unknown = JSON.parse(text);
		return value;
	} catch {
		return undefined;
	}
}

/**
 * The breaks of a JSON text form against its text before, also those that only add lines.
 *
 * @param before - The text at the base.
 * @param now - The text now.
 * @returns Where and what each break is (`#/properties/run: "budget" enters "required"`); empty when there is none or a
 *   text is no JSON (the line rule then decides alone).
 */
export function schemaBreaks(before: string, now: string): readonly string[] {
	const old = parsed(before);
	const value = parsed(now);
	return old === undefined || value === undefined ? [] : walk(old, value, "#");
}
