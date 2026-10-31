/**
 * Snapshots and v09 (spec sections 3-5): cores, goals, the black seal and the
 * penalty counts survive a snapshot through its schema; the system prompt
 * stays identical across a resume; and the published Act I checkpoints from
 * before v09 still resume, dealing cores at the resume and goals when Act II
 * begins.
 */
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { composeRun, resumeOverrides, type ComposedRun, type RunOverrides } from "../../apps/cli/src/compose.ts";
import { worldOracle } from "../../apps/cli/src/oracle.ts";
import { MemorySink, type RecordedEvent } from "@swarmtales/engine";
import { oracleScript, ScriptedModelSource } from "@swarmtales/models";
import { parseSnapshot, readSnapshot, type RunSnapshot } from "@swarmtales/chronicle";
import cityOfKeys from "../../stories/cityofkeys/story.ts";

interface Composed {
	readonly run: ComposedRun;
	readonly log: MemorySink;
	readonly taken: () => RunSnapshot | undefined;
}

function compose(
	overrides: RunOverrides,
	options: { readonly snapshotAfter?: number; readonly atMinute?: number; readonly resume?: RunSnapshot; readonly promptAddenda?: readonly { readonly agent?: string; readonly text: string }[] } = {},
): Composed {
	const log = new MemorySink();
	let taken: RunSnapshot | undefined;
	const resume = options.resume;
	const run = composeRun({
		story: cityOfKeys,
		overrides: { names: true, ...(resume === undefined ? overrides : resumeOverrides(resume, overrides)) },
		models: (world) => new ScriptedModelSource(oracleScript(world.competitors, () => worldOracle(world), 200)),
		sinks: [log],
		...(options.snapshotAfter === undefined
			? {}
			: {
					snapshot: {
						afterLevel: options.snapshotAfter,
						...(options.atMinute === undefined ? {} : { atMinute: options.atMinute }),
						stop: true,
						write: (snapshot) => {
							// Through JSON and the schema, as a file would go.
							taken = parseSnapshot(JSON.parse(JSON.stringify(snapshot)));
							return "memory";
						},
					},
				}),
		...(resume === undefined ? {} : { resume: { snapshot: resume, name: "snapshot.json" } }),
		...(options.promptAddenda === undefined ? {} : { promptAddenda: options.promptAddenda }),
	});
	return { run, log, taken: () => taken };
}

function after(events: readonly RecordedEvent[], type: RecordedEvent["type"], from: number): readonly RecordedEvent[] {
	return events.slice(from).filter((event) => event.type === type);
}

describe("v09 state in snapshots", () => {
	it("cuts inside an act at a minute and resumes there, with a prompt addendum (lab/)", async () => {
		const first = compose({ agents: 6 }, { snapshotAfter: 7 });
		await first.run.arena.run();
		const door = first.taken();
		if (door === undefined) throw new Error("no snapshot was taken");
		const atMinute = door.minute + 4;
		const middle = compose({ minutes: 60 }, { resume: door, snapshotAfter: door.level, atMinute });
		await middle.run.arena.run();
		const cut = middle.taken();
		if (cut === undefined) throw new Error("no minute snapshot was taken");
		expect(cut.minute).toBe(atMinute);
		expect(cut.level).toBeGreaterThanOrEqual(door.level);
		expect(cut.world.goals?.acts).toHaveLength(1);

		const lab = compose({ minutes: 60 }, { resume: cut, promptAddenda: [{ text: "  Play it true.\n" }, { agent: "A02", text: "You are Verena." }] });
		for (const [index, runner] of lab.run.runners.entries()) {
			const extra = runner.id === "A02" ? "\n\nYou are Verena." : "";
			expect(runner.systemPrompt).toBe(`${middle.run.runners[index]?.systemPrompt ?? ""}\n\nPlay it true.${extra}`);
		}
		await lab.run.arena.run();
		expect(after(lab.log.events, "run_end", cut.events.length)).toHaveLength(1);
	}, 120_000);

	it("keeps cores across a resume, with the same system prompt, and deals goals once at the wall", async () => {
		const first = compose({ agents: 6 }, { snapshotAfter: 7 });
		await first.run.arena.run();
		const snapshot = first.taken();
		if (snapshot === undefined) throw new Error("no snapshot was taken");
		expect(snapshot.world.cores).toHaveLength(6);
		// Act I has no goals and no seal; nothing of Act II has begun at the door.
		expect(snapshot.world.goals?.acts ?? []).toEqual([]);
		expect(snapshot.world.seal).toBeUndefined();
		expect(snapshot.world.endedActs).toEqual([]);

		const resumed = compose({ minutes: 60 }, { resume: snapshot });
		// The prompt is the same in both runs, the core included.
		expect(resumed.run.runners.map((runner) => runner.systemPrompt)).toEqual(first.run.runners.map((runner) => runner.systemPrompt));
		for (const runner of resumed.run.runners) {
			expect(runner.systemPrompt).toContain("Who you are, deep inside:");
			expect(runner.systemPrompt).not.toContain(`You are ${runner.id}`);
		}
		await resumed.run.arena.run();
		const cut = snapshot.events.length;
		expect(after(resumed.log.events, "core_dealt", cut)).toEqual([]);
		expect(after(resumed.log.events, "goal_dealt", cut)).toHaveLength(6);
		expect(after(resumed.log.events, "seal_auction_opened", cut)).toHaveLength(1);
	}, 120_000);

	it("carries goals, the seal and the penalty counts through a snapshot inside Act II", async () => {
		const first = compose({ agents: 6, level: 8 }, { snapshotAfter: 8 });
		await first.run.arena.run();
		const snapshot = first.taken();
		if (snapshot === undefined) throw new Error("no snapshot was taken");
		expect(snapshot.world.goals?.acts.map((entry) => [entry.act, entry.goals.length, entry.resolved])).toEqual([[8, 6, false]]);
		expect(snapshot.world.seal?.seals).toHaveLength(1);
		const resumed = compose({ minutes: 60 }, { resume: snapshot });
		expect(resumed.run.world.snapshot().goals).toEqual(snapshot.world.goals);
		expect(resumed.run.world.snapshot().seal).toEqual(snapshot.world.seal);
		expect(resumed.run.world.snapshot().offences).toEqual(snapshot.world.offences);
		await resumed.run.arena.run();
		const cut = snapshot.events.length;
		// The act's goals were dealt before the snapshot; the resumed run resolves them, once each.
		expect(after(resumed.log.events, "goal_dealt", cut)).toEqual([]);
		expect(after(resumed.log.events, "goal_resolved", cut)).toHaveLength(6);
	}, 120_000);

	it.each(["cityofkeys-act1-06a-01", "cityofkeys-act1-06a-02", "cityofkeys-act1-12a-01"])("resumes the pre-v09 checkpoint %s, dealing cores at the resume and goals at the wall", async (name) => {
		const snapshot = readSnapshot(join(process.cwd(), "examples", name, "snapshot-L7.json"));
		expect(snapshot.world.cores).toBeUndefined();
		const resumed = compose({ minutes: snapshot.minute + 8 }, { resume: snapshot });
		for (const runner of resumed.run.runners) expect(runner.systemPrompt).toContain("Who you are, deep inside:");
		await resumed.run.arena.run();
		const cut = snapshot.events.length;
		const resumedAt = resumed.log.events.findIndex((event) => event.type === "run_resumed");
		expect(resumedAt).toBe(cut);
		expect(after(resumed.log.events, "core_dealt", cut)).toHaveLength(snapshot.agents);
		expect(after(resumed.log.events, "goal_dealt", cut)).toHaveLength(snapshot.agents);
	}, 120_000);
});

describe("the cast in a run (v12)", () => {
	it("plays the named figures with the frame first, keeps them across a resume and refuses --cast there", async () => {
		const cast = ["banner", "second-chair", "house", "believer", "crier", "old-wound"];
		const first = compose({ agents: 6, cast }, { snapshotAfter: 7 });
		const figures = first.run.world.competitors.map((agent) => first.run.world.coreOf(agent)?.figure);
		expect([...figures].sort()).toEqual([...cast].sort());
		for (const runner of first.run.runners) expect(runner.systemPrompt.startsWith("You play a character in a fictional story")).toBe(true);
		await first.run.arena.run();
		const door = first.taken();
		if (door === undefined) throw new Error("no snapshot was taken");
		expect(door.world.cores?.map((entry) => entry.figure)).toEqual(figures);
		const resumed = compose({ minutes: 60 }, { resume: door });
		expect(resumed.run.runners.map((runner) => runner.systemPrompt)).toEqual(first.run.runners.map((runner) => runner.systemPrompt));
		expect(() => resumeOverrides(door, { cast })).toThrow(/--cast applies only to a fresh run/);
	}, 60_000);

	it("refuses an unknown figure and plays figures without personas in a control group", () => {
		expect(() => compose({ agents: 6, cast: ["nobody"] })).toThrow(/Unknown figures nobody/);
		const plain = compose({ agents: 6, cast: ["banner"], personas: false });
		for (const runner of plain.run.runners) expect(runner.systemPrompt).not.toContain("Your character:");
	});
});
