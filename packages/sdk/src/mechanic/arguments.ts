// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The argument handling of the old runner (R2-D6): before a tool saw its arguments, the agent runtime dropped an
 * optional property sent as `null` and converted values to the schema's types (`1.5` to `1` for an integer, `"3"`
 * to `3`). The kit does the same at the start of `prepare`, so a call the old engine took is taken; what still
 * does not match is refused with the bare `INVALID_ARGUMENTS`, as the old tool wrapper answered. Carried from the
 * old `host/arguments.ts`.
 */
import type { TSchema } from "typebox";
import { Check, Clone, Convert } from "typebox/value";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSchema(value: unknown): value is TSchema {
	return isRecord(value);
}

// The schema of `key` among the object schema's properties, when it declares one.
function property(schema: TSchema, key: string): TSchema | undefined {
	if (!("properties" in schema) || !isRecord(schema.properties)) return undefined;
	const found: unknown = schema.properties[key];
	return isSchema(found) ? found : undefined;
}

function required(schema: TSchema): readonly string[] {
	if (!("required" in schema) || !Array.isArray(schema.required)) return [];
	return schema.required.filter((key: unknown): key is string => typeof key === "string");
}

function items(schema: TSchema): TSchema | undefined {
	if (!("items" in schema)) return undefined;
	const found: unknown = schema.items;
	return isSchema(found) && !Array.isArray(found) ? found : undefined;
}

// `value` without optional properties sent as `null` that the schema does not allow to be null.
function withoutOptionalNulls(value: unknown, schema: TSchema): unknown {
	if (Array.isArray(value)) {
		const each = items(schema);
		return each === undefined ? value : value.map((item: unknown) => withoutOptionalNulls(item, each));
	}
	if (!isRecord(value)) return value;
	const needed = required(schema);
	return Object.fromEntries(
		Object.entries(value).flatMap(([key, field]): [string, unknown][] => {
			const inner = property(schema, key);
			if (inner === undefined) return [[key, field]];
			if (field === null && !needed.includes(key) && !Check(inner, null)) return [];
			return [[key, withoutOptionalNulls(field, inner)]];
		}),
	);
}

/**
 * Gives the raw arguments of a tool call as the old runtime handed them to the tool: a copy without optional
 * nulls, converted to the schema's types. The result is not checked: the caller checks it against the schema.
 *
 * @param schema - The schema of the tool's arguments.
 * @param raw - The arguments as the caller sent them; they are not changed.
 * @returns The converted copy.
 *
 * @internal
 */
export function convertArguments(schema: TSchema, raw: unknown): unknown {
	return Convert(schema, withoutOptionalNulls(Clone(raw), schema));
}
