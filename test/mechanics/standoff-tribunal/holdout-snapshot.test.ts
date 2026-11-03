/**
 * The holdout tribunal's snapshot slice (team T4b): the version-1 slice is the old `HoldoutSnapshot`
 * field for field (checked against what the old `HoldoutTribunal` writes at the same cut), a host
 * resumed from it or from the converter's version-0 slice continues exactly as the uninterrupted old
 * run, and `snapshot-L7` resumes with the tribunal and stand-ins for every other slice.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { convertLegacySnapshot } from "@swarmtales/chronicle";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { SHARED_EVENTS } from "@swarmtales/mechanic-shared";
import { checkOptionsDocumented, checkSourceRules, standInsFor } from "@swarmtales/testkit";
import { standoffTribunal } from "@swarmtales/mechanic-standoff-tribunal";
import { storyOptions } from "../standoff/support/host.ts";
import { holdoutStory, newRun, playNew, recordOf, runOld, type NewRun, type Scenario } from "./differential.ts";
import { banished, cityOf, lotStrikes } from "./scenarios.ts";

const L7 = resolve(import.meta.dirname, "../../../examples/cityofkeys-act1-06a-04/snapshot-L7.json");

interface Slice {
	version: number;
	data: unknown;
}

/** Plays `scenario` to `cut`, snapshots, resumes with the slice `slice` makes of it, and plays to the end on the same model. */
async function resumed(scenario: Scenario, cut: number, slice: (version1: Slice | undefined, old: unknown) => Slice) {
	const first = newRun(scenario);
	await playNew(first, scenario, cut);
	const snapshot = first.host.snapshot();
	const old = runOld(scenario, { until: cut }).snapshot;
	const events = first.host.log.all().map((event): unknown => JSON.parse(JSON.stringify(event)));
	const edited = { ...snapshot, mechanics: { ...snapshot.mechanics, "standoff-tribunal": slice(snapshot.mechanics["standoff-tribunal"], old) } };
	const story = holdoutStory(scenario, first.model, first.recorder);
	const host = createHost({ ...storyOptions(story), resume: { snapshot: structuredClone(edited), events } });
	const second: NewRun = { ...first, host };
	await playNew(second, scenario);
	return { snapshot, old, record: recordOf(second) };
}

describe("standoff-tribunal snapshot (stand-in puzzles, progression, exile, channels, notes)", () => {
	it.each([
		["blockers found, the grace running", lotStrikes, 6],
		["a vote open with ballots", lotStrikes, 8],
		["the lot drawn, the strike pending", lotStrikes, 14],
		["a banishment pending", banished, 9],
		["a tribunal over, the cool-down running", banished, 11],
	] as const)("saves %s as the old HoldoutSnapshot and resumes from it exactly as the old run continues", async (_name, scenario, cut) => {
		const { snapshot, old, record } = await resumed(scenario(), cut, (version1) => ({ version: 1, data: structuredClone(version1?.data) }));
		expect(old).toBeDefined();
		expect(snapshot.mechanics["standoff-tribunal"]).toEqual({ version: 1, data: { holdout: old } });
		expect(record).toEqual(runOld(scenario()).record);
	});

	it.each([
		["a vote open with ballots", lotStrikes, 8],
		["a banishment pending", banished, 9],
	] as const)("migrates the converter's version-0 slice of the old engine (%s) and continues as the old run", async (_name, scenario, cut) => {
		const { record } = await resumed(scenario(), cut, (_version1, old) => ({ version: 0, data: { holdout: old } }));
		expect(record).toEqual(runOld(scenario()).record);
	});

	it("resumes snapshot-L7 (no holdout yet) and runs a tribunal as the old one would", async () => {
		const converted = convertLegacySnapshot(JSON.parse(readFileSync(L7, "utf8")), {}, L7);
		// The old world wrote no `holdout` without a tribunal; the converter writes no slice, and the host hands the version-0 migration `{}` (R2-D2).
		expect(converted.host.mechanics["standoff-tribunal"]).toBeUndefined();
		const saved = converted.host;
		const residents = converted.host.residents.ids;
		const accused = residents.slice(0, 3);
		const scenario: Scenario = {
			residents,
			model: () => cityOf(residents),
			minutes: 30,
			steps: {
				13: [{ kind: "call", accused, reason: "Three keep their fragments." }],
				16: residents.map((agent) => ({ kind: "vote", agent, yes: true })),
				18: [{ kind: "announce", text: "The vote is in." }],
			},
		};
		const run = newRun(scenario, (ours) => {
			const loaded = ["standoff-tribunal", "probe", "puzzles", "progression", "exile", "channels", "notes"];
			const story = defineCoreStory({
				id: converted.host.story,
				seed: converted.host.seed,
				minutes: scenario.minutes,
				residents,
				mechanics: [...ours.mechanics, ...standInsFor(saved, loaded, { events: SHARED_EVENTS })],
				grants: { resident: ["tribunalVote"], gamemaker: ["callTribunal", "drawLot", "announceTribunal", "permaDeath"], script: ["probe"] },
			});
			return createHost({ ...storyOptions(ours), story, resume: { snapshot: saved, events: converted.events } });
		});
		expect(run.host.minute).toBe(9);
		await playNew(run, scenario);
		const old = runOld(scenario, { from: 9 }).record;
		const record = recordOf(run);
		expect(record.events.some((line) => line.includes("holdout_ended"))).toBe(true);
		expect(record).toEqual(old);
	});

	it("refuses a slice that names an unknown resident, with the old restore's words (holdout.ts:637-645)", async () => {
		const scenario = banished();
		const first = newRun(scenario);
		await playNew(first, scenario, 9);
		const snapshot = first.host.snapshot();
		const old = runOld(scenario, { until: 9 }).snapshot;
		const session = old.session;
		if (session === undefined) throw new Error("no session at the cut");
		const forged = { ...old, session: { ...session, voters: [...session.voters, "Z99"] } };
		const message = "The snapshot's holdout tribunal names an unknown resident Z99";
		expect(() => runOld(scenario, { restore: forged, from: 9 })).toThrow(message);
		const events = first.host.log.all().map((event): unknown => JSON.parse(JSON.stringify(event)));
		for (const slice of [
			{ version: 1, data: { holdout: forged } },
			{ version: 0, data: { holdout: forged } },
		]) {
			const edited = { ...snapshot, mechanics: { ...snapshot.mechanics, "standoff-tribunal": slice } };
			expect(() => createHost({ ...storyOptions(holdoutStory(scenario, first.model, first.recorder)), resume: { snapshot: edited, events } })).toThrow(message);
		}
		// The same file with known residents only loads.
		const plain = { ...snapshot, mechanics: { ...snapshot.mechanics, "standoff-tribunal": { version: 0, data: { holdout: old } } } };
		expect(() => createHost({ ...storyOptions(holdoutStory(scenario, first.model, first.recorder)), resume: { snapshot: plain, events } })).not.toThrow();
	});

	it("documents its options and imports only what a mechanic may", () => {
		expect(checkOptionsDocumented(standoffTribunal)).toEqual([]);
		const files = ["index.ts", "head.ts", "court.ts", "ports.ts", "tools.ts", "types.ts", "events.ts", "slice.ts", "result.ts", "template.ts"].map((name) => ({
			path: name,
			text: readFileSync(new URL(`../../../mechanics/standoff-tribunal/src/${name}`, import.meta.url), "utf8"),
		}));
		expect(checkSourceRules(files)).toEqual([]);
	});
});
