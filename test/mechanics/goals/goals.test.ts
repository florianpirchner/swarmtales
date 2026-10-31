/**
 * The golden gate of the goals mechanic (docs/design/carve-team-T3.md): the golden log's progression
 * calls replayed on the new host (puzzles and progression are real; ledger, channels, receipts and
 * the cores are stand-ins) make the goals write the lines of their event types
 * (`ownedBy(..., ["goals"])`): the deal when the first resident enters the act, the resolution when
 * the run ends. A resident's exile (void goal) and the snapshot resume are tested apart.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { convertLegacySnapshot, legacySink } from "@swarmtales/chronicle";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { goals } from "@swarmtales/mechanic-goals";
import { progression } from "@swarmtales/mechanic-progression";
import { puzzles } from "@swarmtales/mechanic-puzzles";
import { compareGolden, ownedBy, standInsFor, type LegacyLine } from "@swarmtales/testkit";
import { puzzleOptions } from "../puzzles/harness.ts";
import { GOLDEN_NAMES, goldenLog, progressionHost, progressionOptions, promptLookup, replay, SEED, standInUses, storyOf, type GoldenName } from "../progression/harness.ts";
import { coresStandIn, exileStandIn } from "./standins.ts";

type GoalsInput = NonNullable<Parameters<typeof goals.with>[0]>;

/** The options a story gives the goals mechanic; undefined when the story deals none. */
function goalsOptions(name: GoldenName): GoalsInput | undefined {
	const spec = storyOf(name).goals;
	if (spec === undefined) return undefined;
	return {
		acts: [...spec.acts],
		bonus: spec.bonus,
		leadTribunals: spec.leadTribunals,
		againstCore: spec.againstCore,
		matches: Object.fromEntries(Object.entries(spec.matches).map(([kind, drives]) => [kind, [...drives]])),
		factions: storyOf(name).tribunal?.factions !== undefined,
		texts: { ...spec.texts },
	};
}

describe("goals: the golden gate (cores are a stand-in)", () => {
	it.each(GOLDEN_NAMES.filter((name) => goalsOptions(name) !== undefined))("deals and resolves the goals of %s as the old engine did", async (name) => {
		const options = goalsOptions(name);
		const host = progressionHost(name, [], [coresStandIn(goldenLog(name)).with(), goals.with(options)]);
		const records: LegacyLine[] = [];
		host.subscribe(legacySink((event) => records.push(Object.fromEntries(Object.entries(event)))));
		await replay(host, name);
		const expected = ownedBy(goldenLog(name), ["goals"]);
		expect(expected.length).toBeGreaterThan(0);
		expect(compareGolden(expected, ownedBy(records, ["goals"]))).toBeUndefined();
	}, 60_000);

	it("voids the goal of a resident who is exiled and reads it out (the exile is a stand-in)", async () => {
		const name = "cityofkeys-f4g4";
		const host = progressionHost(name, [], [coresStandIn(goldenLog(name)).with(), exileStandIn().with(), goals.with(goalsOptions(name))], ["exileOne"]);
		const records: LegacyLine[] = [];
		host.subscribe(legacySink((event) => records.push(Object.fromEntries(Object.entries(event)))));
		await replay(host, name, 9);
		expect(await host.call("script", "exileOne", { resident: "A04" })).toMatchObject({ ok: true });
		const voided = ownedBy(records, ["goals"]).filter((line) => line.includes('"void":true'));
		expect(voided).toHaveLength(1);
		expect(voided[0]).toContain('"agent":"A04"');
		expect(voided[0]).toContain('"fulfilled":false,"void":true,"bonus":0');
		await host.call("script", "exileOne", { resident: "A04" });
		expect(ownedBy(records, ["goals"]).filter((line) => line.includes('"void":true'))).toHaveLength(1);
	});
});

describe("goals: the snapshot", () => {
	const path = resolve(import.meta.dirname, "../../../examples/cityofkeys-act1-06a-04/snapshot-L7.json");
	const converted = convertLegacySnapshot(JSON.parse(readFileSync(path, "utf8")), {}, path);

	it("resumes snapshot-L7 with the mechanic and writes the same slice back", () => {
		const story = defineCoreStory({
			id: "nexus",
			seed: SEED,
			minutes: 80,
			residents: converted.host.residents.ids,
			mechanics: [
				...standInUses(goldenLog("cityofkeys-f4g4"), []),
				puzzles.with(puzzleOptions(storyOf("cityofkeys-f4g4"))),
				progression.with(progressionOptions(storyOf("cityofkeys-f4g4"))),
				goals.with(goalsOptions("cityofkeys-f4g4")),
				...standInsFor(converted.host, ["ledger", "channels", "receipts", "puzzles", "progression", "goals"]),
			],
			grants: {},
		});
		const host = createHost({ story, prompts: promptLookup(), resume: { snapshot: converted.host, events: converted.events } });
		const slice = host.snapshot().mechanics.goals;
		expect(slice?.version).toBe(1);
		const wrapped: unknown = converted.host.mechanics.goals?.data;
		const old: unknown = typeof wrapped === "object" && wrapped !== null ? Reflect.get(wrapped, "goals") : undefined;
		expect(JSON.stringify(slice?.data)).toBe(JSON.stringify(old));
	});
});
