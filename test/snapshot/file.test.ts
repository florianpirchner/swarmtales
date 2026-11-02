/**
 * The snapshot file (SPEC 17): untrusted input checked by its schema, and a
 * resumed run that plays on beyond the levels of the snapshot's run.
 */
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FauxResponseStep } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { parseSnapshot, SnapshotError, type RunSnapshot } from "@swarmtales/chronicle";
import type { Host } from "@swarmtales/contracts";
import type { RecordedEvent } from "@swarmtales/legacy-log";
import { oracleScript, type Script, ScriptedModelSource } from "@swarmtales/models";
import type { World } from "@swarmtales/engine";
import { composeRun } from "../../apps/cli/src/compose.ts";
import { submit as oldSubmit } from "../helpers/fixture.ts";
import { oldRunAsync } from "../helpers/old-engine-recorder.ts";
import { hostOracle } from "../../apps/cli/src/oracle.ts";
import { parseResumePoint, prefixLines, readResumePoint, runFileName, writeRunFile, type ResumePoint, type RunFileOut } from "../../apps/cli/src/host/snapshot.ts";
import { resumedOverrides, type RunOverrides } from "../../apps/cli/src/run-options.ts";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import { createHostFixture, say, storyDefaults } from "../helpers/host-fixture.ts";
import { factOf, levelOf, submit } from "../helpers/host-inspect.ts";
import { ProgressionSlice, PuzzlesLevels, sliceIn, snapshotTaker, type TakenSnapshot } from "../helpers/host-snapshot.ts";
import { soloLevels, tinyStory } from "../helpers/stories.ts";

const story = tinyStory({ levels: soloLevels(3) });

const Ranking = Type.Object({ ranking: Type.Array(Type.Object({ agent: Type.String(), finished: Type.Boolean() }, { additionalProperties: true })) }, { additionalProperties: true });

/** Whether a resident passed the last level of the run it plays in (old `world.isFinished`). */
function finished(host: Host, agent: string): boolean {
	return factOf(host, "progression.section", Ranking).ranking.find((row) => row.agent === agent)?.finished ?? false;
}

/** A01 solves a door every minute; A02 starts at minute 3. Answers depend on the city only, so a resumed run gets the same. */
function script(host: Host): Script {
	const step =
		(agent: string): FauxResponseStep =>
		() =>
			finished(host, agent) || (agent === "A02" && host.minute < 3) ? say() : submit(host, agent, levelOf(host, agent));
	return { A01: Array.from({ length: 10 }, () => step("A01")), A02: Array.from({ length: 10 }, () => step("A02")) };
}

async function play(overrides: RunOverrides, options: { readonly snapshotAfter?: number; readonly resume?: ResumePoint } = {}): Promise<{ readonly events: readonly RecordedEvent[]; readonly snapshot: TakenSnapshot | undefined }> {
	const resume = options.resume;
	const taker = options.snapshotAfter === undefined ? undefined : snapshotTaker({ afterLevel: options.snapshotAfter, stop: true });
	const run = createHostFixture({
		story,
		...storyDefaults(story),
		...(resume === undefined ? overrides : resumedOverrides(resume, overrides)),
		script,
		...(taker === undefined ? {} : { snapshot: taker.request }),
		...(resume === undefined ? {} : { resume: { point: resume, name: "snapshot-L2.json" } }),
	});
	await run.run();
	return { events: run.log.events, snapshot: taker?.taken() };
}

async function snapshotOfTinyRun(): Promise<TakenSnapshot> {
	const { snapshot } = await play({ lastLevel: 2 }, { snapshotAfter: 2 });
	if (snapshot === undefined) throw new Error("no snapshot was taken");
	return snapshot;
}

const TINY_RUN = { story, overrides: { lastLevel: 2 }, snapshotAfter: 2 };

/**
 * The old engine's snapshot of the tiny run (`agent-arena-snapshot` version 2, the file `--resume`
 * still reads), recorded once before the engine went (step 18; `test/fixtures/old-engine/`).
 */
async function oldSnapshotOfTinyRun(): Promise<RunSnapshot> {
	return parseSnapshot(await oldRunAsync(TINY_RUN, Type.Unknown(), liveOldSnapshot));
}

/** The live old composer (recording only; deleted with the engine). */
async function liveOldSnapshot(): Promise<unknown> {
	const step =
		(world: World, agent: string): FauxResponseStep =>
		() =>
			world.isFinished(agent) || (agent === "A02" && world.minute < 3) ? say() : oldSubmit(world, agent, world.levelOf(agent));
	let taken: unknown;
	const run = composeRun({
		story,
		overrides: TINY_RUN.overrides,
		models: (world) => new ScriptedModelSource({ A01: Array.from({ length: 10 }, () => step(world, "A01")), A02: Array.from({ length: 10 }, () => step(world, "A02")) }),
		sinks: [],
		snapshot: {
			afterLevel: TINY_RUN.snapshotAfter,
			stop: true,
			write: (snapshot) => {
				taken = snapshot;
				return "memory";
			},
		},
	});
	await run.arena.run();
	return taken;
}

/** A JSON copy whose `change` edits the raw object, as a hand-edited or damaged file would. */
function damaged(snapshot: RunSnapshot, change: (raw: Record<string, unknown>) => void): unknown {
	const raw: unknown = JSON.parse(JSON.stringify(snapshot));
	if (typeof raw !== "object" || raw === null) throw new Error("not an object");
	const record: Record<string, unknown> = { ...raw };
	change(record);
	return record;
}

describe("snapshot file", () => {
	it("refuses anything that is not a snapshot of this version, naming the broken field", async () => {
		// The old file is still read (`--resume` of a published checkpoint); the host writes its own run file.
		const snapshot = await oldSnapshotOfTinyRun();
		expect(() => parseSnapshot([], "x.json")).toThrow(/x.json is not a run snapshot/);
		expect(() => parseSnapshot(damaged(snapshot, (raw) => (raw.format = "other")))).toThrow(/format "other"/);
		expect(() => parseSnapshot(damaged(snapshot, (raw) => (raw.version = 1)))).toThrow(/version 1; this build reads version 2 only/);
		expect(() => parseSnapshot(damaged(snapshot, (raw) => (raw.seed = "7")))).toThrow(/\/seed:/);
		expect(() => parseSnapshot(damaged(snapshot, (raw) => (raw.world = { ...snapshot.world, competitors: [{ agent: "A01", level: "two" }] })))).toThrow(
			/\/world\/competitors\/0/,
		);
		expect(() => parseSnapshot(damaged(snapshot, (raw) => (raw.events = [...snapshot.events, { type: "explosion", seq: 999, minute: 0 }])))).toThrow(
			/does not match the snapshot schema/,
		);
		expect(() => parseSnapshot(damaged(snapshot, (raw) => (raw.events = snapshot.events.slice(1))))).toThrow(/event 1 has seq 2/);
		expect(() => parseSnapshot(damaged(snapshot, (raw) => (raw.competitors = snapshot.competitors.slice(1))))).toThrow(/competitor contexts/);
		expect(() => parseSnapshot(damaged(snapshot, (raw) => (raw.minute = snapshot.minute + 1)))).toThrow(/is not played at minute/);
	});

	it("continues a run whose story was cut short with the levels the snapshot's run did not play", async () => {
		const { point: snapshot } = await snapshotOfTinyRun();
		// Both competitors passed the last level of that run; A01 was told so a minute later, A02 not yet.
		expect(snapshot.round).toBe(5);
		expect(sliceIn(snapshot, "progression", ProgressionSlice).delivered).toEqual([
			{ agent: "A01", level: 3, finished: true },
			{ agent: "A02", level: 2, finished: false },
		]);
		expect(sliceIn(snapshot, "puzzles", PuzzlesLevels).levels.map((entry) => entry.level)).toEqual([1, 2]);

		const { events } = await play({ minutes: 8 }, { resume: snapshot });
		const after: readonly RecordedEvent[] = events.slice(prefixLines(snapshot));
		expect(after[0]).toMatchObject({ type: "run_resumed", level: 2 });
		// Level 3 is dealt now, and every competitor gets its task instead of the finished notice.
		expect(after.filter((event) => event.type === "fragments_dealt").map((event) => event.level)).toEqual([3]);
		const inputs = after.flatMap((event) => (event.type === "turn_input" ? event.inputs : []));
		expect(inputs.filter((input) => input.startsWith("Password ")).length).toBe(2);
		expect(after.filter((event) => event.type === "level_up").map((event) => event.to)).toEqual([4, 4]);
	});

	it("writes the file whole and checks it as a resume would, at the cut", async () => {
		const { file } = await snapshotOfTinyRun();
		const written: RunFileOut = file;
		const directory = mkdtempSync(join(tmpdir(), "arena-snapshot-"));
		try {
			const path = writeRunFile(directory, written, runFileName(written.level));
			expect(path).toBe(join(directory, "snapshot-L2.json"));
			expect(readdirSync(directory)).toEqual(["snapshot-L2.json"]);
			expect(readResumePoint(path)).toEqual(parseResumePoint(JSON.parse(JSON.stringify(written))));

			// A value JSON cannot carry (NaN becomes null) fails now, not when a later run resumes.
			const [first, ...rest] = written.events;
			if (first === undefined) throw new Error("no events");
			const broken: RunFileOut = { ...written, level: 1, events: [{ ...first, minute: Number.NaN }, ...rest] };
			expect(() => writeRunFile(directory, broken, runFileName(broken.level))).toThrow(SnapshotError);
			expect(existsSync(join(directory, "snapshot-L1.json"))).toBe(true);
			expect(readdirSync(directory).some((name) => name.endsWith(".partial"))).toBe(false);
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	});
});

describe("the published Act I snapshots", () => {
	// v01-v04 resumed the first, v05 and later the second; both must keep resuming (v06 replaced the tribunal's calendar).
	it.each(["cityofkeys-act1-06a-01", "cityofkeys-act1-06a-02"])("%s still loads and resumes into the current cityofkeys, held residents entering level 8", async (folder) => {
		const path = join(process.cwd(), "examples", folder, "snapshot-L7.json");
		// Recorded under the story's old name; findStory still resolves it.
		expect(parseSnapshot(JSON.parse(readFileSync(path, "utf8")))).toMatchObject({ story: "nexus", version: 2, level: 7, agents: 6 });
		const snapshot = readResumePoint(path);
		const run = createHostFixture({
			story: cityOfKeys,
			...storyDefaults(cityOfKeys),
			names: true,
			...resumedOverrides(snapshot, { minutes: snapshot.minute + 3 }),
			script: (host) => oracleScript(host.residents, () => hostOracle(host), 20),
			resume: { point: snapshot, name: "snapshot-L7.json" },
		});
		await run.run();
		const own = run.log.events.slice(prefixLines(snapshot));
		expect(own[0]).toMatchObject({ type: "run_resumed", level: 7 });
		expect(run.host.residents.every((id) => levelOf(run.host, id) >= 8)).toBe(true);
		expect(own.some((event) => event.type === "factors_dealt" && event.level === 8)).toBe(true);
	}, 60_000);
});
