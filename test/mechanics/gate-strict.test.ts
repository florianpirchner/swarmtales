/**
 * Self-test of the strict golden gates (packages/testkit/src/gates.ts, carve-decisions.md D-12):
 * each helper fails when one golden line is broken, two lines of different mechanics swap, a
 * notice text, a turn input part or a `getStatus` reply changes, and an exclusion must say why
 * and must match something. A gate built from these helpers cannot pass on a mutated golden.
 */
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { LEGACY_EVENT_OWNERS, LEGACY_OVERSEERS, type LegacyOwner } from "@swarmtales/chronicle";
import {
	compareGolden,
	compareReplies,
	dropJustified,
	goldenCalls,
	goldenDiff,
	goldenNotices,
	goldenOrder,
	goldenTurnInputs,
	inputPart,
	ownedBy,
	readLegacyLog,
	type LegacyLine,
	type Reply,
} from "@swarmtales/testkit";

const GOLDEN = join(resolve(import.meta.dirname, "../.."), "test", "golden");
const NAMES = ["cityofkeys-f4g4", "cityofkeys-f10g10", "whispers-f10-grudge"];
const OVERSEERS: readonly string[] = LEGACY_OVERSEERS;
const MECHANICS: readonly LegacyOwner[] = [...new Set(Object.values(LEGACY_EVENT_OWNERS))].filter((owner) => owner !== "app" && owner !== "core" && !OVERSEERS.includes(owner));

function withLine(lines: readonly LegacyLine[], index: number, line: LegacyLine): readonly LegacyLine[] {
	return [...lines.slice(0, index), line, ...lines.slice(index + 1)];
}

describe.each(NAMES)("the strict gates on %s", (name) => {
	const lines = readLegacyLog(join(GOLDEN, `${name}.events.jsonl`));
	const owned = lines.map((line, index) => ({ line, index })).filter(({ line }) => ownedBy([line], MECHANICS).length === 1);

	it("fail on every mutated mechanic line (one in seven, all of them on the owned list)", () => {
		const expected = ownedBy(lines, MECHANICS);
		for (let position = 0; position < owned.length; position += 7) {
			const entry = owned[position];
			if (entry === undefined) continue;
			const mutated = ownedBy(withLine(lines, entry.index, { ...entry.line, mutated: true }), MECHANICS);
			const diff = goldenDiff(expected, mutated);
			expect(diff.map((mismatch) => mismatch.index)).toEqual([position]);
			expect(compareGolden(expected, mutated)?.index).toBe(position);
		}
	});

	it("fail when two lines of different mechanics swap (the order across mechanics)", () => {
		const pair = owned.findIndex((entry, position) => {
			const next = owned[position + 1];
			return next !== undefined && goldenOrder([entry.line], MECHANICS)[0]?.split(":")[0] !== goldenOrder([next.line], MECHANICS)[0]?.split(":")[0];
		});
		const first = owned[pair];
		const second = owned[pair + 1];
		if (first === undefined || second === undefined) throw new Error("no neighbours of different mechanics");
		const swapped = withLine(withLine(lines, first.index, second.line), second.index, first.line);
		expect(goldenOrder(swapped, MECHANICS)).not.toEqual(goldenOrder(lines, MECHANICS));
		expect(goldenDiff(ownedBy(lines, MECHANICS), ownedBy(swapped, MECHANICS))).toHaveLength(2);
	});

	it("fail when a notice text changes", () => {
		const index = lines.findIndex((line) => line.type === "notice");
		const line = lines[index];
		if (line === undefined) throw new Error("no notice");
		const changed = withLine(lines, index, { ...line, text: `${String(line.text)} ` });
		expect(goldenDiff(goldenNotices(lines), goldenNotices(changed))).toHaveLength(1);
		expect(goldenNotices(lines, String(line.to)).length).toBeLessThan(goldenNotices(lines).length);
	});

	it("fail when a status part of a turn input changes", () => {
		const inputs = goldenTurnInputs(lines);
		expect(inputs.length).toBe(lines.filter((line) => line.type === "turn_input").length);
		const first = inputs[0];
		if (first === undefined) throw new Error("no turn input");
		expect(inputPart(first, "[status]")).toMatch(/^\[status\] minute 0 · /);
		const index = lines.findIndex((line) => line.type === "turn_input");
		const line = lines[index];
		if (line === undefined) throw new Error("no turn input line");
		const changed = goldenTurnInputs(withLine(lines, index, { ...line, inputs: first.inputs.map((part) => part.replace("minute 0", "minute 1")) }));
		expect(changed[0] === undefined ? undefined : inputPart(changed[0], "[status]")).not.toBe(inputPart(first, "[status]"));
	});

	it("compare every reply, getStatus included, and fail on a changed one", () => {
		const calls = goldenCalls(lines);
		const replies: readonly Reply[] = calls.map(({ minute, agent, tool, isError, text }) => ({ minute, agent, tool, isError, text }));
		expect(compareReplies(calls, replies)).toEqual([]);
		const status = calls.findIndex((call) => call.tool === "getStatus");
		const changed = replies.map((reply, index) => (index === Math.max(status, 0) ? { ...reply, text: `${reply.text ?? ""}\nextra` } : reply));
		expect(compareReplies(calls, changed).map((mismatch) => mismatch.index)).toEqual([Math.max(status, 0)]);
		expect(compareReplies(calls, replies.slice(1)).length).toBeGreaterThan(0);
	});
});

describe("an exclusion", () => {
	it("must say why and must leave something out", () => {
		expect(dropJustified([1, 2, 3], (value) => value === 2, "step 18 not carved")).toEqual({ kept: [1, 3], dropped: 1 });
		expect(() => dropJustified([1, 2, 3], (value) => value === 2, " ")).toThrow(/say why/);
		expect(() => dropJustified([1, 2, 3], (value) => value === 9, "a stale reason")).toThrow(/nothing matched/);
	});
});
