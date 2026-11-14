// SPDX-License-Identifier: Apache-2.0
/** The pure helpers of `@swarmtales/viewer-ui`: FEN, view descriptors, the location hash, report links, scales. */
import { memorySource, loadRun } from "@swarmtales/viewer-core";
import { describe, expect, it } from "vitest";
import { costSeries } from "../src/cost-series.ts";
import { moveSquares, parseFen, squareIndex, glyphOf } from "../src/fen.ts";
import { formatHash, parseHash } from "../src/hash.ts";
import { safeHtml, SANITIZE, seqParts } from "../src/markdown.ts";
import { positionOf, scrollToShow, visibleRange } from "../src/replay-math.ts";
import { filterRuns, sortRuns } from "../src/run-list-logic.ts";
import { niceTicks } from "../src/scale.ts";
import { parseViews, pathValue, viewText } from "../src/views.ts";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("FEN", () => {
	it("reads the start position", () => {
		const board = parseFen(START);
		expect(board?.turn).toBe("w");
		expect(board?.squares).toHaveLength(64);
		expect(board?.squares[0]).toBe("r");
		expect(board?.squares[4]).toBe("k");
		expect(board?.squares[60]).toBe("K");
		expect(board?.squares[20]).toBeUndefined();
	});
	it("refuses a position that is not 8 ranks of 8", () => {
		expect(parseFen("8/8/8/8/8/8/8")).toBeUndefined();
		expect(parseFen("9/8/8/8/8/8/8/8 w")).toBeUndefined();
		expect(parseFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNX w")).toBeUndefined();
		expect(parseFen("")).toBeUndefined();
	});
	it("names squares and moves", () => {
		expect(squareIndex("a8")).toBe(0);
		expect(squareIndex("h1")).toBe(63);
		expect(squareIndex("e4")).toBe(36);
		expect(squareIndex("z9")).toBeUndefined();
		expect(moveSquares("e2e4")).toEqual([52, 36]);
		expect(moveSquares("e7e8q")).toEqual([12, 4]);
		expect(moveSquares("nope")).toBeUndefined();
	});
	it("draws both colours with the solid glyph, as text", () => {
		expect(glyphOf("K")).toBe(glyphOf("k"));
		expect(glyphOf("p")).toContain("︎");
	});
});

describe("view descriptors", () => {
	const good = { id: "board", kind: "board-fen", event: "move_played", fields: { fen: "fen" } };
	it("parses a list and the wrapped form, and keeps the good entries", () => {
		expect(parseViews(JSON.stringify([good])).views).toEqual([good]);
		expect(parseViews(JSON.stringify({ views: [good] })).views).toEqual([good]);
		const mixed = parseViews(JSON.stringify([good, { id: "x" }, 5]), "v.json");
		expect(mixed.views).toEqual([good]);
		expect(mixed.issues).toHaveLength(2);
		expect(mixed.issues[0]).toContain("v.json");
	});
	it("reports text that is no JSON or no list", () => {
		expect(parseViews("{").issues).toHaveLength(1);
		expect(parseViews('{"a":1}').issues).toHaveLength(1);
	});
	it("reads fields by dotted path", () => {
		const data = { fen: "x", move: { to: "e4", list: ["a", "b"] }, ply: 3 };
		expect(pathValue(data, "fen")).toBe("x");
		expect(pathValue(data, "$.move.to")).toBe("e4");
		expect(pathValue(data, "move.list.1")).toBe("b");
		expect(pathValue(data, "move.nope.deeper")).toBeUndefined();
		expect(viewText({ ...good, fields: { fen: "fen", caption: "ply" } }, "caption", data)).toBe("3");
		expect(viewText(good, "caption", data)).toBeUndefined();
	});
});

describe("location hash", () => {
	it("round-trips and accepts a bare seq", () => {
		expect(parseHash("#seq=57")).toEqual({ seq: 57 });
		const location = { run: "stories/a b/run", view: "replay", seq: 12 } as const;
		expect(parseHash(formatHash(location))).toEqual(location);
		expect(formatHash({})).toBe("");
	});
	it("ignores nonsense", () => {
		expect(parseHash("#seq=abc&view=nope")).toEqual({});
		expect(parseHash("#seq=-4")).toEqual({});
		expect(parseHash("")).toEqual({});
	});
});

describe("report links", () => {
	// The DOM part (sanitise, then link the text nodes) is checked in a browser; here the text split and the settings.
	it("splits #seq out of a text node, not entities, not words", () => {
		expect(seqParts("see #12 and C#3, &#123; then #99.")).toEqual(["see ", { seq: 12, text: "#12" }, " and C#3, &#123; then ", { seq: 99, text: "#99" }, "."]);
		expect(seqParts("no references")).toEqual(["no references"]);
	});
	it("links only the seqs the run has", () => {
		expect(seqParts("#1 and #2", (seq) => seq === 2)).toEqual(["#1 and ", { seq: 2, text: "#2" }]);
	});
	it("never lets a report keep style, class or id", () => {
		expect(SANITIZE.FORBID_ATTR).toEqual(expect.arrayContaining(["style", "class", "id"]));
		expect(SANITIZE.FORBID_TAGS).toEqual(expect.arrayContaining(["style", "form", "iframe"]));
	});
	it("escapes the text where no DOM is there to sanitise with", () => {
		expect(safeHtml("<img src=x onerror=alert(1)> #3")).toBe("<pre>&lt;img src=x onerror=alert(1)&gt; #3</pre>");
	});
});

describe("scales, windows and lists", () => {
	it("makes round ticks that cover the maximum", () => {
		expect(niceTicks(0.078)).toEqual([0, 0.02, 0.04, 0.06, 0.08]);
		expect(niceTicks(97).at(-1)).toBeGreaterThanOrEqual(97);
		expect(niceTicks(0)).toEqual([0, 1]);
	});
	it("windows a long list", () => {
		expect(visibleRange(0, 240, 24, 100000, 0)).toEqual({ start: 0, end: 10 });
		expect(visibleRange(2400, 240, 24, 100000, 2)).toEqual({ start: 98, end: 112 });
		expect(visibleRange(0, 240, 24, 3)).toEqual({ start: 0, end: 3 });
		expect(scrollToShow(5, 0, 240, 24)).toBeUndefined();
		expect(scrollToShow(50, 0, 240, 24)).toBe(50 * 24 - 120 + 12);
	});
	it("finds the position of a seq in a log with gaps", () => {
		const events = [1, 2, 5, 9].map((seq) => ({ seq, minute: 0, type: "t", line: seq, data: {} }));
		expect(positionOf(events, 5)).toBe(2);
		expect(positionOf(events, 6)).toBe(2);
		expect(positionOf(events, 0)).toBe(0);
		expect(positionOf(events, 99)).toBe(3);
	});
	it("builds cumulative cost lines and groups the small keys as other", () => {
		const points = Array.from({ length: 10 }, (_unused, index) => ({ minute: 1, key: `A${String(index)}`, costUsd: index + 1 }));
		const series = costSeries(points, 2);
		expect(series).toHaveLength(8);
		expect(series.at(-1)?.key).toBe("other");
		expect(series[0]?.points.at(-1)).toEqual([3, 10]);
		expect(costSeries([{ minute: 0, key: "x", costUsd: 2 }, { minute: 1, key: "x", costUsd: 1 }], 1)[0]?.points).toEqual([[0, 0], [1, 2], [2, 3]]);
	});
	it("filters and sorts the run list", () => {
		const runs = [
			{ dir: "a/run", name: "a", story: "chess", startedAt: "2026-01-02", costUsd: 3, signed: true, hasReport: false },
			{ dir: "b/run", name: "b", story: "whispers", startedAt: "2026-01-01", costUsd: 1, signed: true, hasReport: true },
			{ dir: "c/run", name: "c", signed: false, hasReport: false },
		];
		expect(filterRuns(runs, "chess", "").map((run) => run.name)).toEqual(["a"]);
		expect(filterRuns(runs, "", "B/").map((run) => run.name)).toEqual(["b"]);
		expect(sortRuns(runs, "date", true).map((run) => run.name)).toEqual(["a", "b", "c"]);
		expect(sortRuns(runs, "cost", false).map((run) => run.name)).toEqual(["c", "b", "a"]);
		expect(sortRuns(runs, "name", false).map((run) => run.name)).toEqual(["a", "b", "c"]);
	});
	it("loads from memory like the viewer does", async () => {
		const run = await loadRun(memorySource({ "x/events.jsonl": '{"type":"a","seq":1,"minute":0}\n' }), "x");
		expect(run.events).toHaveLength(1);
	});
});
