/**
 * `@swarmtales/viewer-core` on recorded runs and on runs in memory: finding and loading run folders,
 * the chain verdict, the index, the series, the comparison and the report links.
 */
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	actorLanes,
	compareRuns,
	findRuns,
	indexRun,
	loadRun,
	memorySource,
	messageGraph,
	reportLinks,
	toolCounts,
	typeCounts,
	usageByMinute,
	usageTotals,
	verifyRun,
} from "@swarmtales/viewer-core";
// Helpers the hosts do not need are exported by their source files, not by the package index.
import { actorOf, parseEvents } from "../../packages/viewer-core/src/events.ts";
import { messagesOf } from "../../packages/viewer-core/src/messages.ts";
import { fsRunSource } from "../helpers/fs-run-source.ts";

const ROOT = join(import.meta.dirname, "..", "..");
const repository = fsRunSource(ROOT);
const CHESS = "stories/chess/runs/chess-02a-003-moves-s29/run";
const CITY = "stories/cityofkeys/runs/act2-12a-003-f10g10-director/run";

/** `expect.stringMatching`, typed as the asymmetric matcher it is. */
function matching(pattern: RegExp): unknown {
	const matcher: unknown = expect.stringMatching(pattern);
	return matcher;
}

function anyNumber(): unknown {
	const matcher: unknown = expect.any(Number);
	return matcher;
}

const line = (value: Record<string, unknown>): string => JSON.stringify(value);
const SMALL = [
	line({ type: "run_start", story: "demo", seed: 5, seq: 1, minute: 0, at: "2026-11-11T10:00:00.000Z" }),
	line({ type: "usage", agent: "A01", model: "m1", input: 10, output: 5, cacheRead: 0, cacheWrite: 0, costUsd: 0.5, seq: 2, minute: 0 }),
	line({ type: "dm_sent", from: "A01", to: "A02", text: "hello", seq: 3, minute: 0 }),
	line({ type: "dm_delivered", from: "A01", to: "A02", seq: 4, minute: 0 }),
	"not json",
	line({ type: "tool_call", agent: "A02", tool: "readBoard", seq: 6, minute: 1 }),
	line({ type: "team_post", from: "A02", team: "B", text: "plan", seq: 7 }),
	line({ type: "usage", agent: "A02", model: "m2", input: 1, output: 1, costUsd: 0.25, seq: 8, minute: 2 }),
	line({ type: "run_end", reason: "time is up", seq: 9, minute: 2 }),
].join("\n");

describe("run folders", () => {
	it("finds every recorded run, summarised from its small files", async () => {
		const runs = await findRuns(repository, "stories/chess");
		expect(runs.length).toBeGreaterThanOrEqual(12);
		expect(runs.find((run) => run.dir === CHESS)).toMatchObject({ name: "chess-02a-003-moves-s29", story: "chess-moves-p80", agents: 2, signed: true, hasReport: true, costUsd: anyNumber() });
		expect((await findRuns(repository, "")).length).toBeGreaterThanOrEqual(150);
	});

	it("loads a signed run, verifies it and lists its transcripts", async () => {
		const run = await loadRun(repository, CHESS);
		expect(run.issues).toEqual([]);
		expect(run.events).toHaveLength(1403);
		expect(run.genesis).toMatchObject({ story: "chess-moves-p80", seed: 29 });
		expect(run.meta?.title).toBe("Chess");
		expect(run.usage?.totals.costUsd).toBeCloseTo(0.109, 3);
		expect(run.analysis).toBeTypeOf("object");
		expect(run.report).toContain("#");
		expect(run.transcripts).toEqual([
			{ agent: "A01", path: `${CHESS}/agents/A01.md`, promptPath: `${CHESS}/agents/A01.prompt.md` },
			{ agent: "A02", path: `${CHESS}/agents/A02.md`, promptPath: `${CHESS}/agents/A02.prompt.md` },
		]);
		const verification = verifyRun(run);
		expect(verification).toMatchObject({ signed: true, checkedWith: "run.pub", verdict: { ok: true, lines: 1403 } });
		const tampered = { ...run, texts: { ...run.texts, events: run.texts.events.replace('"minute":0', '"minute":1') } };
		expect(verifyRun(tampered)).toMatchObject({ signed: true, verdict: { ok: false, line: 1 } });
		expect(verifyRun({ ...run, texts: { events: run.texts.events } })).toEqual({ signed: false });
		expect(verifyRun({ ...run, texts: { events: run.texts.events }, issues: [{ file: `${CHESS}/events.chain.jsonl`, reason: "could not be read (GitHub answered 403)" }] })).toEqual({ signed: false, unreadable: "events.chain.jsonl could not be read (GitHub answered 403)" });
	});

	it("lists runs from the listing first and fills their details at most `concurrency` at a time", async () => {
		const files: Record<string, string> = {};
		for (const name of ["a", "b", "c", "d"]) {
			files[`runs/${name}/events.jsonl`] = SMALL;
			files[`runs/${name}/000-run.json`] = JSON.stringify({ storyId: `story-${name}` });
		}
		const inner = memorySource(files);
		let open = 0;
		let most = 0;
		const slow = {
			list: (dir: string) => inner.list(dir),
			async readText(path: string) {
				open += 1;
				most = Math.max(most, open);
				await new Promise((resolve) => setTimeout(resolve, 5));
				open -= 1;
				return inner.readText(path);
			},
		};
		const details: string[] = [];
		const done = new Promise<void>((resolve) => {
			const onDetails = (run: { readonly story?: string }) => {
				details.push(run.story ?? "");
				if (details.length === 4) resolve();
			};
			void findRuns(slow, "", { concurrency: 2, onDetails }).then((runs) => {
				expect(runs.map((run) => [run.dir, run.pending, run.story])).toEqual([["runs/a", true, undefined], ["runs/b", true, undefined], ["runs/c", true, undefined], ["runs/d", true, undefined]]);
			});
		});
		await done;
		expect(details.sort()).toEqual(["story-a", "story-b", "story-c", "story-d"]);
		expect(most).toBeLessThanOrEqual(2);
		expect((await findRuns(slow, "")).map((run) => run.story)).toEqual(["story-a", "story-b", "story-c", "story-d"]);
	});

	it("loads a folder with only events.jsonl, and reads a broken line as an issue", async () => {
		const source = memorySource({ "runs/demo/events.jsonl": SMALL, "runs/demo/000-run.json": "{not json" });
		expect(await findRuns(source)).toEqual([{ dir: "runs/demo", name: "demo", signed: false, hasReport: false }]);
		const run = await loadRun(source, "runs/demo");
		expect(run.events).toHaveLength(8);
		expect(run.issues).toEqual([
			{ file: "runs/demo/events.jsonl", line: 5, reason: "not a JSON line" },
			{ file: "runs/demo/000-run.json", reason: "not JSON" },
		]);
		// A line without a minute keeps the minute of the line before it.
		expect(run.events.find((event) => event.type === "team_post")).toMatchObject({ seq: 7, minute: 1, actor: "A02", line: 7 });
		expect(verifyRun(run)).toEqual({ signed: false });
		await expect(loadRun(source, "runs/none")).rejects.toThrow(/events.jsonl is missing/);
	});

	it("parses events leniently and takes the actor from the first actor field", () => {
		const { events, issues } = parseEvents([line({ type: "x" }), line({ seq: 2 }), "[1]", line({ type: "y", by: "A03", from: "A04", seq: 9, minute: 3 })].join("\n"));
		expect(events.map((event) => [event.seq, event.minute, event.type, event.actor])).toEqual([
			[1, 0, "x", undefined],
			[9, 3, "y", "A03"],
		]);
		expect(issues.map((issue) => issue.line)).toEqual([2, 3]);
		expect(actorOf({ author: "CITY", voter: "A01" })).toEqual({ actor: "CITY" });
	});
});

describe("the index and the series", () => {
	it("indexes by seq, minute, actor and type, and answers up to a seq", async () => {
		const run = await loadRun(memorySource({ "events.jsonl": SMALL }), "");
		const index = indexRun(run.events);
		expect([index.firstSeq, index.lastSeq, index.lastMinute]).toEqual([1, 9, 2]);
		expect(index.bySeq(3)?.type).toBe("dm_sent");
		expect(index.atMinute(2).map((event) => event.seq)).toEqual([8, 9]);
		expect(index.byActor("A02").map((event) => event.seq)).toEqual([6, 7, 8]);
		expect(index.byType("usage")).toHaveLength(2);
		expect(index.actors()).toEqual(["A01", "A02"]);
		expect(index.seqAtMinute(1)).toBe(6);
		expect(index.seqAtMinute(3)).toBeUndefined();
		expect(index.upTo(4)).toHaveLength(4);
		expect(index.latest("usage", 7)?.seq).toBe(2);
		expect(index.latest("usage", 1)).toBeUndefined();

		expect(usageByMinute(run.events)).toEqual([
			{ minute: 0, key: "total", requests: 1, input: 10, output: 5, cacheRead: 0, cacheWrite: 0, costUsd: 0.5 },
			{ minute: 2, key: "total", requests: 1, input: 1, output: 1, cacheRead: 0, cacheWrite: 0, costUsd: 0.25 },
		]);
		expect([...usageTotals(run.events, "model").keys()]).toEqual(["m1", "m2"]);
		expect(actorLanes(run.events).map((lane) => [lane.actor, lane.seqs.length])).toEqual([
			["A01", 3],
			["A02", 3],
		]);
		expect(typeCounts(run.events, 4).find((count) => count.key === "usage")?.count).toBe(1);
		expect(toolCounts(run.events)).toEqual([{ key: "readBoard", count: 1 }]);
		// A delivery without text is no second message; a channel post goes to the channel.
		expect(messageGraph(run.events).edges).toEqual([
			{ from: "A01", to: "A02", count: 1, firstSeq: 3, lastSeq: 3, types: ["dm_sent"] },
			{ from: "A02", to: "team:B", count: 1, firstSeq: 7, lastSeq: 7, types: ["team_post"] },
		]);
		expect(messageGraph(run.events, 6).edges).toHaveLength(1);
		expect(messagesOf(run.events)).toHaveLength(2);
	});

	it("derives the series of a 12-agent run", async () => {
		const run = await loadRun(repository, CITY);
		expect(run.events.length).toBeGreaterThan(13_000);
		expect(verifyRun(run)).toEqual({ signed: false });
		const index = indexRun(run.events);
		expect(index.actors()).toEqual(expect.arrayContaining(["A01", "A12", "COURIER", "STEWARD"]));
		const cost = usageByMinute(run.events).reduce((sum, point) => sum + point.costUsd, 0);
		expect(cost).toBeGreaterThan(0);
		const graph = messageGraph(run.events);
		expect(graph.edges.some((edge) => edge.types.includes("dm_sent"))).toBe(true);
		expect(graph.nodes).toContain("group:G1");
		const links = reportLinks(run.report ?? "", index);
		expect(links.length).toBeGreaterThan(50);
		expect(links.every((link) => link.event?.seq === link.seq)).toBe(true);
	});
});

describe("comparing runs and report links", () => {
	it("gives one row per run and the spread", async () => {
		const runs = await Promise.all(["chess-02a-005-nobrain-s29", "chess-02a-006-nobrain-s31"].map((name) => loadRun(repository, `stories/chess/runs/${name}/run`)));
		const comparison = compareRuns(runs, { lines: (model) => model.events.length });
		expect(comparison.rows.map((row) => [row.name, row.seed, row.ended])).toEqual([
			["chess-02a-005-nobrain-s29", 29, true],
			["chess-02a-006-nobrain-s31", 31, true],
		]);
		expect(comparison.rows[0]?.models).toMatchObject({ residents: matching(/haiku/) });
		expect(comparison.spread.events).toMatchObject({ n: 2, min: 889, max: 974 });
		expect(comparison.spread.lines).toEqual(comparison.spread.events);
		expect(comparison.spread.costUsd?.n).toBe(2);
	});

	it("finds #seq references, not headings, entities or words", () => {
		const text = "# Title\nSee #12 and (#3), not &#160; or a#4 or #5x.\n";
		expect(reportLinks(text).map((link) => [link.seq, text.slice(link.start, link.end)])).toEqual([
			[12, "#12"],
			[3, "#3"],
		]);
	});
});
