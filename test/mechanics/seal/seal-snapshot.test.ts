/**
 * The seal's snapshot slice (team T4b): the version-1 slice is the old `SealSnapshot` field for
 * field (checked against what the old `SealHouse` writes at the same cut), a host resumed from it
 * or from the converter's version-0 slice continues exactly as the uninterrupted old run, and
 * `snapshot-L7` resumes with the seal and stand-ins for every other slice.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { convertLegacySnapshot } from "@swarmtales/chronicle";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { SHARED_EVENTS } from "@swarmtales/mechanic-shared";
import { checkOptionsDocumented, checkSourceRules, standInsFor } from "@swarmtales/testkit";
import { seal } from "@swarmtales/mechanic-seal";
import { storyOptions, startHost } from "../standoff/support/host.ts";
import { playNew, recordOf, runOld, sealStory, worldFor, type NewRun, type Scenario } from "./differential.ts";
import { endedEveryWay, wonAndUsed } from "./scenarios.ts";

const L7 = resolve(import.meta.dirname, "../../../examples/cityofkeys-act1-06a-04/snapshot-L7.json");

/** Plays `scenario` to `cut`, snapshots, resumes with the slice `slice` makes of the snapshot, and plays to the end. */
async function resumed(scenario: Scenario, cut: number, slice: (version1: { readonly version: number; readonly data: unknown } | undefined, old: unknown) => { version: number; data: unknown }) {
	const world = worldFor(scenario);
	const story = sealStory(scenario, world);
	const first: NewRun = { host: startHost(story), world, replies: [], status: [] };
	await playNew(first, scenario, cut);
	const snapshot = first.host.snapshot();
	const old = runOld(scenario, { until: cut }).snapshot;
	const events = first.host.log.all().map((event): unknown => JSON.parse(JSON.stringify(event)));
	const edited = { ...snapshot, mechanics: { ...snapshot.mechanics, seal: slice(snapshot.mechanics.seal, old) } };
	const host = createHost({ ...storyOptions(story), resume: { snapshot: structuredClone(edited), events } });
	const second: NewRun = { host, world, replies: [...first.replies], status: [...first.status] };
	await playNew(second, scenario);
	return { snapshot, old, record: recordOf(second) };
}

describe("seal snapshot (stand-in exile, tribunal, progression, ledger, channels)", () => {
	it.each([
		["an auction open with bids", wonAndUsed, 3],
		["a seal borne and the next auction open", wonAndUsed, 6],
		["a seal borne by a resident about to be exiled", endedEveryWay, 3],
	] as const)("saves %s as the old SealSnapshot and resumes from it exactly as the old run continues", async (_name, scenario, cut) => {
		const { snapshot, old, record } = await resumed(scenario(), cut, (version1) => ({ version: 1, data: structuredClone(version1?.data) }));
		expect(snapshot.mechanics.seal).toEqual({ version: 1, data: { seal: old } });
		expect(record).toEqual(runOld(scenario()).record);
	});

	it.each([
		["an auction open with bids", wonAndUsed, 3],
		["a seal borne and the next auction open", wonAndUsed, 6],
	] as const)("migrates the converter's version-0 slice of the old engine (%s) and continues as the old run", async (_name, scenario, cut) => {
		const { record } = await resumed(scenario(), cut, (_version1, old) => ({ version: 0, data: { seal: old } }));
		expect(record).toEqual(runOld(scenario()).record);
	});

	it("resumes snapshot-L7 (no seal begun yet) and runs Act II's auction as the old seal would", async () => {
		const converted = convertLegacySnapshot(JSON.parse(readFileSync(L7, "utf8")), {}, L7);
		// The old world wrote no `seal` before the act began; the converter writes no slice, and the host hands the version-0 migration `{}` (R2-D2).
		expect(converted.host.mechanics.seal).toBeUndefined();
		const host = converted.host;
		const scenario: Scenario = {
			residents: converted.host.residents.ids,
			points: Object.fromEntries(converted.host.residents.ids.map((id) => [id, 100])),
			rule: { act: 8, announceAfter: 4, bidMinutes: 3, perResidents: 12, spacing: 6 },
			minutes: 20,
			actStartAt: 10,
			missing: 3,
			steps: { 14: [{ kind: "bid", agent: "A02", points: 7 }, { kind: "bid", agent: "A05", points: 9 }], 17: [{ kind: "use", agent: "A05", target: "A02" }] },
		};
		const world = worldFor(scenario);
		const ours = sealStory(scenario, world);
		const loaded = ["seal", "probe", "exile", "tribunal", "progression", "ledger", "channels"];
		const story = defineCoreStory({
			id: converted.host.story,
			seed: converted.host.seed,
			minutes: scenario.minutes,
			residents: converted.host.residents.ids,
			mechanics: [...ours.mechanics, ...standInsFor(host, loaded, { events: SHARED_EVENTS })],
			grants: { resident: ["bid", "permaDeath"], script: ["probe"] },
		});
		const resumedHost = createHost({ ...storyOptions(ours), story, resume: { snapshot: host, events: converted.events } });
		expect(resumedHost.minute).toBe(9);
		const run: NewRun = { host: resumedHost, world, replies: [], status: [] };
		await playNew(run, scenario);
		const old = runOld(scenario, { from: 9 }).record;
		const record = recordOf(run);
		expect(record.events.length).toBeGreaterThan(3);
		expect(record).toEqual(old);
	});

	it("documents its options and imports only what a mechanic may", () => {
		expect(checkOptionsDocumented(seal)).toEqual([]);
		const files = ["index.ts", "house.ts", "events.ts", "slice.ts", "result.ts", "template.ts"].map((name) => ({
			path: name,
			text: readFileSync(new URL(`../../../mechanics/seal/src/${name}`, import.meta.url), "utf8"),
		}));
		expect(checkSourceRules(files)).toEqual([]);
	});
});
