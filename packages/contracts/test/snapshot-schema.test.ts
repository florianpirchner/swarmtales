// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { JobSchema, type KernelSnapshot, KernelSnapshotSchema } from "../src/kernel/index.ts";

/** A snapshot as a kernel writes it between two ticks: one suspension, one lock, two jobs, two slices. */
const sample = (): KernelSnapshot => ({
	format: "swarmtales.kernel",
	version: 1,
	game: "counter",
	gameHash: "a".repeat(64),
	seed: 7,
	tick: 4,
	seq: 31,
	suspensions: { "worker:A02": ["gate"] },
	locks: { "worker:A01": ["@example/counter/counter/add", "@example/counter/counter/reset"] },
	jobs: [
		{ id: 0, owner: "counter", job: "close", next: 6 },
		{ id: 1, owner: "gate", job: "open", next: 5, data: { who: ["worker:A02"], after: null, nested: { n: 1.5, yes: true } } },
	],
	plugins: { counter: { version: 2, data: { total: 3 } }, gate: { version: 1, data: [] } },
});

const check = (value: unknown): boolean => Value.Check(KernelSnapshotSchema, value);

describe("KernelSnapshotSchema", () => {
	it("accepts a sample, and gives it back unchanged through JSON", () => {
		const full: KernelSnapshot = { ...sample(), ended: { reason: "limit", tick: 4, limit: "counter.full" }, scheduler: { version: 1, data: { pending: [] } } };
		for (const snapshot of [sample(), full]) {
			const back: unknown = JSON.parse(JSON.stringify(snapshot));
			expect(check(back)).toBe(true);
			expect(Value.Parse(KernelSnapshotSchema, back)).toEqual(snapshot);
		}
	});

	it("refuses another format, another version and an unknown field at every depth", () => {
		expect(check({ ...sample(), format: "swarmtales.events" })).toBe(false);
		expect(check({ ...sample(), version: 2 })).toBe(false);
		expect(check({ ...sample(), step: 3 })).toBe(false);
		expect(check({ ...sample(), plugins: { counter: { version: 1, data: 0, extra: 1 } } })).toBe(false);
		expect(check({ ...sample(), scheduler: { version: 1, data: 0, extra: 1 } })).toBe(false);
		expect(check({ ...sample(), jobs: [{ id: 0, owner: "counter", job: "close", next: 6, late: true }] })).toBe(false);
		expect(check({ ...sample(), ended: { reason: "ticks", tick: 4, by: "x" } })).toBe(false);
	});

	it("refuses a missing field and a wrong value", () => {
		const { seq, ...withoutSeq } = sample();
		expect(seq).toBe(31);
		expect(check(withoutSeq)).toBe(false);
		expect(check({ ...sample(), tick: -1 })).toBe(false);
		expect(check({ ...sample(), tick: 1.5 })).toBe(false);
		expect(check({ ...sample(), ended: { reason: "stopped", tick: 4 } })).toBe(false);
		expect(check({ ...sample(), locks: { "worker:A01": "add" } })).toBe(false);
		expect(check({ ...sample(), plugins: { counter: { data: 0 } } })).toBe(false);
	});

	it("refuses a seed that is no 32-bit number: the generator would play it as another seed", () => {
		expect(check({ ...sample(), seed: 4294967295 })).toBe(true);
		for (const seed of [4294967296, -1, 1.5]) expect(check({ ...sample(), seed })).toBe(false);
	});
});

describe("JobSchema", () => {
	const job = { id: 3, owner: "counter", job: "close", next: 6 };

	it("accepts a job with JSON data of any depth, and without data", () => {
		expect(Value.Check(JobSchema, job)).toBe(true);
		for (const data of [null, 0, "x", false, [], [[1, [null]]], { a: { b: [{ c: "d" }] } }]) expect(Value.Check(JobSchema, { ...job, data })).toBe(true);
	});

	it("refuses data that is no JSON value", () => {
		for (const data of [() => 1, 1n, [undefined], { a: { b: [Symbol("s")] } }]) expect(Value.Check(JobSchema, { ...job, data })).toBe(false);
	});
});
