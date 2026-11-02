/**
 * `ProgressionApi.hasSolved` (step 18, A1-6): true exactly for the levels a resident solved by a
 * correct submission, which is what the old `#reachablePoints` read (`solved.includes(level)`);
 * `hasPassed` also holds beyond a level and at a shut door.
 */
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { describe, expect, it } from "vitest";
import { defineMechanic, reply } from "@swarmtales/kernel";
import { ProgressionApi } from "@swarmtales/mechanic-shared";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { convertLegacySnapshot } from "@swarmtales/chronicle";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { progression } from "@swarmtales/mechanic-progression";
import { puzzles } from "@swarmtales/mechanic-puzzles";
import { standInsFor } from "@swarmtales/testkit";
import { puzzleOptions } from "../puzzles/harness.ts";
import { GOLDEN_NAMES, goldenLog, progressionHost, progressionOptions, promptLookup, replay, SEED, standInUses, storyOf } from "./harness.ts";

const Pair = Type.Tuple([Type.Boolean(), Type.Boolean()]);

const probe = defineMechanic(
	{ id: "solvedprobe", summary: "Stand-in probe.", options: Type.Object({}), state: () => undefined, events: {}, prompts: { "gamemaker/tools/notify": [] }, requires: [ProgressionApi] },
	(kit) => ({
		tools: [
			kit.tool({
				name: "solvedAndPassed",
				description: "gamemaker/tools/notify",
				parameters: Type.Object({ resident: Type.String(), level: Type.Integer() }),
				suggest: ["script"],
				execute: (params, ctx) => reply(JSON.stringify([ctx.call(ProgressionApi, "hasSolved", params), ctx.call(ProgressionApi, "hasPassed", params)])),
			}),
		],
	}),
);

describe("ProgressionApi.hasSolved", () => {
	it.each(GOLDEN_NAMES)("is true for the levels the golden %s solved and false for the others", async (name) => {
		const host = progressionHost(name, [], [probe.with()], ["solvedAndPassed"]);
		await replay(host, name);
		const solved = new Set(goldenLog(name).flatMap((line) => (line.type === "submission" && line.outcome === "correct" ? [`${String(line.agent)}:${String(line.level)}`] : [])));
		expect(solved.size).toBeGreaterThan(0);
		for (const resident of host.residents) {
			for (let level = 1; level <= 12; level++) {
				const outcome = await host.call("script", "solvedAndPassed", { resident, level });
				if (!outcome.ok) throw new Error(outcome.code);
				const [wasSolved, wasPassed] = Parse(Pair, JSON.parse(outcome.reply));
				expect(wasSolved, `${resident} level ${String(level)}`).toBe(solved.has(`${resident}:${String(level)}`));
				// Solved implies passed; the golden has no pass without a solve.
				if (wasSolved) expect(wasPassed).toBe(true);
			}
		}
	}, 60_000);
});

describe("ProgressionApi.hasSolved apart from hasPassed", () => {
	const path = resolve(import.meta.dirname, "../../../examples/cityofkeys-act1-06a-04/snapshot-L7.json");

	it("is false for a level a resident is beyond without a solve of its own, where hasPassed is true", async () => {
		const converted = convertLegacySnapshot(JSON.parse(readFileSync(path, "utf8")), {}, path);
		const slice = converted.host.mechanics.progression;
		const data = typeof slice?.data === "object" && slice.data !== null ? Object.fromEntries(Object.entries(slice.data)) : {};
		const competitors = Array.isArray(data.competitors) ? data.competitors : [];
		// A01 is at level 7 with 1..6 solved; take its solve of level 3 away (a carried team level).
		const edited = competitors.map((entry: unknown, index: number) => {
			const record = typeof entry === "object" && entry !== null ? Object.fromEntries(Object.entries(entry)) : {};
			return index === 0 ? { ...record, solved: (Array.isArray(record.solved) ? record.solved : []).filter((level: unknown) => level !== 3) } : entry;
		});
		const host = createHost({
			story: defineCoreStory({
				id: "nexus",
				seed: SEED,
				minutes: 80,
				residents: converted.host.residents.ids,
				mechanics: [
					...standInUses(goldenLog("cityofkeys-f4g4"), []),
					puzzles.with(puzzleOptions(storyOf("cityofkeys-f4g4"))),
					progression.with(progressionOptions(storyOf("cityofkeys-f4g4"))),
					probe.with(),
					...standInsFor(converted.host, ["ledger", "channels", "receipts", "puzzles", "progression"]),
				],
				grants: { script: ["solvedAndPassed"] },
			}),
			prompts: promptLookup(),
			resume: { snapshot: { ...converted.host, mechanics: { ...converted.host.mechanics, progression: { ...slice, data: { ...data, competitors: edited } } } }, events: converted.events },
		});
		const ask = async (level: number): Promise<readonly [boolean, boolean]> => {
			const outcome = await host.call("script", "solvedAndPassed", { resident: "A01", level });
			if (!outcome.ok) throw new Error(outcome.code);
			return Parse(Pair, JSON.parse(outcome.reply));
		};
		expect(await ask(3)).toEqual([false, true]);
		expect(await ask(2)).toEqual([true, true]);
		// Level 7 is solved and waits at its door; level 8 is not reached.
		expect(await ask(7)).toEqual([true, true]);
		expect(await ask(8)).toEqual([false, false]);
	});
});
