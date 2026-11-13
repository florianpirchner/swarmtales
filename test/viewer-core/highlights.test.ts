/** Highlights for the replay: report citations with their line, rare and notable actions, the actor's thought before. */
import { describe, expect, it } from "vitest";
import { parseEvents } from "../../packages/viewer-core/src/events.ts";
import { highlightsOf } from "../../packages/viewer-core/src/highlights.ts";

const log = (lines: readonly Record<string, unknown>[]) => parseEvents(lines.map((line, at) => JSON.stringify({ seq: at + 1, minute: 0, ...line })).join("\n")).events;

const events = log([
	{ type: "run_start" },
	{ type: "thinking", agent: "A01", text: "A02 trusts me; a forged receipt will do it." },
	{ type: "tool_call", agent: "A01" },
	{ type: "receipt_forged", by: "A01", from: "A03" },
	{ type: "move_played", agent: "A02" },
	{ type: "move_played", agent: "A01" },
	{ type: "move_played", agent: "A02" },
	{ type: "move_played", agent: "A01" },
	{ type: "move_refused", agent: "A02" },
	{ type: "move_refused", agent: "A02" },
	{ type: "move_refused", agent: "A02" },
	{ type: "move_refused", agent: "A02" },
	{ type: "move_refused", agent: "A02" },
	{ type: "move_refused", agent: "A02" },
	{ type: "run_end" },
]);

describe("highlights", () => {
	it("picks rare actions with the actor's last thought, and caps notable types", () => {
		const highlights = highlightsOf(events);
		const forged = highlights.find((highlight) => highlight.seq === 4);
		expect(forged?.source).toBe("rare");
		expect(forged?.thought).toEqual({ seq: 2, text: "A02 trusts me; a forged receipt will do it." });
		expect(highlights.filter((highlight) => highlight.source === "notable")).toHaveLength(5);
		// Frequent ordinary actions and the runtime's own lines are not highlights.
		expect(highlights.some((highlight) => [1, 3, 5, 15].includes(highlight.seq))).toBe(false);
	});

	it("takes the report's citations with their line as the reason, skipping ranges and unknown seqs", () => {
		const report = ["| Counted | events #1 to #15 |", "- **A02** played on after the forgery (#5, #6).", "A ghost line #99."].join("\n");
		const highlights = highlightsOf(events, [report]);
		expect(highlights.find((highlight) => highlight.seq === 5)).toMatchObject({ source: "report", reason: "A02 played on after the forgery (#5, #6)." });
		expect(highlights.some((highlight) => highlight.seq === 1 || highlight.seq === 15 || highlight.seq === 99)).toBe(false);
		expect(highlights.map((highlight) => highlight.seq)).toEqual([...highlights.map((highlight) => highlight.seq)].sort((a, b) => a - b));
	});
});
