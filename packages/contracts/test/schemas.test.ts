// SPDX-License-Identifier: Apache-2.0
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import * as kernel from "../src/kernel/index.ts";
import { ActorIdSchema, type Envelope, EnvelopeSchema, InputNoteSchema, KERNEL_EVENTS, RunEndSchema, StoredEnvelopeSchema } from "../src/kernel/index.ts";
import { missingDescriptions } from "./descriptions.ts";

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null;

/** Every exported schema of the kernel folder by name: an export whose name ends in `Schema`, and each kernel event. */
const exported = (): readonly (readonly [string, unknown])[] => [
	...Object.entries(kernel).filter(([name]) => name.endsWith("Schema")),
	...Object.entries(KERNEL_EVENTS).map(([type, schema]) => [`KERNEL_EVENTS.${type}`, schema] as const),
];

/** Every object schema inside a schema, with its path. */
const objects = (schema: unknown, path: string): readonly (readonly [string, Readonly<Record<string, unknown>>])[] => {
	if (!isRecord(schema)) return [];
	const own = schema.type === "object" && "properties" in schema ? [[path, schema] as const] : [];
	return [...own, ...Object.entries(schema).flatMap(([key, child]) => objects(child, `${path}.${key}`))];
};

const envelope: Envelope = { seq: 1, tick: 0, source: "kernel", type: "run_started", actor: "kernel", payload: {} };

describe("kernel-facing schemas", () => {
	it("describes every exported schema at every place", () => {
		const names = exported().map(([name]) => name);
		expect(names).toEqual(expect.arrayContaining(["ActorIdSchema", "EnvelopeSchema", "StoredEnvelopeSchema", "InputNoteSchema", "RunEndSchema", "JobSchema", "KernelSnapshotSchema"]));
		expect(names.filter((name) => name.startsWith("KERNEL_EVENTS."))).toHaveLength(16);
		expect(exported().flatMap(([name, schema]) => missingDescriptions(schema, name))).toEqual([]);
	});

	it("closes every object schema at every depth", () => {
		const all = exported().flatMap(([name, schema]) => objects(schema, name));
		expect(all.length).toBeGreaterThan(20);
		expect(all.filter(([, schema]) => schema.additionalProperties !== false).map(([path]) => path)).toEqual([]);
	});

	it("accepts an open kind and the three reserved ids as an actor id, and nothing else", () => {
		for (const id of ["worker:A01", "a-b2:x.y_z-1", "human", "script", "kernel"]) expect(Value.Check(ActorIdSchema, id)).toBe(true);
		for (const id of ["", "worker", "Worker:A01", "worker:", ":A01", "worker:A 01", "worker:a:b", "kernel:", "host", "2x:a"]) expect(Value.Check(ActorIdSchema, id)).toBe(false);
	});

	it("accepts an envelope with and without its optional fields, and refuses a wrong one", () => {
		const full = { ...envelope, causedBy: 1, basis: 0, tool: "@example/counter/counter/add", audience: ["human"], payload: [1, "any"] };
		expect(Value.Check(EnvelopeSchema, envelope)).toBe(true);
		expect(Value.Check(EnvelopeSchema, full)).toBe(true);
		expect(Value.Check(EnvelopeSchema, { ...envelope, seq: 0 })).toBe(false);
		expect(Value.Check(EnvelopeSchema, { ...envelope, tick: -1 })).toBe(false);
		expect(Value.Check(EnvelopeSchema, { ...envelope, actor: "host" })).toBe(false);
		expect(Value.Check(EnvelopeSchema, { ...envelope, minute: 0 })).toBe(false);
		expect(Value.Check(EnvelopeSchema, { ...envelope, audience: "human" })).toBe(false);
	});

	it("takes the wall-clock stamp in a stored envelope only", () => {
		const stored = { ...envelope, at: "2026-11-14T08:00:00.000Z" };
		expect(Value.Check(StoredEnvelopeSchema, stored)).toBe(true);
		expect(Value.Check(EnvelopeSchema, stored)).toBe(false);
		expect(Value.Check(StoredEnvelopeSchema, envelope)).toBe(false);
		expect(Value.Check(StoredEnvelopeSchema, { ...envelope, at: "yesterday" })).toBe(false);
	});

	it("checks an input note and the end of a run", () => {
		expect(Value.Check(InputNoteSchema, { source: "counter", text: "The total is 3." })).toBe(true);
		expect(Value.Check(InputNoteSchema, { source: "counter", kind: "news", text: "", order: 1 })).toBe(false);
		expect(Value.Check(RunEndSchema, { reason: "limit", tick: 4, limit: "counter.full" })).toBe(true);
		expect(Value.Check(RunEndSchema, { reason: "minutes", tick: 4 })).toBe(false);
	});
});

describe("KERNEL_EVENTS", () => {
	it("keeps the sixteen event types of the kernel", () => {
		expect(Object.keys(KERNEL_EVENTS)).toEqual([
			"run_started", "tick_started", "tick_ended", "job_ran", "activation_opened", "activation_closed", "tool_called", "tool_refused",
			"tool_result", "service_called", "actor_suspended", "actor_resumed", "tool_locked", "tool_unlocked", "limit_reached", "run_ended",
		]);
	});

	it("accepts the payloads the kernel writes", () => {
		const note = { source: "counter", kind: "news", text: "The total is 3." };
		const samples: readonly (readonly [keyof typeof KERNEL_EVENTS, unknown])[] = [
			["run_started", { game: "counter", seed: 7, maxTicks: 40, actors: ["worker:A01"], plugins: ["counter"] }],
			["tick_started", {}],
			["job_ran", { owner: "counter", job: "close" }],
			["activation_opened", { actor: "worker:A01", inputs: [note], detail: { reason: "news", block: 1 } }],
			["activation_opened", { actor: "worker:A01", inputs: [] }],
			["activation_closed", { actor: "worker:A01", calls: 2, outcome: "acted" }],
			["tool_called", { as: "add", params: { by: 1 } }],
			["tool_refused", { as: "add", stage: "lock", code: "TOOL_LOCKED" }],
			["tool_result", { as: "add", reply: "3", endsTurn: true }],
			["service_called", { service: "counter", method: "reset", caller: "gate", input: null }],
			["actor_suspended", { actor: "worker:A01", by: "gate", reason: "closed" }],
			["tool_locked", { actor: "worker:A01", tool: "@example/counter/counter/add", by: "gate" }],
			["limit_reached", { limit: "counter.full", reason: "the counter is full" }],
			["run_ended", { reason: "error", detail: "a plugin threw" }],
		];
		for (const [type, payload] of samples) expect(Value.Check(KERNEL_EVENTS[type], payload), type).toBe(true);
	});

	it("refuses a field it does not name, a missing field and a wrong outcome", () => {
		expect(Value.Check(KERNEL_EVENTS.tick_started, { tick: 1 })).toBe(false);
		expect(Value.Check(KERNEL_EVENTS.tool_called, { as: "add", params: {}, api: "x" })).toBe(false);
		expect(Value.Check(KERNEL_EVENTS.tool_called, { as: "add" })).toBe(false);
		expect(Value.Check(KERNEL_EVENTS.tool_refused, { as: "add", stage: "lock" })).toBe(false);
		expect(Value.Check(KERNEL_EVENTS.activation_closed, { actor: "worker:A01", calls: 0, outcome: "idle" })).toBe(false);
		expect(Value.Check(KERNEL_EVENTS.activation_opened, { actor: "worker:A01", inputs: [{ source: "counter", text: "x", order: 1 }] })).toBe(false);
	});

	it("refuses a seed in run_started that is no 32-bit number", () => {
		const started = { game: "counter", maxTicks: 40, actors: [], plugins: [] };
		expect(Value.Check(KERNEL_EVENTS.run_started, { ...started, seed: 4294967295 })).toBe(true);
		for (const seed of [4294967296, -1, 1.5]) expect(Value.Check(KERNEL_EVENTS.run_started, { ...started, seed })).toBe(false);
	});
});
