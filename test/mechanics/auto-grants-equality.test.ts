/**
 * `grants: "auto"` against today's explicit lists (docs/design/grants-auto.md). Two baselines:
 *
 * 1. The resident list the old engine offers a story: `storyToolNames(story)` (every tool but those
 *    only a story feature grants), restricted to the tools whose mechanic the golden city loads
 *    (the exile, tribunal and standoff tools are not part of it; the seal's `bid` and `permaDeath`
 *    only for a story with a seal, `chooseName` only for a run that names its residents). The derived list must be
 *    exactly this set (R2-D7 uses the same list).
 * 2. The grants of the golden replay of the arena (test/mechanics/arena/golden-host.ts): the host is built once
 *    with them and once with `grants: "auto"`; the gamemaker, the script and the human offer the same
 *    tools, and every tool a golden run ever offered is granted to residents.
 *
 * Tool lists are compared as sets: the old engine orders tools by its catalog, whatever order the story grants them in.
 */
import { storyToolNames } from "../helpers/old-catalog.ts";
import { createHost } from "@swarmtales/kernel";
import { describe, expect, it } from "vitest";
import { arenaStoryOf, offeredTools } from "./arena/golden-host.ts";
import { storyOf, type GoldenName } from "./puzzles/harness.ts";

const NAMES: readonly GoldenName[] = ["cityofkeys-f4g4", "cityofkeys-f10g10", "whispers-f10-grudge"];
const ROLES = ["resident", "gamemaker", "script", "human"] as const;

/** Old-engine tools whose mechanic the golden city does not load (exile, tribunal, standoff). */
const NOT_LOADED: ReadonlySet<string> = new Set(["vote", "nominate", "join", "refuse", "payRansom", "lastWill", "claimPiece", "tribunalVote"]);
/** The seal's tools, loaded for a story with a seal only. */
const SEAL_TOOLS: ReadonlySet<string> = new Set(["bid", "permaDeath"]);

const namesOf = (name: GoldenName, mode: "explicit" | "auto", role: string): readonly string[] =>
	createHost({ story: arenaStoryOf(name, mode).definition })
		.toolSpecs(role)
		.map((spec) => spec.name);

const sorted = (tools: readonly string[]): readonly string[] => [...tools].sort();

/** Baseline 1. */
function oldEngineList(name: GoldenName): readonly string[] {
	const story = storyOf(name);
	const { plan } = arenaStoryOf(name, "explicit");
	return storyToolNames(story).filter((tool) => !NOT_LOADED.has(tool) && (story.seal !== undefined || !SEAL_TOOLS.has(tool)) && (plan.namesChosen || tool !== "chooseName"));
}

describe("grants: auto equals the explicit lists of the golden stories", () => {
	describe.each(NAMES)("%s", (name) => {
		it("grants residents exactly the tools the old engine offers the story", () => {
			expect(sorted(namesOf(name, "auto", "resident"))).toEqual(sorted(oldEngineList(name)));
		});

		it("grants residents every tool the golden run offered", () => {
			expect(namesOf(name, "auto", "resident")).toEqual(expect.arrayContaining([...offeredTools(arenaStoryOf(name, "explicit").golden)]));
		});

		it.each(ROLES.filter((role) => role !== "resident"))("grants %s the same tools as the golden replay", (role) => {
			expect(sorted(namesOf(name, "auto", role))).toEqual(sorted(namesOf(name, "explicit", role)));
		});

		it("derives a non-empty resident, gamemaker and script list", () => {
			for (const role of ["resident", "gamemaker", "script"]) expect(namesOf(name, "auto", role).length).toBeGreaterThan(0);
		});
	});

	it("grants the gamemaker the board and the notification, the script its two calls, in both stories", () => {
		for (const name of NAMES) {
			expect(sorted(namesOf(name, "auto", "gamemaker"))).toEqual(["notify", "postBoard"]);
			expect(sorted(namesOf(name, "auto", "script"))).toEqual(["directorMinute", "resolvePetition"]);
		}
	});

	it("grants the whisperer's tools only in the Whispers story, and the seal's only in the City of Keys", () => {
		expect(namesOf("whispers-f10-grudge", "auto", "resident")).toEqual(expect.arrayContaining(["forgeReceipt", "nameFavourite"]));
		expect(namesOf("cityofkeys-f4g4", "auto", "resident")).not.toContain("forgeReceipt");
		expect(namesOf("cityofkeys-f4g4", "auto", "resident")).toEqual(expect.arrayContaining(["bid", "permaDeath"]));
		expect(namesOf("whispers-f10-grudge", "auto", "resident")).not.toContain("permaDeath");
	});
});
