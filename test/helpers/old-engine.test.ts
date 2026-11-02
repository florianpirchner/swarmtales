/**
 * The replay helpers of the old engine's recordings (test/helpers/old-engine.ts): a recorded trace
 * refuses answers asked in another order and a test that stops before it read them all (F3).
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { RecordedTrace } from "./old-engine.ts";

const entries = [
	{ label: "balance A01", value: 7 },
	{ label: "tick", value: undefined },
	{ label: "balance A02", value: 9 },
];

describe("RecordedTrace", () => {
	it("is done only once every recorded answer was read", () => {
		const trace = new RecordedTrace({ where: "the trace", entries });
		expect(trace.read("balance A01", Type.Number())).toBe(7);
		trace.step("tick");
		expect(() => {
			trace.done();
		}).toThrow("the trace: read 2 of 3 recorded answers; the next was balance A02");
		expect(trace.read("balance A02", Type.Number())).toBe(9);
		trace.done();
	});

	it("refuses an answer asked in another order or past the end", () => {
		const trace = new RecordedTrace({ where: "the trace", entries });
		expect(() => trace.read("balance A02", Type.Number())).toThrow("the trace: answer 1 was recorded for balance A01, not balance A02");
		const short = new RecordedTrace({ where: "the trace", entries: entries.slice(0, 1) });
		short.read("balance A01", Type.Number());
		expect(() => {
			short.step("tick");
		}).toThrow("the trace: answer 2 was recorded for nothing, not tick");
	});
});
