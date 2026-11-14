// SPDX-License-Identifier: Apache-2.0
/** From `asked.firings[n]` to the line that fired (decision A34): over a small log with twin lines and over the committed logs of the city slice. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { type ActorId, type Envelope, StoredEnvelopeSchema } from "@swarmtales/contracts";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { findFirings, TAKE_TOOL } from "../src/firings.ts";

const SOURCE = "@test/votes/votes";
const closed = (seq: number, line: string, tick = 1): Envelope => ({ seq, tick, source: SOURCE, type: "closed", actor: "kernel", payload: { line, by: "A01" } });
// The payload inside a reply has the key order of the plugin, the stored line the canonical one: both are the same payload.
const firing = (n: number, line: string, tick = 1): object => ({ n, tick, event: "votes.closed", payload: { by: "A01", line } });
const take = (seq: number, actor: ActorId, firings: readonly object[], tick = 1): Envelope => ({ seq, tick, source: "kernel", type: "tool_result", actor, causedBy: seq - 1, tool: TAKE_TOOL, payload: { as: "take", reply: JSON.stringify({ firings, calls: 1 }) } });
const asked = (seq: number, actor: ActorId, firings: readonly number[]): Envelope => ({ seq, tick: 1, source: "@swarmtales/engine/director", type: "asked", actor, payload: { firings } });

/** Twin lines 2 and 3 and a third twin 9 after the first `take`; line 4 differs in its payload, line 1 in its tick. */
const LOG: readonly Envelope[] = [
	closed(1, "x", 0), closed(2, "x"), closed(3, "x"), closed(4, "y"),
	take(6, "director:warden", [firing(1, "x"), firing(2, "x"), firing(3, "y")]), asked(7, "director:warden", [1, 2, 3]),
	take(8, "director:clerk", [firing(1, "x"), firing(2, "gone")]),
	closed(9, "x"), take(11, "director:warden", [firing(4, "x")]),
	{ ...take(12, "resident:A01", [firing(1, "y")]), tool: "@test/votes/votes/take" }, { ...take(13, "director:warden", []), payload: { as: "take", reply: "no JSON" } },
];

describe("findFirings", () => {
	it("finds the line of the firing's tick with its type and payload; twins are told apart by their order, per Director", () => {
		expect(findFirings(LOG).map((found) => [found.director, found.n, found.taken, found.trigger])).toEqual([
			["director:warden", 1, 6, 2], ["director:warden", 2, 6, 3], ["director:warden", 3, 6, 4],
			["director:clerk", 1, 8, 2], ["director:clerk", 2, 8, undefined],
			["director:warden", 4, 11, 9],
		]);
		// The way of a reader: the actor and the numbers of the record `asked` name the entries.
		const record = LOG[5];
		const numbers: unknown = Reflect.get(Object(record?.payload), "firings");
		expect(findFirings(LOG).filter((found) => found.director === record?.actor && Array.isArray(numbers) && numbers.includes(found.n)).map((found) => found.trigger)).toEqual([2, 3, 4]);
	});

	it.each([["games/city-slice/test/timelines/seed-7.jsonl", 164, 160], ["packages/viewer-core/test/fixtures/resumed-run/events.jsonl", 140, 136]])("%s: the warden's firing 1 is the line of `decision_proposed`", (file, taken, trigger) => {
		const lines = readFileSync(join(import.meta.dirname, "..", "..", "..", file), "utf8").trimEnd().split("\n").map((line): unknown => ({ at: "2026-11-14T12:00:00.000Z", ...Object(JSON.parse(line)) }));
		const log = Parse(Type.Array(StoredEnvelopeSchema, { description: "The lines of the log" }), lines);
		expect(findFirings(log)).toMatchObject([{ director: "director:warden", n: 1, tick: 6, event: "decisions.decision_proposed", taken, trigger }]);
		expect(log.find((line) => line.seq === trigger)?.type).toBe("decision_proposed");
	});
});
