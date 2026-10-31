/**
 * The cores mechanic on the new host, with the catalog of City of Keys. Channels (which cores
 * requires) is the real one; the ledger, marks, names, receipts and exile it needs are stand-ins
 * (test/mechanics/channels/stand-ins.ts).
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { LegacyEventAdapter, convertLegacySnapshot } from "@swarmtales/chronicle";
import type { CoresSpec, Host } from "@swarmtales/contracts";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { channels } from "@swarmtales/mechanic-channels";
import { CoreRecord, CoresOptions, coreLine, motives, renderCore } from "@swarmtales/mechanic-motives";

import { checkDeterminism, checkOptionsDocumented, checkSnapshotRoundTrip, checkSourceRules, compareGolden, goldenLine, idleAgent, ownedBy, readLegacyLog, standInsFor, type LegacyLine } from "@swarmtales/testkit";
import cityOfKeys from "../../../stories/cityofkeys/story.ts";
import whispers from "../../../stories/whispers/story.ts";
import { exileStandIn, hostFor, payloads, t2Prompts } from "../channels/harness.ts";
import { ledgerStandIn, marksStandIn, namesStandIn, receiptsStandIn } from "../channels/stand-ins.ts";

const ROOT = resolve(import.meta.dirname, "../../..");
const GOLDEN = join(ROOT, "test", "golden");

function need(spec: CoresSpec | undefined): CoresSpec {
	if (spec === undefined) throw new Error("the story has no cores");
	return spec;
}

function options(source: CoresSpec, cast?: readonly string[], withoutFigures = false): CoresOptions {
	const fields = withoutFigures ? Object.fromEntries(Object.entries(source).filter(([key]) => key !== "figures")) : source;
	return Parse(CoresOptions, { ...fields, ...(cast === undefined ? {} : { cast }) });
}

function story(spec: CoresOptions, residents = 6, minutes = 3) {
	return defineCoreStory({
		id: "t2-motives",
		seed: 7,
		minutes,
		residents,
		mechanics: [motives.with(spec), channels.with(), ledgerStandIn(10).with(), marksStandIn().with(), namesStandIn(new Map<string, string>()).with(), receiptsStandIn().with(), exileStandIn.with()],
		grants: {},
	});
}

function city(spec: CoresOptions, residents = 6): Host {
	return hostFor({ story: story(spec, residents) });
}

const CATALOG = need(cityOfKeys.cores);
const KEYS = options(CATALOG);
const LegacyCores = Type.Object({ cores: Type.Array(CoreRecord) });

describe("golden gate: cores (channels and the providers around it stand in)", () => {
	for (const [name, source] of [
		["cityofkeys-f4g4", need(cityOfKeys.cores)],
		["cityofkeys-f10g10", need(cityOfKeys.cores)],
		["whispers-f10-grudge", need(whispers.cores)],
	] as const) {
		it(`deals the cores of ${name}`, () => {
			const golden = readLegacyLog(join(GOLDEN, `${name}.events.jsonl`));
			const host = city(options(source));
			const adapter = new LegacyEventAdapter();
			const written: LegacyLine[] = host.log.all().flatMap((event) => adapter.write(event).map((entry) => Object.fromEntries(Object.entries(entry))));
			// The whisperer plays the character the story gives it; whispers is not carved yet (request 3).
			const whisperer = golden.find((line) => line.type === "whisperer_chosen")?.agent;
			const skip = (line: LegacyLine): boolean => whisperer !== undefined && line.agent === whisperer;
			const expected = ownedBy(
				golden.filter((line) => !skip(line)),
				["motives"],
			);
			const actual = ownedBy(
				written.filter((line) => !skip(line)),
				["motives"],
			);
			expect(expected).toHaveLength(whisperer === undefined ? 6 : 5);
			expect(compareGolden(expected, actual)).toBeUndefined();
		});
	}

	it("writes the events in the old key order", () => {
		const host = city(KEYS);
		const [first] = host.log.all().filter((event) => event.type === "core_dealt");
		expect(Object.keys(first?.payload ?? {})).toEqual(["agent", "bigFive", "drives", "figure"]);
		const adapter = new LegacyEventAdapter();
		const line = first === undefined ? undefined : adapter.write(first)[0];
		expect(line === undefined ? "" : goldenLine(Object.fromEntries(Object.entries(line)))).toMatch(/^\{"type":"core_dealt","agent":"A01","bigFive":\[\{"axis":/);
	});
});

describe("the deal", () => {
	const plain = options(CATALOG, undefined, true);

	it("gives every resident one core with exactly one drive above all", () => {
		const host = city(plain, 8);
		const dealt = payloads(host, "core_dealt").map((event) => Parse(CoreRecord, event));
		expect(dealt.map((core) => core.agent)).toEqual(["A01", "A02", "A03", "A04", "A05", "A06", "A07", "A08"]);
		for (const core of dealt) {
			expect(core.drives.filter((drive) => drive.intensity === "aboveAll")).toHaveLength(1);
			expect(core.drives.length).toBeGreaterThanOrEqual(plain.perResident.min);
			expect(core.drives.length).toBeLessThanOrEqual(plain.perResident.max);
			expect(core.bigFive.map((trait) => trait.axis)).toEqual(plain.axes.map((axis) => axis.id));
			expect(core.figure).toBeUndefined();
		}
		const light = dealt.filter((core) => plain.drives.find((drive) => drive.id === core.drives[0]?.drive)?.tone === "light");
		expect(light).toHaveLength(Math.min(8, Math.round(8 * plain.lightShare)));
	});

	it("deals the same cores from the same seed, and keeps them for good", async () => {
		const first = payloads(city(plain), "core_dealt");
		const host = city(plain);
		expect(payloads(host, "core_dealt")).toEqual(first);
		await host.run(idleAgent);
		expect(payloads(host, "core_dealt")).toEqual(first);
	});

	it("plays the figures a run names, one per resident, and draws for the rest", () => {
		const ids = (CATALOG.figures ?? []).map((figure) => figure.id).slice(0, 2);
		const host = city(options(CATALOG, ids), 6);
		const dealt = payloads(host, "core_dealt").map((event) => Parse(CoreRecord, event));
		expect(dealt.filter((core) => core.figure !== undefined).map((core) => core.figure).sort()).toEqual([...ids].sort());
		expect(dealt.filter((core) => core.figure === undefined)).toHaveLength(4);
	});

	it("refuses a cast that names an unknown figure, a figure twice or too many", () => {
		expect(() => city(options(CATALOG, ["nobody"]))).toThrow(/Unknown figure "nobody"/);
		const first = CATALOG.figures?.[0]?.id ?? "";
		expect(() => city(options(CATALOG, [first, first]))).toThrow(/twice/);
		expect(() => city(options(CATALOG, (CATALOG.figures ?? []).map((figure) => figure.id)), 2)).toThrow(/figures for 2 residents/);
	});

	it("renders a core as prose and in a line, and shows both as facts", () => {
		const host = city(KEYS);
		const facts = host.facts();
		const prose = facts["motives.prose"];
		const lines = facts["motives.lines"];
		expect(typeof prose === "object" && prose !== null && "A01" in prose).toBe(true);
		const [event] = payloads(host, "core_dealt").map((entry) => Parse(CoreRecord, entry));
		if (event === undefined) throw new Error("no core dealt");
		const core = { bigFive: event.bigFive, drives: event.drives, ...(event.figure === undefined ? {} : { figure: event.figure }) };
		expect(renderCore(KEYS, core).startsWith(KEYS.heading)).toBe(true);
		expect(JSON.stringify(lines)).toContain(JSON.stringify(coreLine(core)).slice(1, -1));
	});
});

describe("conformance and snapshot", () => {
	it("documents its options and keeps to the source rules", () => {
		expect(checkOptionsDocumented(motives)).toEqual([]);
		const dir = join(ROOT, "mechanics", "motives", "src");
		const files = readdirSync(dir).map((name) => ({ path: `mechanics/motives/src/${name}`, text: readFileSync(join(dir, name), "utf8") }));
		expect(checkSourceRules(files)).toEqual([]);
	});

	it("plays the same events from the same seed and resumes from a cut (stand-in providers)", async () => {
		const run = { story: story(KEYS), prompts: t2Prompts() };
		expect(await checkDeterminism(run, () => idleAgent)).toEqual([]);
		expect(await checkSnapshotRoundTrip(run, () => idleAgent, 1)).toEqual([]);
	});

	describe("the legacy checkpoint", () => {
		const path = join(ROOT, "examples", "cityofkeys-act1-06a-04", "snapshot-L7.json");
		const converted = convertLegacySnapshot(JSON.parse(readFileSync(path, "utf8")), {}, path);
		const loaded = ["motives", "channels", "ledger", "marks", "names", "receipts", "exile"];

		function resume(snapshot: typeof converted.host) {
			const resumed = defineCoreStory({
				id: "nexus",
				seed: 7,
				minutes: 80,
				residents: converted.host.residents.ids,
				mechanics: [motives.with(KEYS), channels.with(), ledgerStandIn(0).with(), marksStandIn().with(), namesStandIn(new Map<string, string>()).with(), receiptsStandIn().with(), exileStandIn.with(), ...standInsFor(snapshot, loaded)],
				grants: {},
			});
			return createHost({ story: resumed, prompts: t2Prompts(), resume: { snapshot, events: converted.events } });
		}

		it("migrates the dealt cores from version 0 and does not deal again", async () => {
			const host = resume(converted.host);
			const old: unknown = converted.host.mechanics.motives?.data;
			const wanted = Parse(LegacyCores, old).cores;
			expect(wanted).toHaveLength(6);
			expect(host.snapshot().mechanics.motives).toMatchObject({ version: 1, data: wanted });
			const before = host.log.length;
			await host.playMinute(idleAgent);
			expect(host.log.all().slice(before).filter((event) => event.type === "core_dealt")).toEqual([]);
		});

		it("deals them before the next minute when the snapshot has none (v09)", async () => {
			const bare = { ...converted.host, mechanics: { ...converted.host.mechanics, motives: { version: 0, data: {} } } };
			const host = resume(bare);
			const before = host.log.length;
			await host.playMinute(idleAgent);
			expect(host.log.all().slice(before).filter((event) => event.type === "core_dealt")).toHaveLength(6);
		});
	});
});
