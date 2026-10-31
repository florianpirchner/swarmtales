/**
 * The golden gate of the progression mechanic (docs/design/carve-team-T3.md): the golden log's
 * progression calls replayed on the new host (ledger, channels and receipts are stand-ins) write the
 * lines of progression's event types (`ownedBy(..., ["progression"])`), and the replies equal the
 * old replies. The snapshot of the 6-agent base resumes with the mechanic.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { convertLegacySnapshot, legacySink } from "@swarmtales/chronicle";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { progression } from "@swarmtales/mechanic-progression";
import { puzzles } from "@swarmtales/mechanic-puzzles";
import { compareGolden, idleAgent, ownedBy, standInsFor, type LegacyLine } from "@swarmtales/testkit";
import { puzzleOptions } from "../puzzles/harness.ts";
import { GOLDEN_NAMES, goldenLog, progressionCalls, progressionHost, progressionOptions, promptLookup, replay, SEED, standInUses, storyOf } from "./harness.ts";

describe("progression: the golden gate (ledger, channels and receipts are stand-ins)", () => {
	it.each(GOLDEN_NAMES)("replays the progression calls of %s with the old lines and replies", async (name) => {
		const host = progressionHost(name, []);
		const records: LegacyLine[] = [];
		host.subscribe(legacySink((event) => records.push(Object.fromEntries(Object.entries(event)))));
		const outcomes = await replay(host, name);
		const expected = ownedBy(goldenLog(name), ["progression"]);
		expect(expected.length).toBeGreaterThan(0);
		expect(compareGolden(expected, ownedBy(records, ["progression"]))).toBeUndefined();
		const calls = progressionCalls(name);
		expect(outcomes).toHaveLength(calls.length);
		expect(outcomes.map((outcome) => outcome.text)).toEqual(calls.map((call) => call.text));
	}, 60_000);

	it("answers getProblem as the old tool did (a closed door shows no task)", async () => {
		const host = progressionHost("whispers-f10-grudge", []);
		const reply = await host.call("resident:A01", "getProblem", { level: 3 });
		expect(reply).toMatchObject({ ok: false, code: "LEVEL_NOT_REACHED" });
		expect(await host.call("resident:A01", "getProblem", { level: 99 })).toMatchObject({ ok: false, code: "UNKNOWN_LEVEL" });
		const first = await host.call("resident:A01", "getProblem", { level: 1 });
		expect(first.ok).toBe(true);
		const wrong = await host.call("resident:A01", "submitSolution", { level: 1, code: "x" });
		expect(wrong).toMatchObject({ ok: false, code: "INVALID_FORMAT" });
	});
});

describe("progression: the snapshot", () => {
	const path = resolve(import.meta.dirname, "../../../examples/cityofkeys-act1-06a-04/snapshot-L7.json");
	const converted = convertLegacySnapshot(JSON.parse(readFileSync(path, "utf8")), {}, path);

	it("resumes snapshot-L7 with the mechanic and keeps the levels", async () => {
		const story = defineCoreStory({
			id: "nexus",
			seed: SEED,
			minutes: 80,
			residents: converted.host.residents.ids,
			mechanics: [
				...standInUses(goldenLog("cityofkeys-f4g4"), []),
				puzzles.with(puzzleOptions(storyOf("cityofkeys-f4g4"))),
				progression.with(progressionOptions(storyOf("cityofkeys-f4g4"))),
				...standInsFor(converted.host, ["ledger", "channels", "receipts", "puzzles", "progression"]),
			],
			grants: {},
		});
		const host = createHost({ story, prompts: promptLookup(), resume: { snapshot: converted.host, events: converted.events } });
		const slice = host.snapshot().mechanics.progression;
		expect(slice?.version).toBe(1);
		const old: unknown = converted.host.mechanics.progression?.data;
		expect(JSON.stringify(old).length).toBeGreaterThan(10);
		const data: unknown = slice?.data;
		// Every field the legacy slice carries comes back unchanged (the competitors, the delivered list, the door, the locks).
		for (const key of Object.keys(typeof old === "object" && old !== null ? old : {})) {
			const was: unknown = typeof old === "object" && old !== null ? Reflect.get(old, key) : undefined;
			const now: unknown = typeof data === "object" && data !== null ? Reflect.get(data, key) : undefined;
			if (was !== undefined) expect(JSON.stringify(now), `field ${key}`).toBe(JSON.stringify(was));
		}
		expect(Object.keys(typeof data === "object" && data !== null ? data : {}).length).toBeGreaterThan(1);
		await host.playMinute(idleAgent);
		expect(host.facts()["progression.levels"]).toBeDefined();
	});
});
