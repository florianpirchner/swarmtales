// SPDX-License-Identifier: Apache-2.0
/**
 * The description rule for Typebox schemas: every schema carries a `description`, so generated references, editor
 * hovers and error texts can say what a value is. A package's test passes its schemas to
 * {@link missingDescriptions} and expects an empty list.
 */

/** The keywords whose value is one schema. */
const ONE = ["items", "additionalProperties", "not", "contains", "propertyNames", "if", "then", "else"] as const;
/** The keywords whose value is a list of schemas. */
const LIST = ["anyOf", "allOf", "oneOf", "prefixItems", "items"] as const;
/** The list keywords whose members are alternatives; the others are the positions of a tuple. */
const UNIONS: readonly string[] = ["anyOf", "oneOf"];
/** The keywords whose value maps names to schemas. */
const NAMED = ["properties", "patternProperties", "$defs", "definitions"] as const;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null && !Array.isArray(value);

/** A literal inside a union needs no description of its own: the union says what the choice means. */
const isLiteral = (schema: Readonly<Record<string, unknown>>): boolean => "const" in schema;

function children(schema: Readonly<Record<string, unknown>>, path: string): readonly (readonly [string, unknown, boolean])[] {
	const found: (readonly [string, unknown, boolean])[] = [];
	for (const key of ONE) if (isRecord(schema[key])) found.push([`${path}.${key}`, schema[key], false]);
	for (const key of LIST) {
		const list = schema[key];
		if (Array.isArray(list)) list.forEach((entry: unknown, index) => found.push([`${path}.${key}[${index}]`, entry, UNIONS.includes(key)]));
	}
	for (const key of NAMED) {
		const named = schema[key];
		if (isRecord(named)) for (const [name, entry] of Object.entries(named)) found.push([`${path}.${key}.${name}`, entry, false]);
	}
	return found;
}

/**
 * Walks a Typebox schema (or any JSON schema) and lists the places without a description.
 *
 * @param schema - The schema.
 * @param path - The name the messages start with, for example the name of the exported schema.
 * @returns One path per schema, property, item or union member that has no non-empty `description`. A literal
 * directly inside a union is left out.
 */
export function missingDescriptions(schema: unknown, path = "$"): readonly string[] {
	const visit = (node: unknown, at: string, inUnion: boolean): readonly string[] => {
		if (!isRecord(node)) return [`${at} (not a schema)`];
		const described = typeof node.description === "string" && node.description.trim() !== "";
		const own = described || (inUnion && isLiteral(node)) ? [] : [at];
		return [...own, ...children(node, at).flatMap(([childPath, child, union]) => visit(child, childPath, union))];
	};
	return visit(schema, path, false);
}
