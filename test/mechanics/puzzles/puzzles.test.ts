/**
 * The golden gate of the puzzles mechanic (docs/design/carve-team-T3.md): the lines it writes on the
 * new host equal the golden lines of its event types (`ownedBy(..., ["puzzles"])`) for every golden
 * log, and the snapshot of the 6-agent base resumes with the mechanic.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { convertLegacySnapshot } from "@swarmtales/chronicle";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { puzzles } from "@swarmtales/mechanic-puzzles";
import { PuzzlesApi } from "@swarmtales/mechanic-shared";
import { compareGolden, idleAgent, ownedBy, standInsFor } from "@swarmtales/testkit";
import { collect, factorScript, goldenLog, GOLDEN_NAMES, minutesOf, puzzleOptions, RESIDENTS, SEED, storyOf } from "./harness.ts";

describe("puzzles: the golden gate", () => {
	it.each(GOLDEN_NAMES)("deals %s as the old engine did", async (name) => {
		const story = defineCoreStory({ id: name, seed: SEED, minutes: minutesOf(name), residents: [...RESIDENTS], mechanics: [puzzles.with(puzzleOptions(storyOf(name)))], grants: {} });
		const host = createHost({ story });
		const lines = collect(host);
		host.start();
		await host.run(idleAgent);
		// Every puzzles line of the golden except the factor reveals, which the script drives (next test).
		const expected = ownedBy(goldenLog(name), ["puzzles"]).filter((line) => !line.includes("factor_revealed"));
		expect(expected.length).toBeGreaterThan(0);
		expect(compareGolden(expected, lines.owned("puzzles"))).toBeUndefined();
	});

	it("releases the city factor on the board at the golden minutes (script is a stand-in)", async () => {
		const name = "cityofkeys-f4g4";
		const mechanics = [puzzles.with(puzzleOptions(storyOf(name))), factorScript([]).with()];
		const story = defineCoreStory({ id: name, seed: SEED, minutes: 12, residents: [...RESIDENTS], mechanics, grants: { script: ["revealFactor"] } });
		const host = createHost({ story });
		const lines = collect(host);
		host.start();
		for (let minute = 0; minute < 9; minute++) {
			if (minute === 7) expect(await host.call("script", "revealFactor", { level: 8, target: "board" })).toMatchObject({ ok: true });
			if (minute === 8) expect(await host.call("script", "revealFactor", { level: 9, target: "board" })).toMatchObject({ ok: true });
			await host.playMinute(idleAgent);
		}
		const revealed = ownedBy(goldenLog(name), ["puzzles"]).filter((line) => line.includes("factor_revealed"));
		expect(revealed).toHaveLength(2);
		expect(lines.owned("puzzles").filter((line) => line.includes("factor_revealed"))).toEqual(revealed);
		expect(await host.call("script", "revealFactor", { level: 1, target: "board" })).toMatchObject({ ok: false, code: "NOT_ADDITIVE" });
		expect(await host.call("script", "revealFactor", { level: 40, target: "board" })).toMatchObject({ ok: false, code: "NOT_PLAYED" });
	});

	it("answers its API from the deal", () => {
		const story = defineCoreStory({ id: "cityofkeys", seed: SEED, minutes: 3, residents: [...RESIDENTS], mechanics: [puzzles.with(puzzleOptions(storyOf("cityofkeys-f4g4")))], grants: {} });
		const host = createHost({ story });
		host.start();
		expect(host.facts()["puzzles.dealt"]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
		expect(PuzzlesApi.methods.solutionOf.kind).toBe("query");
	});
});

describe("puzzles: the snapshot", () => {
	const path = resolve(import.meta.dirname, "../../../examples/cityofkeys-act1-06a-04/snapshot-L7.json");
	const converted = convertLegacySnapshot(JSON.parse(readFileSync(path, "utf8")), {}, path);

	it("resumes snapshot-L7 with the mechanic and writes the same slice back", () => {
		const story = defineCoreStory({
			id: "nexus",
			seed: 7,
			minutes: 80,
			residents: converted.host.residents.ids,
			mechanics: [puzzles.with(puzzleOptions(storyOf("cityofkeys-f4g4"))), ...standInsFor(converted.host, ["puzzles"])],
			grants: {},
		});
		const host = createHost({ story, resume: { snapshot: converted.host, events: converted.events } });
		const slice = host.snapshot().mechanics.puzzles;
		expect(slice?.version).toBe(1);
		const old: unknown = converted.host.mechanics.puzzles?.data;
		expect(JSON.stringify(slice?.data)).toBe(JSON.stringify(old));
	});
});
