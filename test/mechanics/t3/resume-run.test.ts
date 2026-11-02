/**
 * What a resumed run keeps and re-reads (docs/design/carve-round3-T3.md, must-fix 3, 6 and M10, M11):
 * the door of a version-1 snapshot, the tasks the arena had told, and a reached level whose puzzle
 * changed. The file is `examples/cityofkeys-act1-06a-04/snapshot-L7.json` (six residents held at
 * door 7); the host is the real puzzles and progression on stand-ins of the rest.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { convertLegacySnapshot, MemorySink } from "@swarmtales/chronicle";
import type { EventEnvelope, Host, HostSnapshot } from "@swarmtales/contracts";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { createPromptLookup, mechanicPromptFolders } from "@swarmtales/prompts";
import { progression } from "@swarmtales/mechanic-progression";
import { puzzles } from "@swarmtales/mechanic-puzzles";
import { standInsFor, type LegacyLine } from "@swarmtales/testkit";
import type { AnyStory } from "@swarmtales/contracts";
import { World, EventBus } from "@swarmtales/engine";
import { Type } from "typebox";
import { fingerprintOf } from "../../helpers/old-engine.ts";
import { oldRun } from "../../helpers/old-engine-recorder.ts";
import { parseSnapshot } from "@swarmtales/chronicle";
import cityOfKeys from "../../../stories/cityofkeys/story.ts";
import { progressionOptions, SEED } from "../progression/harness.ts";
import { channelsStandIn, ledgerStandIn, receiptsStandIn } from "../progression/standins.ts";
import { puzzleOptions } from "../puzzles/harness.ts";

const PATH = resolve(import.meta.dirname, "../../../examples/cityofkeys-act1-06a-04/snapshot-L7.json");
const LOADED = ["ledger", "channels", "receipts", "puzzles", "progression"];

function record(value: unknown): Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("not an object");
	return Object.fromEntries(Object.entries(value));
}

/** The old file, parsed fresh, with the arena's and the world's parts changed. */
function legacy(mutate: (parts: { arena: Record<string, unknown>; world: Record<string, unknown> }) => void = () => undefined): unknown {
	const raw = record(JSON.parse(readFileSync(PATH, "utf8")));
	const arena = record(raw.arena);
	const world = record(raw.world);
	mutate({ arena, world });
	return { ...raw, arena, world };
}

interface Resumed {
	readonly snapshot: HostSnapshot;
	readonly events: readonly EventEnvelope[];
}

function resume(source: Resumed, story: AnyStory, holdAfter?: number): Host {
	const hold = holdAfter === undefined ? {} : { holdAfter };
	return createHost({
		story: defineCoreStory({
			id: "nexus",
			seed: SEED,
			minutes: 80,
			residents: source.snapshot.residents.ids,
			mechanics: [
				ledgerStandIn().with(),
				channelsStandIn([]).with(),
				receiptsStandIn([]).with(),
				puzzles.with({ ...puzzleOptions(story), ...hold }),
				progression.with({ ...progressionOptions(story), ...hold }),
				...standInsFor(source.snapshot, LOADED),
			],
			grants: { resident: ["getStatus", "getProblem", "submitSolution", "listAgents", "activeTools"] },
		}),
		prompts: createPromptLookup({ mechanics: mechanicPromptFolders() }),
		resume: { snapshot: source.snapshot, events: [...source.events] },
	});
}

function fromLegacy(raw: unknown): Resumed {
	const converted = convertLegacySnapshot(raw, {}, "snapshot-L7");
	return { snapshot: converted.host, events: converted.events };
}

function sliceOf(host: Host, key: string): unknown {
	const data: unknown = host.snapshot().mechanics.progression?.data;
	return typeof data === "object" && data !== null ? Reflect.get(data, key) : undefined;
}

/** A version-1 snapshot of the progression, as the new host writes it, with `mutate` applied to its data. */
function version1(mutate: (data: Record<string, unknown>) => void): Resumed {
	const first = resume(fromLegacy(legacy()), cityOfKeys);
	const snapshot = structuredClone(first.snapshot());
	const slice = snapshot.mechanics.progression;
	if (slice === undefined) throw new Error("no progression slice");
	const data = record(slice.data);
	mutate(data);
	snapshot.mechanics.progression = { ...slice, data };
	return { snapshot, events: first.log.all() };
}

describe("the door of a version-1 resume", () => {
	it("is this run's own door when the snapshot names none, as the old `state.door ?? holdAfter` (T3-A3)", () => {
		const source = version1((data) => {
			delete data.door;
			data.locksStale = false;
		});
		expect(sliceOf(resume(source, cityOfKeys, 7), "door")).toBe(7);
		expect(sliceOf(resume(source, cityOfKeys, 9), "door")).toBe(9);
		// Neither a door in the file nor one in the story: none; a door of the file stays whatever the story says.
		expect(sliceOf(resume(source, cityOfKeys), "door")).toBeUndefined();
		expect(sliceOf(resume(version1((data) => (data.locksStale = false)), cityOfKeys, 9), "door")).toBe(7);
	});
});

const TASK = /^Level \d+:/;

/** The tasks each resident is shown in the first minute after the resume, by resident. */
async function firstTasks(host: Host): Promise<ReadonlyMap<string, string>> {
	const tasks = new Map<string, string>();
	await host.playMinute((turn) => {
		const note = turn.inputs.find((entry) => entry.kind === "task");
		if (note !== undefined && !tasks.has(turn.resident)) tasks.set(turn.resident, note.text);
		return Promise.resolve();
	});
	return tasks;
}

describe("the tasks the arena had told (arena.delivered)", () => {
	it("are not told again, and a resident whose entry is stale or from another story is told (M10)", async () => {
		const raw = legacy(({ arena, world }) => {
			const finished = [{ agent: "A03", level: 11, finished: true }];
			arena.delivered = [
				{ agent: "A01", level: 6, finished: false },
				{ agent: "A02", level: 7, finished: false },
				...finished,
				{ agent: "A05", level: 7, finished: true },
			];
			// A03 and A04 finished the run; A05's entry says finished while it stands on level 7 (another story's last level).
			world.competitors = (Array.isArray(world.competitors) ? world.competitors : []).map((entry) => {
				const resident = record(entry);
				return resident.agent === "A03" || resident.agent === "A04" ? { ...resident, level: 11, held: false } : resident;
			});
			world.door = undefined;
		});
		const tasks = await firstTasks(resume(fromLegacy(raw), cityOfKeys));
		// A01's entry is for level 6: its level-7 task is due. A02's matches: nothing.
		expect(tasks.get("A01")).toMatch(TASK);
		expect(tasks.has("A02")).toBe(false);
		// A03 finished and was told; A04 finished and has no entry: it is told the finished notice.
		expect(tasks.has("A03")).toBe(false);
		expect(tasks.get("A04")).toContain(cityOfKeys.finishedNotice);
		// A05's entry says finished, the run says not: due again. A06 has no entry in the list, so its saved level-7 entry is the converter's guess: none.
		expect(tasks.get("A05")).toMatch(TASK);
	});
});

describe("a reached level that changed its puzzle", () => {
	it("is refused with the old words, on both sides (M11)", async () => {
		const level8 = cityOfKeys.levels.find((level) => level.number === 8);
		if (level8 === undefined) throw new Error("no level 8");
		const changed: AnyStory = { ...cityOfKeys, levels: cityOfKeys.levels.map((level) => (level.number === 7 ? { ...level, puzzle: level8.puzzle } : level)) };
		const message = "Level 7 changed its puzzle since the snapshot, and competitors have reached it already";

		// The old World's restore of the changed story, recorded once before the engine went (step 18, item 7b; `test/fixtures/old-engine/`).
		expect(() =>
			oldRun({ story: changed, snapshot: fingerprintOf(legacy()) }, Type.Null(), () => {
				const saved = parseSnapshot(legacy());
				const bus = new EventBus([new MemorySink()], () => 0);
				new World({ story: changed, competitors: ["A01", "A02", "A03", "A04", "A05", "A06"], seed: SEED, minutes: 80, bus, minute: () => 0, restore: saved.world, names: false });
				return null;
			}),
		).toThrow(message);

		const host = resume(fromLegacy(legacy()), changed);
		await expect(host.playMinute(() => Promise.resolve())).rejects.toThrow(message);
	});
});

export type { LegacyLine };
