/**
 * The Story tab's folded graph and its layout: a rule is one card with its trigger and its actions as
 * chips, the levels run down one column, rules hang in columns to the right of the level that fires
 * them, roles sit left, acts box their levels, and no two cards overlap.
 */
import { resolve } from "node:path";
import { loadRun, runOverlay, storyGraph } from "@swarmtales/viewer-core";
import { describe, expect, it } from "vitest";
import { described, foldGraph, words, type FoldedGraph } from "../../packages/viewer-ui/src/story-fold.ts";
import { layoutStory, type Box } from "../../packages/viewer-ui/src/story-layout.ts";
import { fsRunSource } from "../helpers/fs-run-source.ts";

const ROOT = resolve(import.meta.dirname, "..", "..");
const CITY = "stories/cityofkeys/runs/act2-12a-003-f10g10-director/run";

const BRANCHES = {
	id: "branches",
	levels: [{ number: 1, title: "One", reward: 5 }, { number: 2, title: "Two", reward: 10 }, { number: 3, title: "Three", reward: 20 }],
	acts: [{ title: "Act I", fromLevel: 1 }, { title: "Act II", fromLevel: 3 }],
	cast: { HERALD: { level: 2 } },
	gamemaker: { roles: [{ fromLevel: 1, role: "speaker" }] },
	director: [
		{ id: "vote", trigger: { kind: "onFirstEnter", level: 2 }, when: [], actions: [{ kind: "openPetition", petition: { id: "p1", text: "?", onPass: [{ kind: "grant" }], onFail: [{ kind: "fine" }, { kind: "post" }] } }] },
		{ id: "after", trigger: { kind: "onPetitionResolved", petition: "p1", outcome: "passed" }, when: [{ kind: "castActive", cast: "HERALD" }], actions: [{ kind: "collectDms", cast: "HERALD", into: "pot" }] },
		{ id: "draw", trigger: { kind: "onCollectionEnd", into: "pot" }, when: [], actions: [{ kind: "lottery", into: "pot", then: [{ kind: "grant" }] }] },
		{ id: "tick", trigger: { kind: "every", minutes: 5 }, when: [], actions: [{ kind: "publishStandings" }] },
	],
};

const node = (graph: FoldedGraph, id: string) => graph.nodes.find((candidate) => candidate.id === id);
const overlaps = (left: Box, right: Box): boolean => left.x < right.x + right.width && right.x < left.x + left.width && left.y < right.y + right.height && right.y < left.y + left.height;

describe("the folded story graph", () => {
	it("puts triggers and conditions into words", () => {
		expect(words("onFirstEnter")).toBe("first enter");
		expect(described("onFirstEnter level 2")).toBe("on first enter level 2");
		expect(described("every minutes 6 from 12")).toBe("every minutes 6, from 12");
		expect(described("competitorsAtLevel level 8 min 1")).toBe("competitors at level 8, min 1");
	});

	it("folds a recorded run's story into rule cards with action chips, filled by the run", async () => {
		const run = await loadRun(fsRunSource(ROOT), CITY);
		const graph = storyGraph(run.meta);
		const overlay = runOverlay(graph, run);
		const folded = foldGraph(graph, false, overlay);
		expect(folded.nodes.filter((candidate) => candidate.kind === "action" || candidate.kind === "trigger")).toEqual([]);
		expect(folded.nodes.length).toBeLessThan(graph.nodes.length / 1.8);
		expect(node(folded, "rule:feast")?.chips.map((chip) => chip.label)).toEqual(["revealCast STEWARD", "post", "collectDms STEWARD"]);
		expect(node(folded, "rule:courier-2")?.chips[0]?.visit).toMatchObject({ minute: 0 });
		expect(node(folded, "rule:city-factor-8-start")?.conditions).toEqual(["competitors at level 8, min 1"]);
		// A pure time trigger hangs off the start; a timed rule that reads a level hangs off the level.
		const timed = folded.edges.filter((edge) => edge.kind === "time").map((edge) => edge.to);
		expect(timed).toEqual(expect.arrayContaining(["rule:standings", "rule:unanswered-dm"]));
		expect(timed).not.toContain("rule:city-factor-8-start");
		expect(folded.edges.some((edge) => edge.from === edge.to)).toBe(false);
		expect(new Set(folded.edges.map((edge) => edge.id)).size).toBe(folded.edges.length);
		// With details, every action is a node again.
		expect(foldGraph(graph, true).nodes.filter((candidate) => candidate.kind === "action")).toHaveLength(39);
	});

	it("keeps petitions, outcomes and lotteries as branch nodes", () => {
		const folded = foldGraph(storyGraph(BRANCHES), false);
		expect(node(folded, "petition:p1:passed")?.chips.map((chip) => chip.label)).toEqual(["grant"]);
		expect(node(folded, "petition:p1:failed")?.chips.map((chip) => chip.label)).toEqual(["fine", "post"]);
		expect(folded.edges.filter((edge) => edge.kind === "branch").map((edge) => `${edge.to} ${edge.label ?? ""}`)).toEqual(["petition:p1:passed passed", "petition:p1:failed failed"]);
		expect(node(folded, "action:draw:a.0")).toMatchObject({ kind: "lottery", chips: [{ label: "grant" }] });
		expect(folded.edges.find((edge) => edge.from === "rule:vote" && edge.to === "petition:p1")).toMatchObject({ kind: "action" });
	});
});

describe("the story layout", () => {
	it("runs the levels down one column, hangs rules and branches to the right and roles to the left", () => {
		const layout = layoutStory(foldGraph(storyGraph(BRANCHES), false));
		expect(layout.backbone).toEqual(["start", "level:1", "level:2", "level:3", "end:finished", "end:run"]);
		const column = (id: string) => layout.column.get(id);
		expect([column("role:0"), column("cast:HERALD"), column("rule:vote"), column("petition:p1"), column("petition:p1:passed"), column("rule:after"), column("collection:pot"), column("rule:draw"), column("action:draw:a.0")]).toEqual([-1, -1, 1, 2, 3, 4, 5, 6, 7]);
		expect(column("rule:tick")).toBe(1);
		const box = (id: string) => layout.boxes.get(id) ?? { x: 0, y: 0, width: 0, height: 0 };
		// The backbone is one straight column, top to bottom.
		const centres = layout.backbone.map((id) => box(id).x + box(id).width / 2);
		expect(new Set(centres).size).toBe(1);
		const tops = layout.backbone.map((id) => box(id).y);
		expect(tops).toEqual([...tops].sort((left, right) => left - right));
		// A rule shares the band of the level that fires it.
		expect(box("rule:vote").y).toBe(box("level:2").y);
		expect(box("role:0").x + box("role:0").width).toBeLessThan(box("level:1").x);
		// Each act boxes exactly its levels.
		expect(layout.acts.map((act) => act.label)).toEqual(["Act I", "Act II"]);
		const [first, second] = layout.acts;
		expect(first !== undefined && box("level:2").y + box("level:2").height <= first.y + first.height && box("level:1").y >= first.y).toBe(true);
		expect(second !== undefined && box("level:3").y >= second.y && box("level:2").y < second.y).toBe(true);
	});

	it("lays out a recorded run's story without two cards on top of each other", async () => {
		const run = await loadRun(fsRunSource(ROOT), CITY);
		for (const details of [false, true]) {
			const layout = layoutStory(foldGraph(storyGraph(run.meta), details));
			const boxes = [...layout.boxes.values()];
			const clashes = boxes.flatMap((left, index) => boxes.slice(index + 1).filter((right) => overlaps(left, right)));
			expect(clashes).toEqual([]);
			expect(layout.backbone).toHaveLength(13);
			expect(layout.column.get("collection:feast")).toBe(details ? 3 : 2);
			expect(layout.column.get("rule:feast-seat")).toBe(details ? 4 : 3);
		}
	});
});
