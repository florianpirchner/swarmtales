/**
 * The shared module of the mechanics is frozen for wave 3 (docs/design/carve-plan.md, "Shared
 * files"): its events are the old events field for field, each declared by the mechanic that owns
 * it, and a fingerprint over every API, event, schema and the turn input order fails when anything
 * changes. A change goes through the integration owner, who updates FINGERPRINT in the same PR.
 * The silent events (`LEGACY_SILENT_EVENTS`, wave 3.5) have no old form: they have no owner in the
 * old table and the legacy adapter writes no line for them.
 */
import { createHash } from "node:crypto";
import type { TObject } from "typebox";
import { describe, expect, it } from "vitest";
import { LEGACY_EVENT_OWNERS, LEGACY_SILENT, LegacyEventAdapter, legacyOwner, RecordedEventSchema } from "@swarmtales/chronicle";
import * as shared from "@swarmtales/mechanic-shared";
import { INPUT_KINDS, LEGACY_SILENT_EVENTS, SHARED_APIS, SHARED_EVENTS, STATUS_ORDER } from "@swarmtales/mechanic-shared";

// Round 2 (integrator, carve-decisions R2-D1, D8, D9, D10, D14): LedgerApi.open/has/idempotencyKey, PuzzlesApi.secrets,
// HOOK_ORDER.runResumed and minuteEnded.standoff, StandoffTribunalApi.taskLine, DmRecord.text optional.
// Round 3 (T4a, R2-D18): T4a's local adapters moved into shared with their shapes: ExileApi.gates/exiled/ransomed,
// TribunalApi.text/bequestPerHeir and TribunalViewApi (exported and in SHARED_APIS).
// Round 3 (T2 request 1, T3 request 1): CastExtrasApi.active (exported and in SHARED_APIS), cast provides it, progression uses it.
// Step 18 (A1, the arena's brief): EndingApi and Ending (exported and in SHARED_APIS); nothing provides it yet.
// Step 18 (integrator, step18-decisions.md S18-2): OVERSEER_ORDER exported (the overseers' between-slot order table).
// Step 18 (integrator, step18-decisions.md S18-11): WhispersApi (the whisperer by query, round-3 challenge L2), whispers provides it.
const FINGERPRINT = "d2cca2f611446dae2e47d2acbbaae1a9f635943f87b4a3e45d6a154ae94e53d6";

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
	const all = SHARED_EVENTS.flatMap((definition) =>
		Object.entries(definition.events).map(([type, schema]: [string, TObject]) => ({ id: definition.id, type, fields: fieldsOf(schema.properties, schema.required) })),
	);
	const silent: readonly string[] = LEGACY_SILENT_EVENTS;
	const declared = all.filter((event) => !silent.includes(`${event.id}.${event.type}`));
	const quiet = all.filter((event) => silent.includes(`${event.id}.${event.type}`));

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

	it("lists the same silent events as the legacy adapter, each declared", () => {
		expect([...LEGACY_SILENT].sort()).toEqual([...silent].sort());
		expect(quiet.map((event) => `${event.id}.${event.type}`).sort()).toEqual([...silent].sort());
	});

	it.each(quiet)("$type is silent: no old owner, no legacy line", ({ id, type }) => {
		expect(Object.hasOwn(LEGACY_EVENT_OWNERS, type)).toBe(false);
		const adapter = new LegacyEventAdapter();
		expect(adapter.write({ seq: 1, minute: 0, source: id, type, actor: "host", payload: {} })).toEqual([]);
		expect(adapter.lastSeq).toBe(0);
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
