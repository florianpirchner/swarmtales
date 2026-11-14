// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { type Envelope, envelopeLogIssues } from "../src/kernel/index.ts";

const line = (seq: number, tick: number, more: Partial<Envelope> = {}): Envelope => ({ seq, tick, source: "kernel", type: "tick_started", actor: "kernel", payload: {}, ...more });

const stored = (envelope: Envelope): Envelope & { readonly at: string } => ({ ...envelope, at: "2026-11-14T08:00:00.000Z" });

const sound = (): Envelope[] => [
	line(1, 0, { type: "run_started" }),
	line(2, 0),
	line(3, 0, { type: "activation_opened", actor: "worker:A01", causedBy: 2, basis: 2 }),
	line(4, 1),
	line(5, 1, { type: "tool_called", actor: "worker:A01", causedBy: 3, basis: 4, tool: "@example/counter/counter/add" }),
];

describe("envelopeLogIssues", () => {
	it("finds nothing in a sound log, in memory and as stored lines", () => {
		expect(envelopeLogIssues(sound())).toEqual([]);
		expect(envelopeLogIssues(sound().map(stored))).toEqual([]);
		const parsed: unknown = JSON.parse(JSON.stringify(sound().map(stored)));
		expect(Array.isArray(parsed) ? envelopeLogIssues(parsed) : undefined).toEqual([]);
		expect(envelopeLogIssues([])).toEqual([]);
	});

	it("finds a gap: every line whose seq is not its line number", () => {
		const log = sound().filter((entry) => entry.seq !== 3);
		expect(envelopeLogIssues(log)).toEqual([
			{ line: 3, kind: "seq", reason: "seq is 4, the line number is 3" },
			{ line: 4, kind: "seq", reason: "seq is 5, the line number is 4" },
		]);
		expect(envelopeLogIssues([line(2, 0)])).toEqual([{ line: 1, kind: "seq", reason: "seq is 2, the line number is 1" }]);
		expect(envelopeLogIssues([line(1, 0), line(1, 0)])).toEqual([{ line: 2, kind: "seq", reason: "seq is 1, the line number is 2" }]);
	});

	it("finds a falling tick, and measures the next line against the highest tick so far", () => {
		expect(envelopeLogIssues([line(1, 0), line(2, 2), line(3, 1), line(4, 1), line(5, 2)])).toEqual([
			{ line: 3, kind: "tick", reason: "tick falls from 2 to 1" },
			{ line: 4, kind: "tick", reason: "tick falls from 2 to 1" },
		]);
	});

	it("finds a causedBy that does not point back", () => {
		expect(envelopeLogIssues([line(1, 0), line(2, 0, { causedBy: 3 }), line(3, 0, { causedBy: 3 }), line(4, 0, { causedBy: 3 })])).toEqual([
			{ line: 2, kind: "causedBy", reason: "causedBy 3 is not smaller than seq 2" },
			{ line: 3, kind: "causedBy", reason: "causedBy 3 is not smaller than seq 3" },
		]);
	});

	it("finds a basis that does not point back", () => {
		expect(envelopeLogIssues([line(1, 0), line(2, 0, { basis: 2 }), line(3, 0, { basis: 2 })])).toEqual([{ line: 2, kind: "basis", reason: "basis 2 is not smaller than seq 2" }]);
	});

	it("names a line that is no envelope and goes on with the next", () => {
		const broken = [line(1, 0), "text", { ...line(3, 0), extra: 1 }, { ...line(4, 0), seq: "4" }, null, { ...stored(line(6, 0)), at: "yesterday" }, line(7, 0)];
		expect(envelopeLogIssues(broken)).toEqual([2, 3, 4, 5, 6].map((at) => ({ line: at, kind: "envelope", reason: "the line is not an envelope" })));
	});

	it("gives each fault a kind that code can read", () => {
		const kinds = envelopeLogIssues([line(1, 3), line(3, 1, { causedBy: 9, basis: 3 }), "text"]).map((issue) => [issue.line, issue.kind]);
		expect(kinds).toEqual([[2, "seq"], [2, "tick"], [2, "causedBy"], [2, "basis"], [3, "envelope"]]);
	});

	it("lists every fault of a line", () => {
		expect(envelopeLogIssues([line(1, 3), line(3, 1, { causedBy: 9 })]).map((issue) => issue.reason)).toEqual([
			"seq is 3, the line number is 2",
			"tick falls from 3 to 1",
			"causedBy 9 is not smaller than seq 3",
		]);
	});
});
