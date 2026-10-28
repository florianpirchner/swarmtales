/**
 * The snapshot file (SPEC 17): untrusted input checked by its schema, and a
 * resumed run that plays on beyond the levels of the snapshot's run.
 */
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { composeRun, resumeOverrides, type RunOverrides } from "../../src/cli/compose.ts";
import { MemorySink, type RecordedEvent } from "../../src/engine/events.ts";
import type { FauxResponseStep } from "@earendil-works/pi-ai";
import type { World } from "../../src/engine/world.ts";
import { ScriptedModelSource, type Script } from "../../src/model/source.ts";
import { parseSnapshot, readSnapshot, SnapshotError, writeSnapshot, type RunSnapshot } from "../../src/snapshot/snapshot.ts";
import { say, submit } from "../helpers/fixture.ts";
import { soloLevels, tinyStory } from "../helpers/stories.ts";
import { worldOracle } from "../../src/cli/oracle.ts";
import { oracleScript } from "../../src/model/scripted.ts";
import nexus from "../../stories/nexus/story.ts";

const story = tinyStory({ levels: soloLevels(3) });

/** A01 solves a door every minute; A02 starts at minute 3. Answers depend on the world only, so a resumed run gets the same. */
function script(world: World): Script {
	const step =
		(agent: string): FauxResponseStep =>
		() =>
			world.isFinished(agent) || (agent === "A02" && world.minute < 3) ? say() : submit(world, agent, world.levelOf(agent));
	return { A01: Array.from({ length: 10 }, () => step("A01")), A02: Array.from({ length: 10 }, () => step("A02")) };
}

async function play(overrides: RunOverrides, options: { readonly snapshotAfter?: number; readonly resume?: RunSnapshot } = {}) {
	const log = new MemorySink();
	let taken: RunSnapshot | undefined;
	const resume = options.resume;
	const run = composeRun({
		story,
		overrides: resume === undefined ? overrides : resumeOverrides(resume, overrides),
		models: (world) => new ScriptedModelSource(script(world)),
		sinks: [log],
		...(options.snapshotAfter === undefined
			? {}
			: {
					snapshot: {
						afterLevel: options.snapshotAfter,
						stop: true,
						write: (snapshot) => {
							taken = snapshot;
							return "memory";
						},
					},
				}),
		...(resume === undefined ? {} : { resume: { snapshot: resume, name: "snapshot-L2.json" } }),
	});
	await run.arena.run();
	return { events: log.events, snapshot: taken };
}

async function snapshotOfTinyRun(): Promise<RunSnapshot> {
	const { snapshot } = await play({ lastLevel: 2 }, { snapshotAfter: 2 });
	if (snapshot === undefined) throw new Error("no snapshot was taken");
	return parseSnapshot(JSON.parse(JSON.stringify(snapshot)));
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
		const snapshot = await snapshotOfTinyRun();
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
		const snapshot = await snapshotOfTinyRun();
		// Both competitors passed the last level of that run; A01 was told so a minute later, A02 not yet.
		expect(snapshot.round).toBe(5);
		expect(snapshot.arena.delivered).toEqual([
			{ agent: "A01", level: 3, finished: true },
			{ agent: "A02", level: 2, finished: false },
		]);
		expect(snapshot.world.levels.map((entry) => entry.level)).toEqual([1, 2]);

		const { events } = await play({ minutes: 8 }, { resume: snapshot });
		const after: readonly RecordedEvent[] = events.slice(snapshot.events.length);
		expect(after[0]).toMatchObject({ type: "run_resumed", level: 2 });
		// Level 3 is dealt now, and every competitor gets its task instead of the finished notice.
		expect(after.filter((event) => event.type === "fragments_dealt").map((event) => event.level)).toEqual([3]);
		const inputs = after.flatMap((event) => (event.type === "turn_input" ? event.inputs : []));
		expect(inputs.filter((input) => input.startsWith("Password ")).length).toBe(2);
		expect(after.filter((event) => event.type === "level_up").map((event) => event.to)).toEqual([4, 4]);
	});

	it("writes the file whole and checks it as a resume would, at the cut", async () => {
		const snapshot = await snapshotOfTinyRun();
		const directory = mkdtempSync(join(tmpdir(), "arena-snapshot-"));
		try {
			const path = writeSnapshot(directory, snapshot);
			expect(path).toBe(join(directory, "snapshot-L2.json"));
			expect(readdirSync(directory)).toEqual(["snapshot-L2.json"]);
			expect(readSnapshot(path)).toEqual(snapshot);

			// A value JSON cannot carry (NaN becomes null) fails now, not when a later run resumes.
			const [first, ...rest] = snapshot.events;
			if (first === undefined) throw new Error("no events");
			const broken: RunSnapshot = { ...snapshot, level: 1, events: [{ ...first, minute: Number.NaN }, ...rest] };
			expect(() => writeSnapshot(directory, broken)).toThrow(SnapshotError);
			expect(existsSync(join(directory, "snapshot-L1.json"))).toBe(true);
			expect(readdirSync(directory).some((name) => name.endsWith(".partial"))).toBe(false);
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	});
});

describe("the published Act I snapshots", () => {
	// v01-v04 resumed the first, v05 and later the second; both must keep resuming (v06 replaced the tribunal's calendar).
	it.each(["nexus-seed7-haiku-act1", "nexus-seed7-haiku-act1-v2"])("%s still loads and resumes into the current nexus, held residents entering level 8", async (folder) => {
		const snapshot = readSnapshot(join(process.cwd(), "examples", folder, "snapshot-L7.json"));
		expect(snapshot).toMatchObject({ story: "nexus", version: 2, level: 7, agents: 6 });
		const log = new MemorySink();
		const run = composeRun({
			story: nexus,
			overrides: resumeOverrides(snapshot, { minutes: snapshot.minute + 3 }),
			models: (world) => new ScriptedModelSource(oracleScript(world.competitors, () => worldOracle(world), 20)),
			sinks: [log],
			resume: { snapshot, name: "snapshot-L7.json" },
		});
		await run.arena.run();
		const own = log.events.slice(snapshot.events.length);
		expect(own[0]).toMatchObject({ type: "run_resumed", level: 7 });
		expect(run.world.competitors.every((id) => run.world.levelOf(id) >= 8)).toBe(true);
		expect(own.some((event) => event.type === "factors_dealt" && event.level === 8)).toBe(true);
	}, 60_000);
});
