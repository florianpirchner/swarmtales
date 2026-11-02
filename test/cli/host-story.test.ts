/**
 * The story option mapping for the new host (apps/cli/src/host/story.ts, R2-D17, step 18): every
 * registered story loads on the host with every real mechanic, the derived grants (`grants: "auto"`
 * plus the dials' `grantTweaks`) equal the old engine's lists, and the dials map as the old composer
 * mapped them (defiance, the whisperer's defy, ultimatum, `--no-guards`, names off, the holdout
 * tribunal only with a gamemaker).
 */
import { describe, expect, it } from "vitest";
import type { AnyStory, MechanicUse } from "@swarmtales/contracts";
import { storyToolNames } from "../helpers/old-catalog.ts";
import { createHost } from "@swarmtales/kernel";
import { STORIES } from "../../stories/index.ts";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import whispers from "../../stories/whispers/story.ts";
import { defianceOf, guardPolicies, hostStoryOf, mechanicsOf, minRunOf, type HostRun } from "../../apps/cli/src/host/story.ts";

const RESIDENTS = ["A01", "A02", "A03", "A04", "A05", "A06"];

function runOf(overrides: Partial<HostRun> = {}): HostRun {
	return {
		residents: RESIDENTS,
		seed: 7,
		minutes: 12,
		arena: { startLevel: 1, activation: "always", passesPerMinute: 1, blockSize: 1, stopWhenDone: false, stopWhenSeatsDecided: false },
		names: true,
		coreMotives: true,
		whisperer: true,
		guards: true,
		gamemaker: true,
		figureDirection: 4,
		gmDirection: 4,
		...overrides,
	};
}

const toolsOf = (story: AnyStory, run: HostRun, role: string): readonly string[] =>
	createHost({ story: hostStoryOf(story, run).definition })
		.toolSpecs(role)
		.map((spec) => spec.name);

const sorted = (tools: readonly string[]): readonly string[] => [...tools].sort();
const ids = (uses: readonly MechanicUse[]): readonly string[] => uses.map((use) => use.mechanic.id);

describe("the host story of every registered story", () => {
	it.each(Object.keys(STORIES))("%s loads with every real mechanic", (name) => {
		const story = STORIES[name];
		if (story === undefined) throw new Error(name);
		const host = createHost({ story: hostStoryOf(story, runOf()).definition });
		expect(host.mechanics).toEqual(expect.arrayContaining(["ledger", "channels", "progression", "puzzles", "script", "arena", "exile", "standoff", "names"]));
	});

	it.each(Object.keys(STORIES))("%s grants residents exactly the old engine's tools", (name) => {
		const story = STORIES[name];
		if (story === undefined) throw new Error(name);
		// The old engine bound the seal's tools in every story (the gateway kept them locked); the host loads the seal only with a seal and a tribunal.
		// The same for the tribunal's tools in a story without a tribunal (the old tools answered NO_TRIBUNAL, never open,
		// so no request line and no tools notice listed them).
		const absent = [...(story.seal === undefined || story.tribunal === undefined ? ["bid", "permaDeath"] : []), ...(story.tribunal === undefined ? ["vote", "nominate", "join", "refuse"] : [])];
		const old = storyToolNames(story).filter((tool) => !absent.includes(tool) && (story.names !== undefined || tool !== "chooseName"));
		expect(sorted(toolsOf(story, runOf(), "resident"))).toEqual(sorted(old));
	});
});

describe("the dials", () => {
	it("grant the gamemaker ultimatum only at direction 10 in a story with ultimatums", () => {
		expect(cityOfKeys.rules.ultimatum).toBeDefined();
		expect(toolsOf(cityOfKeys, runOf({ gmDirection: 4 }), "gamemaker")).not.toContain("ultimatum");
		expect(toolsOf(cityOfKeys, runOf({ gmDirection: 10 }), "gamemaker")).toContain("ultimatum");
		expect(toolsOf(cityOfKeys, runOf({ gmDirection: 10 }), "gamemaker")).toEqual(expect.arrayContaining(["notify", "postBoard"]));
	});

	it("give the script its minute call and the petitions' resolution", () => {
		expect(sorted(toolsOf(cityOfKeys, runOf(), "script"))).toEqual(["directorMinute", "resolvePetition"]);
		expect(sorted(toolsOf(whispers, runOf({ minutes: 20 }), "script"))).toEqual(["directorMinute", "resolvePetition"]);
	});

	it("let everybody defy at gm direction 10, the directed whisperer alone at figure direction 10 with a playing gamemaker", () => {
		expect(defianceOf(cityOfKeys, { gamemaker: true, gmDirection: 10, figureDirection: 4 })).toEqual({ defiance: true, whispererDefies: false });
		expect(defianceOf(cityOfKeys, { gamemaker: true, gmDirection: 9, figureDirection: 10 })).toEqual({ defiance: false, whispererDefies: false });
		expect(defianceOf(whispers, { gamemaker: true, gmDirection: 4, figureDirection: 10 })).toEqual({ defiance: false, whispererDefies: whispers.whisperer?.direction !== undefined && whispers.gamemaker !== undefined });
		expect(defianceOf(whispers, { gamemaker: false, gmDirection: 4, figureDirection: 10 }).whispererDefies).toBe(false);
	});

	it("drop the guards and receipts.minRun together with --no-guards", () => {
		const guarded = STORIES[Object.keys(STORIES).find((name) => STORIES[name]?.guards?.rules.some((rule) => rule.secrets !== undefined) === true) ?? ""];
		if (guarded === undefined) return;
		expect(minRunOf(guarded, true)).toBeGreaterThan(0);
		expect(Object.keys(guardPolicies(guarded, true)).length).toBeGreaterThan(0);
		expect(minRunOf(guarded, false)).toBeUndefined();
		expect(guardPolicies(guarded, false)).toEqual({});
		const receipts = (guards: boolean) => mechanicsOf(guarded, runOf({ guards })).find((use) => use.mechanic.id === "receipts")?.options;
		expect(receipts(true)).toMatchObject({ minRun: minRunOf(guarded, true) });
		expect(receipts(false)).not.toHaveProperty("minRun");
	});

	it("switch the names book off for a run without names, and keep chooseName granted (locked) as the old engine bound it (R1-1)", () => {
		const off = mechanicsOf(cityOfKeys, runOf({ names: false })).find((use) => use.mechanic.id === "names")?.options;
		expect(off).toMatchObject({ off: true });
		expect(toolsOf(cityOfKeys, runOf({ names: false }), "resident")).toContain("chooseName");
		expect(toolsOf(cityOfKeys, runOf(), "resident")).toContain("chooseName");
		// A story without names never grants it.
		const nameless = { ...cityOfKeys };
		delete nameless.names;
		expect(toolsOf(nameless, runOf({ names: false }), "resident")).not.toContain("chooseName");
	});

	it("load the holdout tribunal only with a playing gamemaker, the core motives only when they are on", () => {
		const story = Object.values(STORIES).find((candidate) => candidate.holdout !== undefined);
		if (story !== undefined) {
			expect(ids(mechanicsOf(story, runOf()))).toContain("standoff-tribunal");
			expect(ids(mechanicsOf(story, runOf({ gamemaker: false })))).not.toContain("standoff-tribunal");
		}
		expect(ids(mechanicsOf(cityOfKeys, runOf()))).toContain("motives");
		expect(ids(mechanicsOf(cityOfKeys, runOf({ coreMotives: false })))).not.toContain("motives");
	});

	it("play the whisperer's control run with whispers loaded and the whisperer off", () => {
		expect(mechanicsOf(whispers, runOf({ whisperer: false })).find((use) => use.mechanic.id === "whispers")?.options).toMatchObject({ control: true });
	});
});
