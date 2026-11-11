/**
 * The story graph of `@swarmtales/viewer-core` on every registered story (as `swt story show <name>
 * --json` exports it), on the YAML example, and a recorded run laid over its story.
 */
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { storyData } from "@swarmtales/kernel";
import { loadRun, runOverlay, storyGraph, type GraphNode, type StoryGraph } from "@swarmtales/viewer-core";
import { execute } from "../../apps/cli/src/swt/commands.ts";
import { readStoryFile } from "../../apps/cli/src/swt/story-file.ts";
import { coreStories, STORIES } from "../../stories/index.ts";
import { fsRunSource } from "../helpers/fs-run-source.ts";

const ROOT = resolve(import.meta.dirname, "..", "..");

async function showJson(name: string): Promise<unknown> {
	const out: string[] = [];
	const code = await execute(["story", "show", name, "--json"], { out: (text) => void out.push(text), err: () => undefined });
	expect(code).toBe(0);
	return JSON.parse(out.join("\n"));
}

const plain = (value: unknown): unknown => JSON.parse(JSON.stringify(value));
const ofKind = <K extends GraphNode["kind"]>(graph: StoryGraph, kind: K) => graph.nodes.filter((node): node is Extract<GraphNode, { kind: K }> => node.kind === kind);

/** Every edge joins two nodes of the graph, and node ids are unique. */
function wellFormed(graph: StoryGraph): void {
	const ids = new Set(graph.nodes.map((node) => node.id));
	expect(ids.size).toBe(graph.nodes.length);
	for (const edge of graph.edges) expect(ids.has(edge.from) && ids.has(edge.to)).toBe(true);
	expect(graph.issues).toEqual([]);
}

describe("the story graph", () => {
	it.each(Object.entries(STORIES))("draws the level story %s: levels in order, acts, rules, endings", (name, story) => {
		const graph = storyGraph(plain(story));
		wellFormed(graph);
		expect(graph.kind).toBe("levels");
		expect(ofKind(graph, "level").map((node) => node.level)).toEqual(story.levels.map((level) => level.number));
		expect(ofKind(graph, "rule")).toHaveLength(story.director.length);
		expect(ofKind(graph, "act")).toHaveLength(story.acts?.length ?? 0);
		expect(graph.edges.filter((edge) => edge.kind === "sequence")).toHaveLength(story.levels.length + 1);
		expect(graph.nodes.map((node) => node.id)).toEqual(expect.arrayContaining(["start", "end:finished", "end:run"]));
	});

	it.each(Object.keys(coreStories))("draws the core story %s: mechanics in load order", (name) => {
		const entry = coreStories[name];
		if (entry === undefined) throw new Error(name);
		const data = plain(storyData(entry.story));
		const graph = storyGraph(data);
		wellFormed(graph);
		expect(graph.kind).toBe("mechanics");
		expect(ofKind(graph, "mechanic").map((node) => node.mechanic)).toEqual(storyData(entry.story).mechanics.map((mechanic) => mechanic.id));
	});

	it("reads what `swt story show <name> --json` writes, for a level story and a core story", async () => {
		const city = storyGraph(await showJson("cityofkeys"));
		expect(city).toEqual(storyGraph(plain(STORIES.cityofkeys)));
		expect(ofKind(city, "rule").length).toBeGreaterThan(10);
		const chess = storyGraph(await showJson("chess"));
		expect(chess.kind).toBe("mechanics");
		expect(ofKind(chess, "mechanic").map((node) => node.mechanic)).toContain("chess");
	});

	it("draws the YAML example with its petition branches and lottery", () => {
		const parsed = readStoryFile(join(ROOT, "test", "fixtures", "stories", "lantern-row.story.yaml"));
		const graph = storyGraph(plain(parsed.story));
		wellFormed(graph);
		expect(graph.kind).toBe("levels");
		expect(ofKind(graph, "level").length).toBeGreaterThan(0);
	});

	it("branches a petition into passed and failed, each with its actions, and a lottery into its draws", () => {
		const story = {
			id: "branches",
			levels: [{ number: 1, title: "One", reward: 5 }, { number: 2, title: "Two", reward: 10 }],
			cast: { HERALD: { level: 2 } },
			director: [
				{ id: "vote", trigger: { kind: "at", minute: 5 }, when: [], actions: [{ kind: "openPetition", petition: { id: "p1", text: "?", onPass: [{ kind: "grant" }], onFail: [{ kind: "fine" }, { kind: "post" }] } }] },
				{ id: "after", trigger: { kind: "onPetitionResolved", petition: "p1", outcome: "passed" }, when: [{ kind: "castActive", cast: "HERALD" }], actions: [{ kind: "collectDms", cast: "HERALD", into: "pot" }] },
				{ id: "draw", trigger: { kind: "onCollectionEnd", into: "pot" }, when: [], actions: [{ kind: "lottery", into: "pot", then: [{ kind: "grant" }] }] },
				{ id: "odd", trigger: { kind: 3 }, when: [], actions: [] },
			],
		};
		const graph = storyGraph(story);
		const edge = (from: string, to: string) => graph.edges.find((candidate) => candidate.from === from && candidate.to === to);
		expect(edge("trigger:vote", "rule:vote")).toMatchObject({ kind: "trigger" });
		expect(edge("petition:p1", "petition:p1:passed")).toMatchObject({ kind: "branch", label: "passed" });
		expect(edge("petition:p1", "petition:p1:failed")).toMatchObject({ kind: "branch", label: "failed" });
		expect(graph.edges.filter((candidate) => candidate.from === "petition:p1:failed" && candidate.kind === "action")).toHaveLength(2);
		expect(edge("petition:p1:passed", "rule:after")).toMatchObject({ kind: "trigger" });
		expect(edge("cast:HERALD", "rule:after")).toMatchObject({ kind: "condition" });
		expect(edge("cast:HERALD", "level:2")).toMatchObject({ kind: "cast" });
		expect(edge("action:after:a.0", "collection:pot")).toMatchObject({ kind: "collection" });
		expect(edge("collection:pot", "rule:draw")).toMatchObject({ kind: "trigger" });
		expect(graph.edges.find((candidate) => candidate.from === "action:draw:a.0" && candidate.kind === "branch")).toMatchObject({ label: "drawn" });
		expect(graph.issues).toEqual(["odd: a trigger that does not fit"]);
		expect(storyGraph({ nothing: true })).toMatchObject({ kind: "unknown", nodes: [] });
	});
});

describe("the run overlay", () => {
	it("marks the levels, acts, rules and endings a recorded 12-agent run reached", async () => {
		const run = await loadRun(fsRunSource(ROOT), "stories/cityofkeys/runs/act2-12a-003-f10g10-director/run");
		const graph = storyGraph(run.meta);
		expect(graph.kind).toBe("levels");
		const overlay = runOverlay(graph, run);
		const levels = ofKind(graph, "level").map((node) => overlay.visits.get(node.id));
		expect(levels.every((visit) => visit !== undefined)).toBe(true);
		// Levels are reached in order.
		const seqs = levels.map((visit) => visit?.seq ?? 0);
		expect(seqs).toEqual([...seqs].sort((left, right) => left - right));
		expect(overlay.visits.get("level:2")).toMatchObject({ seq: 59, minute: 0, count: 12 });
		expect(overlay.visits.get("act:1")).toEqual(overlay.visits.get("level:8"));
		expect(overlay.visits.get("end:run")).toMatchObject({ count: 1 });
		expect(overlay.visits.get("end:finished")?.count).toBeGreaterThan(0);
		expect(overlay.visits.get("rule:courier-2")).toMatchObject({ seq: 60, count: 1 });
		expect(overlay.edges.size).toBeGreaterThan(20);
		expect(overlay.skipped.size).toBeGreaterThan(0);
	});

	it("marks a core story's start and end", async () => {
		const run = await loadRun(fsRunSource(ROOT), "stories/chess/runs/chess-02a-003-moves-s29/run");
		const overlay = runOverlay(storyGraph(await showJson("chess")), run);
		expect(overlay.visits.get("start")).toMatchObject({ seq: 1 });
		expect(overlay.visits.get("end:run")).toMatchObject({ seq: 1403 });
	});
});
