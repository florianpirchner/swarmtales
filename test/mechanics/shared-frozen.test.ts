/**
 * The shared module of the mechanics is frozen for wave 3 (docs/design/carve-plan.md, "Shared
 * files"): its events are the old events field for field, each declared by the mechanic that owns
 * it, and a fingerprint over every API, event, schema and the turn input order fails when anything
 * changes. A change goes through the integration owner, who updates FINGERPRINT in the same PR.
 */
import { createHash } from "node:crypto";
import type { TObject } from "typebox";
import { describe, expect, it } from "vitest";
import { LEGACY_EVENT_OWNERS, legacyOwner, RecordedEventSchema } from "@swarmtales/chronicle";
import * as shared from "@swarmtales/mechanic-shared";
import { INPUT_KINDS, SHARED_APIS, SHARED_EVENTS, STATUS_ORDER } from "@swarmtales/mechanic-shared";

const FINGERPRINT = "368f7f79832d8d80dc18827d52601a97fff51866d638960ec001b2e5a06ae6b2";

/** The events the review asks to freeze in wave 3.0 (core-review-2c.md, last paragraph). */
const FROZEN = ["exiled", "level_up", "submission", "dm_sent", "board_post", "ledger_entry", "transfer"];

interface Fields {
	readonly keys: readonly string[];
	readonly json: string;
}

const ENVELOPE = ["seq", "minute", "type"];

/** An object schema's fields (without the old envelope keys) and their JSON, in their order. */
function fieldsOf(properties: Readonly<Record<string, unknown>>, required: readonly string[]): Fields {
	const fields = Object.fromEntries(Object.entries(properties).filter(([key]) => !ENVELOPE.includes(key)));
	return { keys: Object.keys(fields), json: JSON.stringify({ fields, required: required.filter((key) => !ENVELOPE.includes(key)) }) };
}

function oldFields(type: string): Fields {
	const variant = RecordedEventSchema.anyOf.find((schema) => schema.properties.type.const === type);
	if (variant === undefined) throw new Error(`no old schema for ${type}`);
	return fieldsOf(variant.properties, variant.required);
}

describe("the shared events", () => {
	const declared = SHARED_EVENTS.flatMap((definition) =>
		Object.entries(definition.events).map(([type, schema]: [string, TObject]) => ({ id: definition.id, type, fields: fieldsOf(schema.properties, schema.required) })),
	);

	it("hold every event the review freezes", () => {
		expect(declared.map((event) => event.type)).toEqual(expect.arrayContaining(FROZEN));
	});

	it.each(declared)("$type is declared by its owner $id", ({ id, type }) => {
		expect(Object.hasOwn(LEGACY_EVENT_OWNERS, type)).toBe(true);
		expect(legacyOwner(type)).toBe(id);
	});

	it.each(declared)("$type has the old fields in the old order", ({ type, fields }) => {
		expect(fields.keys).toEqual(oldFields(type).keys);
		expect(fields.json).toBe(oldFields(type).json);
	});
});

describe("the shared module", () => {
	it("names every API once", () => {
		const names = SHARED_APIS.map((api) => api.name);
		expect(new Set(names).size).toBe(names.length);
	});

	it("keeps its fingerprint", () => {
		const content = JSON.stringify({ exports: Object.keys(shared).sort(), apis: SHARED_APIS, events: SHARED_EVENTS, inputs: INPUT_KINDS, status: STATUS_ORDER });
		expect(createHash("sha256").update(content).digest("hex")).toBe(FINGERPRINT);
	});
});
