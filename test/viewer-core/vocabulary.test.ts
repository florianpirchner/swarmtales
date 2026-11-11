/**
 * How viewer-core reads a log's words: who acted and whom a line was about (actor rules), which lines
 * are messages (the message vocabulary), on recorded runs of three stories and on lines in memory.
 * Also the load and compare contracts that depend on them (an optional read that fails, the cost source).
 */
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { compareRuns, loadRun, memorySource, messageGraph, type RunEvent, type RunSource } from "@swarmtales/viewer-core";
import { actorOf, parseEvents } from "../../packages/viewer-core/src/events.ts";
import { messagesOf } from "../../packages/viewer-core/src/messages.ts";
import { fsRunSource } from "../helpers/fs-run-source.ts";

const repository = fsRunSource(join(import.meta.dirname, "..", ".."));
const CITY = "stories/cityofkeys/runs/act2-12a-003-f10g10-director/run";
const TICTACTOE = "stories/tictactoe-teams/runs/tictactoe-teams-4x4-06a-005-haiku/run";
const CONVOY = "stories/convoy/runs/convoy-06a-001-smoke/run";

/** Messages per event type, each message once (not per recipient). */
function messagesByType(events: readonly RunEvent[]): Readonly<Record<string, number>> {
	const counts: Record<string, number> = {};
	for (const message of messagesOf(events)) counts[message.type] = (counts[message.type] ?? 0) + 1;
	return counts;
}

const line = (value: Record<string, unknown>): string => JSON.stringify(value);

describe("the message vocabulary on recorded runs", () => {
	it("cityofkeys: direct messages, posts and gamemaker notes, without the city's notices and receipts", async () => {
		const run = await loadRun(repository, CITY);
		// 645 `notice` lines (delivery receipts with text), 245 receipts and 51 city board posts are not messages;
		// a gamemaker note to the board is also a board post and counts there.
		expect(messagesByType(run.events)).toEqual({ dm_sent: 130, gamemaker_note: 143, board_post: 192, group_post: 74, cast_dm: 4 });
		const graph = messageGraph(run.events);
		expect(graph.nodes).not.toContain("CITY");
		expect(graph.edges.filter((edge) => edge.from === "COURIER").reduce((sum, edge) => sum + edge.count, 0)).toBe(170);
		expect(graph.edges.find((edge) => edge.from === "A06" && edge.to === "STEWARD")?.types).toEqual(["cast_dm"]);
		expect(graph.edges.every((edge) => edge.types.length === 1)).toBe(true);
	});

	it("tictactoe-teams: team posts only, a written strategy brain is no message", async () => {
		const run = await loadRun(repository, TICTACTOE);
		expect(run.events.filter((event) => event.type === "brain_written")).toHaveLength(6);
		expect(messagesByType(run.events)).toEqual({ team_post: 105 });
		expect(messageGraph(run.events).nodes.filter((node) => node.startsWith("team:")).sort()).toEqual(["team:O", "team:X"]);
	});

	it("convoy: table talk is a message to the table", async () => {
		const run = await loadRun(repository, CONVOY);
		expect(messagesByType(run.events)).toEqual({ convoy_spoken: 103 });
		const graph = messageGraph(run.events);
		expect(graph.edges.map((edge) => edge.to)).toEqual(Array(6).fill("table"));
		expect(graph.edges.reduce((sum, edge) => sum + edge.count, 0)).toBe(103);
	});
});

describe("a caller's message vocabulary", () => {
	const events = parseEvents(
		[
			line({ type: "whisper", speaker: "A01", target: ["A02", "A03"], text: "psst", seq: 1 }),
			line({ type: "dm_sent", from: "A01", to: "A02", text: "hi", seq: 2 }),
			line({ type: "group_post", author: "HOUSE", group: "G1", text: "rules", seq: 3 }),
		].join("\n"),
	).events;

	it("adds types, takes defaults out and replaces the system authors", () => {
		expect(messageGraph(events).edges.map((edge) => `${edge.from}>${edge.to}`)).toEqual(["A01>A02", "HOUSE>group:G1"]);
		const graph = messageGraph(events, undefined, { types: { whisper: { to: { field: "target" }, from: "speaker" }, dm_sent: false }, systemAuthors: ["HOUSE"] });
		expect(graph.edges.map((edge) => `${edge.from}>${edge.to}:${edge.types.join()}`)).toEqual(["A01>A02:whisper", "A01>A03:whisper"]);
		expect(messageGraph(events, 1, { types: { whisper: { to: { field: "target" }, from: "speaker" } } }).edges).toHaveLength(2);
	});
});

describe("actor and subject", () => {
	it("a group member added by someone else, a director rule, a guard and an exile are the doer's, about the subject", () => {
		const { events } = parseEvents(
			[
				line({ type: "group_membership", group: "G1", agent: "A05", change: "added", by: "A01", seq: 1 }),
				line({ type: "director_action", rule: "courier-2", action: "post", actor: "A06", seq: 2 }),
				line({ type: "guard_verdict", tool: "postGroup", agent: "A06", rule: "no-fragments", allowed: true, by: "model", seq: 3 }),
				line({ type: "exiled", agent: "A04", by: "seal", seq: 4 }),
				line({ type: "exiled", agent: "A07", seq: 5 }),
				line({ type: "convoy_audited", seat: "A05", by: "A06", seq: 6 }),
				line({ type: "goal_dealt", agent: "A01", text: "protect A04", seq: 7 }),
				line({ type: "level_up", agent: "A02", to: 3, seq: 8 }),
			].join("\n"),
		);
		expect(events.map((event) => [event.type, event.actor, event.subject])).toEqual([
			["group_membership", "A01", "A05"],
			["director_action", "director", "A06"],
			["guard_verdict", "guard", "A06"],
			["exiled", "seal", "A04"],
			["exiled", undefined, "A07"],
			["convoy_audited", "A06", "A05"],
			["goal_dealt", undefined, "A01"],
			["level_up", "A02", undefined],
		]);
	});

	it("a caller's rule replaces the default of its type; an empty rule restores the plain field order", () => {
		const text = [line({ type: "director_action", rule: "r", action: "post", actor: "A06", seq: 1 }), line({ type: "handed", giver: "A02", agent: "A03", seq: 2 })].join("\n");
		const { events } = parseEvents(text, "events.jsonl", { director_action: {}, handed: { actor: "giver", subject: "agent" } });
		expect(events.map((event) => [event.actor, event.subject])).toEqual([
			["A06", undefined],
			["A02", "A03"],
		]);
		expect(actorOf({ agent: "A05", by: "A01" }, { subject: "agent" })).toEqual({ actor: "A01", subject: "A05" });
	});

	it("on cityofkeys act2-12a-003 no director action lands in a resident's lane", async () => {
		const run = await loadRun(repository, CITY);
		const actions = run.events.filter((event) => event.type === "director_action");
		expect(actions.length).toBeGreaterThan(100);
		expect(new Set(actions.map((event) => event.actor))).toEqual(new Set(["director"]));
		expect(actions.filter((event) => event.subject?.startsWith("A") === true).length).toBeGreaterThan(50);
		const memberships = run.events.filter((event) => event.type === "group_membership");
		expect(memberships.every((event) => event.actor === event.data.by && event.subject === event.data.agent)).toBe(true);
	});
});

describe("loading and comparing", () => {
	it("an optional read that rejects becomes an issue, not a failed load", async () => {
		const files = memorySource({ "run/events.jsonl": line({ type: "run_start", seq: 1 }), "run/REPORT.md": "# r" });
		const failing: RunSource = {
			list: async (dir) => (dir === "run/agents" ? Promise.reject(new Error("NotFoundError")) : files.list(dir)),
			readText: async (path) => (path === "run/REPORT.md" ? Promise.reject(new Error("403 rate limit")) : files.readText(path)),
		};
		const run = await loadRun(failing, "run");
		expect(run.events).toHaveLength(1);
		expect(run.report).toBeUndefined();
		expect(run.issues).toEqual([
			{ file: "run/REPORT.md", reason: "could not be read (403 rate limit)" },
			{ file: "run/agents", reason: "could not be read (NotFoundError)" },
		]);
	});

	it("takes the cost from the log's usage lines, else from usage.json, and says which", async () => {
		const usage = JSON.stringify({ totals: { requests: 1, costUsd: 9 } });
		const logged = await loadRun(memorySource({ "events.jsonl": line({ type: "usage", agent: "A01", costUsd: 0.5, seq: 1 }), "usage.json": usage }), "");
		const unlogged = await loadRun(memorySource({ "events.jsonl": line({ type: "run_start", seq: 1 }), "usage.json": usage }), "");
		const rows = compareRuns([logged, unlogged]).rows;
		expect(rows.map((row) => [row.costUsd, row.costSource])).toEqual([
			[0.5, "log"],
			[9, "usage.json"],
		]);
	});
});

describe("seq and minute of a line", () => {
	it("keeps a line with a bad seq or minute, as an issue, on its line number and the minute before it", () => {
		const text = ['{"type":"a","seq":1,"minute":2}', '{"type":"b","seq":-1,"minute":1e300}', '{"type":"c","seq":9007199254740993,"minute":"x"}', '{"type":"d","seq":1.5,"minute":3}'].join("\n");
		const { events, issues } = parseEvents(text);
		expect(events.map((event) => [event.seq, event.minute])).toEqual([[1, 2], [2, 2], [3, 2], [4, 3]]);
		expect(issues.map((issue) => [issue.line, issue.reason])).toEqual([
			[2, "seq is not a whole number from 0"],
			[2, "minute is not a number from 0 to 100000"],
			[3, "seq is not a whole number from 0"],
			[3, "minute is not a number from 0 to 100000"],
			[4, "seq is not a whole number from 0"],
		]);
	});
});
