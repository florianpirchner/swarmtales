// SPDX-License-Identifier: Apache-2.0
/**
 * The key order of a state schema (A43): a snapshot file sorts its keys, so a state loaded as it is comes back
 * sorted, and an event written from it later carries another key order than in the straight run. A head's
 * `snapshot.load` rebuilds the state in the order of its schema with {@link inSchemaOrder}.
 */
import type { Static, TSchema } from "typebox";
import { Check } from "typebox/value";

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

function ordered(schema: unknown, value: unknown): unknown {
	if (!isObject(schema)) return structuredClone(value);
	// A union: the first variant the value matches (a nullable field, a choice of objects); none matches: a plain copy.
	if (Array.isArray(schema.anyOf)) return ordered(schema.anyOf.find((each: unknown) => isObject(each) && Check(each, value)), value);
	if (!isObject(value)) return Array.isArray(value) ? value.map((item: unknown, index) => ordered(Array.isArray(schema.items) ? schema.items[index] : schema.items, item)) : value;
	const declared = isObject(schema.properties) ? schema.properties : {};
	// The keys the schema names in its order, then the others (the keys of a record), with the schema of their values.
	const rest: unknown = isObject(schema.patternProperties) ? Object.values(schema.patternProperties)[0] : schema.additionalProperties;
	return Object.fromEntries([...new Set([...Object.keys(declared), ...Object.keys(value)])].filter((key) => key in value).map((key) => [key, ordered(declared[key] ?? rest, value[key])]));
}

/**
 * A deep copy of a value with the keys of every object in the order its schema declares them; keys the schema does
 * not name (the keys of a record) keep their order and follow. Arrays, tuples and unions (the first variant the
 * value matches) are walked; the value itself is not changed. A head's `snapshot.load` gives its state back with it,
 * so the events written from the state after a resume equal those of the straight run byte for byte (A43).
 *
 * @param schema - The schema the value matches, for example the head's `state`.
 * @param value - The value, for example a loaded snapshot slice.
 * @returns The copy in the schema's key order.
 *
 * @example
 * ```ts
 * snapshot: { save: (state: CountState) => structuredClone(state), load: (data): CountState => inSchemaOrder(CountSlice, data) },
 * ```
 *
 * @public
 */
export function inSchemaOrder<T extends TSchema>(schema: T, value: Static<T>): Static<T>;
export function inSchemaOrder(schema: TSchema, value: unknown): unknown {
	return ordered(schema, value);
}
