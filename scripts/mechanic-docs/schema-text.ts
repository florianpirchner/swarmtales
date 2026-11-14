// SPDX-License-Identifier: Apache-2.0
/** Schemas as text for the generated blocks of a mechanic's README: a type in a few words, the fields of an object, a table. */

/** A JSON object. */
export type Json = Readonly<Record<string, unknown>>;

/**
 * Says whether a value is a JSON object.
 *
 * @param value - The value.
 * @returns True for an object that is no array and not null.
 */
export function isRecord(value: unknown): value is Json {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Turns a schema into plain JSON, so only what a file would hold is read.
 *
 * @param value - The schema.
 * @returns The JSON form, or `undefined` for `undefined`.
 */
export function plain(value: unknown): unknown {
	return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function stringOf(value: unknown): string | undefined {
	return typeof value === "string" ? value : undefined;
}

function arrayText(schema: Json): string {
	const items = typeText(schema.items);
	return items.includes(" ") ? `(${items})[]` : `${items}[]`;
}

function objectText(schema: Json): string {
	if (isRecord(schema.properties) && Object.keys(schema.properties).length > 0) return "object";
	const pattern = isRecord(schema.patternProperties) ? Object.values(schema.patternProperties)[0] : undefined;
	const additional = isRecord(schema.additionalProperties) ? schema.additionalProperties : undefined;
	const value = pattern ?? additional;
	return value === undefined ? "object" : `record of ${typeText(value)}`;
}

function numberText(schema: Json, type: string): string {
	const bounds: string[] = [];
	if (typeof schema.minimum === "number") bounds.push(`≥ ${String(schema.minimum)}`);
	if (typeof schema.exclusiveMinimum === "number") bounds.push(`> ${String(schema.exclusiveMinimum)}`);
	if (typeof schema.maximum === "number") bounds.push(`≤ ${String(schema.maximum)}`);
	return [type, ...bounds].join(" ");
}

const SIMPLE: ReadonlySet<string> = new Set(["string", "boolean", "null"]);

function namedType(schema: Json, type: unknown): string {
	if (type === "array") return arrayText(schema);
	if (type === "object") return objectText(schema);
	if (type === "integer" || type === "number") return numberText(schema, type);
	return typeof type === "string" && SIMPLE.has(type) ? type : "any";
}

/**
 * A schema's type in a few words: `string`, `integer ≥ 1`, `"a" or "b"`, `string[]`, `record of number`.
 *
 * @param schema - The schema as JSON.
 * @returns The text; `any` for what has no short form.
 */
export function typeText(schema: unknown): string {
	if (!isRecord(schema)) return "any";
	if ("const" in schema) return JSON.stringify(schema.const);
	if (Array.isArray(schema.enum)) return schema.enum.map((value) => JSON.stringify(value)).join(" or ");
	const anyOf = schema.anyOf ?? schema.oneOf;
	if (Array.isArray(anyOf)) return [...new Set(anyOf.map((part) => typeText(part)))].join(" or ");
	if (Array.isArray(schema.type)) return schema.type.map((part) => String(part)).join(" or ");
	return namedType(schema, schema.type);
}

/** One property of an object schema. */
export interface Field {
	readonly name: string;
	readonly type: string;
	readonly required: boolean;
	readonly defaultText: string | undefined;
	readonly description: string | undefined;
}

/** The object schema inside a schema: itself, or the items of an array of objects. */
function objectInside(schema: unknown): Json | undefined {
	if (!isRecord(schema)) return undefined;
	if (isRecord(schema.properties)) return schema;
	if (schema.type === "array") return objectInside(schema.items);
	return undefined;
}

function fieldOf(name: string, property: unknown, required: boolean): Field {
	const schema = isRecord(property) ? property : {};
	return { name, type: typeText(property), required, defaultText: "default" in schema ? JSON.stringify(schema.default) : undefined, description: stringOf(schema.description) };
}

/**
 * The properties of an object schema, nested ones as `a.b` (`a[].b` inside arrays), down to `depth` levels.
 *
 * @param schema - The schema as JSON.
 * @param depth - How many levels are listed.
 * @param prefix - What comes before each name.
 * @returns The fields in the order the schema declares them.
 */
export function fieldsOf(schema: unknown, depth: number, prefix = ""): readonly Field[] {
	const object = objectInside(schema);
	if (object === undefined || !isRecord(object.properties)) return [];
	const required: readonly unknown[] = Array.isArray(object.required) ? object.required : [];
	return Object.entries(object.properties).flatMap(([name, property]) => {
		const full = `${prefix}${name}`;
		const field = fieldOf(full, property, required.includes(name));
		const inner = depth <= 1 ? undefined : objectInside(property);
		if (inner === undefined) return [field];
		const isList = isRecord(property) && property.type === "array";
		return [field, ...fieldsOf(inner, depth - 1, isList ? `${full}[].` : `${full}.`)];
	});
}

/**
 * Text safe inside a Markdown table cell.
 *
 * @param text - The text.
 * @returns The text with bars escaped and line breaks as spaces; empty for `undefined`.
 */
export function cell(text: string | undefined): string {
	return (text ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
}

/**
 * Text as inline code.
 *
 * @param text - The text.
 * @returns The text in backticks.
 */
export function code(text: string): string {
	return `\`${text}\``;
}

/**
 * A Markdown table.
 *
 * @param head - The column titles.
 * @param rows - The rows, one cell per column.
 * @returns The table.
 */
export function table(head: readonly string[], rows: readonly (readonly string[])[]): string {
	return [`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...rows.map((row) => `| ${row.join(" | ")} |`)].join("\n");
}

/**
 * The fields of an object schema in one line: `cell: integer, reason?: string`.
 *
 * @param schema - The schema as JSON.
 * @returns The line; `-` for a schema without fields.
 */
export function fieldLine(schema: unknown): string {
	const line = fieldsOf(schema, 1)
		.map((field) => `${field.name}${field.required ? "" : "?"}: ${field.type}`)
		.join(", ");
	return line === "" ? "-" : line;
}

function shapeOf(schema: unknown): string | undefined {
	if (!isRecord(schema)) return undefined;
	if (isRecord(schema.properties) && Object.keys(schema.properties).length > 0) return `{ ${fieldLine(schema)} }`;
	if (schema.type !== "array") return undefined;
	const items = shapeOf(schema.items);
	return items === undefined ? undefined : `${items}[]`;
}

/**
 * What a service method answers: an object with its fields and their values (`{ ok: boolean, code?: "A" or "B" }`),
 * a list of such objects with `[]`, else the type in a few words.
 *
 * @param schema - The schema as JSON.
 * @returns The text.
 */
export function outputText(schema: unknown): string {
	const parts = isRecord(schema) ? (schema.anyOf ?? schema.oneOf) : undefined;
	if (Array.isArray(parts)) return [...new Set(parts.map((part) => outputText(part)))].join(" or ");
	return shapeOf(schema) ?? typeText(schema);
}
