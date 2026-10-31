/**
 * The testkit's per-mechanic golden gate (packages/testkit/src/golden.ts): a team filters the
 * golden log to its mechanic's event types and compares what its mechanic writes, line by line
 * without `seq` and `at`; `goldenCalls` gives the old tool calls with the replies to replay.
 */
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { compareGolden, eventTypesOf, goldenCalls, goldenLine, ownedBy, parseLegacyLog, readLegacyLog } from "@swarmtales/testkit";

const GOLDEN = join(resolve(import.meta.dirname, "../.."), "test", "golden", "cityofkeys-f4g4.events.jsonl");

describe("the golden gate", () => {
	const lines = readLegacyLog(GOLDEN);

	it("names a mechanic's event types from the carve plan's owners", () => {
		expect(eventTypesOf("ledger")).toEqual(["ledger_entry", "transfer"]);
		expect(eventTypesOf("puzzles")).toContain("level_contracted");
		expect(eventTypesOf("progression")).not.toContain("level_contracted");
	});

	it("filters a golden log to one mechanic, keeping the key order and dropping seq", () => {
		const ledger = ownedBy(lines, ["ledger"]);
		expect(ledger.length).toBe(lines.filter((line) => line.type === "ledger_entry" || line.type === "transfer").length);
		expect(ledger[0]).toBe('{"type":"ledger_entry","txId":"TX1","debit":"SYSTEM_MINT_BURN","credit":"A01","amount":15,"reason":"start points","minute":0}');
		expect(ownedBy(lines, ["progression", "receipts"]).every((line) => !line.includes('"seq"'))).toBe(true);
	});

	it("drops the sink's wall clock and reports the first difference", () => {
		const live = parseLegacyLog('{"type":"level_up","agent":"A01","from":1,"to":2,"seq":9,"minute":0,"at":"2026-10-29T20:44:02.000Z"}\n');
		const [first] = live;
		expect(first === undefined ? "" : goldenLine(first)).toBe('{"type":"level_up","agent":"A01","from":1,"to":2,"minute":0}');
		const expected = ownedBy(lines, ["progression"]);
		expect(compareGolden(expected, expected)).toBeUndefined();
		const changed = [...expected.slice(0, 3), expected[3]?.replace('"agent":', '"agents":') ?? "", ...expected.slice(4)];
		expect(compareGolden(expected, changed)).toEqual({ index: 3, expected: expected[3], actual: changed[3] });
		expect(compareGolden(expected, expected.slice(0, 2))?.index).toBe(2);
	});

	it("pairs each old tool call with the reply its agent got", () => {
		const calls = goldenCalls(lines);
		expect(calls).toHaveLength(lines.filter((line) => line.type === "tool_call").length);
		expect(calls[0]).toEqual({ minute: 0, agent: "A01", tool: "submitSolution", args: { level: 1, code: "UCXUHF" }, isError: false, text: "correct · +5 points · now on level 2 · receipt R-0001" });
		expect(calls.every((call) => call.text !== undefined)).toBe(true);
	});
});
