/**
 * Snapshots and v09 (spec sections 3-5): core motives, goals, the black seal and the
 * penalty counts survive a snapshot through its schema; the system prompt
 * stays identical across a resume; and the published Act I checkpoints from
 * before v09 still resume, dealing core motives at the resume and goals when Act II
 * begins.
 */
import { join } from "node:path";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import type { RecordedEvent } from "@swarmtales/legacy-log";
import { oracleScript } from "@swarmtales/models";
import { hostOracle } from "../../apps/cli/src/oracle.ts";
import { prefixLines, readResumePoint, type ResumePoint } from "../../apps/cli/src/host/snapshot.ts";
import { resumedOverrides, type RunOverrides } from "../../apps/cli/src/run-options.ts";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import { createHostFixture, storyDefaults, type HostFixture } from "../helpers/host-fixture.ts";
import { coreMotiveOf } from "../helpers/host-inspect.ts";
import { sliceIn, snapshotTaker } from "../helpers/host-snapshot.ts";

interface Composed {
	readonly run: HostFixture;
	readonly taken: () => ResumePoint | undefined;
}

function compose(
	overrides: RunOverrides,
	options: { readonly snapshotAfter?: number; readonly atMinute?: number; readonly resume?: ResumePoint; readonly promptAddenda?: readonly { readonly agent?: string; readonly text: string }[] } = {},
): Composed {
	const resume = options.resume;
	const taker = options.snapshotAfter === undefined ? undefined : snapshotTaker({ afterLevel: options.snapshotAfter, ...(options.atMinute === undefined ? {} : { atMinute: options.atMinute }), stop: true });
	const run = createHostFixture({
		story: cityOfKeys,
		...storyDefaults(cityOfKeys),
		names: true,
		...(resume === undefined ? overrides : resumedOverrides(resume, overrides)),
		script: (host) => oracleScript(host.residents, () => hostOracle(host), 200),
		...(taker === undefined ? {} : { snapshot: taker.request }),
		...(resume === undefined ? {} : { resume: { point: resume, name: "snapshot.json" } }),
		...(options.promptAddenda === undefined ? {} : { promptAddenda: options.promptAddenda }),
	});
	return { run, taken: () => taker?.taken()?.point };
}

function after(events: readonly RecordedEvent[], type: RecordedEvent["type"], from: number): readonly RecordedEvent[] {
	return events.slice(from).filter((event) => event.type === type);
}

const Open = { additionalProperties: true } as const;
const Goals = Type.Object({ acts: Type.Array(Type.Object({ act: Type.Integer(), goals: Type.Array(Type.Unknown()), resolved: Type.Boolean() }, Open)) }, Open);
const Cores = Type.Array(Type.Object({ agent: Type.String(), figure: Type.Optional(Type.String()) }, Open));
const Seal = Type.Object({ seal: Type.Optional(Type.Object({ seals: Type.Array(Type.Unknown()) }, Open)) });
const Progression = Type.Object({ endedActs: Type.Optional(Type.Array(Type.Integer())), offences: Type.Optional(Type.Array(Type.Unknown())) }, Open);

describe("v09 state in snapshots", () => {
	it("cuts inside an act at a minute and resumes there, with a prompt addendum (lab/)", async () => {
		const first = compose({ agents: 6 }, { snapshotAfter: 7 });
		await first.run.run();
		const door = first.taken();
		if (door === undefined) throw new Error("no snapshot was taken");
		const atMinute = door.minute + 4;
		const middle = compose({ minutes: 60 }, { resume: door, snapshotAfter: door.level, atMinute });
		await middle.run.run();
		const cut = middle.taken();
		if (cut === undefined) throw new Error("no minute snapshot was taken");
		expect(cut.minute).toBe(atMinute);
		expect(cut.level).toBeGreaterThanOrEqual(door.level);
		expect(sliceIn(cut, "goals", Goals).acts).toHaveLength(1);

		const lab = compose({ minutes: 60 }, { resume: cut, promptAddenda: [{ text: "  Play it true.\n" }, { agent: "A02", text: "You are Verena." }] });
		const middleRunners = middle.run.runners();
		for (const [index, runner] of lab.run.runners().entries()) {
			const extra = runner.id === "A02" ? "\n\nYou are Verena." : "";
			expect(runner.systemPrompt).toBe(`${middleRunners[index]?.systemPrompt ?? ""}\n\nPlay it true.${extra}`);
		}
		await lab.run.run();
		expect(after(lab.run.log.events, "run_end", prefixLines(cut))).toHaveLength(1);
	}, 120_000);

	it("keeps core motives across a resume, with the same system prompt, and deals goals once at the wall", async () => {
		const first = compose({ agents: 6 }, { snapshotAfter: 7 });
		await first.run.run();
		const snapshot = first.taken();
		if (snapshot === undefined) throw new Error("no snapshot was taken");
		expect(sliceIn(snapshot, "motives", Cores)).toHaveLength(6);
		// Act I has no goals and no seal; nothing of Act II has begun at the door.
		expect(sliceIn(snapshot, "goals", Goals).acts).toEqual([]);
		expect(sliceIn(snapshot, "seal", Seal).seal).toBeUndefined();
		expect(sliceIn(snapshot, "progression", Progression).endedActs).toEqual([]);

		const resumed = compose({ minutes: 60 }, { resume: snapshot });
		// The prompt is the same in both runs, the core motive included.
		expect(resumed.run.runners().map((runner) => runner.systemPrompt)).toEqual(first.run.runners().map((runner) => runner.systemPrompt));
		for (const runner of resumed.run.runners()) {
			expect(runner.systemPrompt).toContain("Who you are, deep inside:");
			expect(runner.systemPrompt).not.toContain(`You are ${runner.id}`);
		}
		await resumed.run.run();
		const cut = prefixLines(snapshot);
		expect(after(resumed.run.log.events, "motive_dealt", cut)).toEqual([]);
		expect(after(resumed.run.log.events, "goal_dealt", cut)).toHaveLength(6);
		expect(after(resumed.run.log.events, "seal_auction_opened", cut)).toHaveLength(1);
	}, 120_000);

	it("carries goals, the seal and the penalty counts through a snapshot inside Act II", async () => {
		const first = compose({ agents: 6, level: 8 }, { snapshotAfter: 8 });
		await first.run.run();
		const snapshot = first.taken();
		if (snapshot === undefined) throw new Error("no snapshot was taken");
		const goals = sliceIn(snapshot, "goals", Goals);
		expect(goals.acts.map((entry) => [entry.act, entry.goals.length, entry.resolved])).toEqual([[8, 6, false]]);
		const seal = sliceIn(snapshot, "seal", Seal);
		expect(seal.seal?.seals).toHaveLength(1);
		const resumed = compose({ minutes: 60 }, { resume: snapshot });
		const restored = resumed.run.host.snapshot();
		expect(sliceIn({ host: restored }, "goals", Goals)).toEqual(goals);
		expect(sliceIn({ host: restored }, "seal", Seal)).toEqual(seal);
		expect(sliceIn({ host: restored }, "progression", Progression).offences).toEqual(sliceIn(snapshot, "progression", Progression).offences);
		await resumed.run.run();
		const cut = prefixLines(snapshot);
		// The act's goals were dealt before the snapshot; the resumed run resolves them, once each.
		expect(after(resumed.run.log.events, "goal_dealt", cut)).toEqual([]);
		expect(after(resumed.run.log.events, "goal_resolved", cut)).toHaveLength(6);
	}, 120_000);

	it.each(["cityofkeys-act1-06a-01", "cityofkeys-act1-06a-02", "cityofkeys-act1-12a-01"])("resumes the pre-v09 checkpoint %s, dealing core motives at the resume and goals at the wall", async (name) => {
		const snapshot = readResumePoint(join(process.cwd(), "examples", name, "snapshot-L7.json"));
		expect(snapshot.coresDealt).toBe(false);
		const resumed = compose({ minutes: snapshot.minute + 8 }, { resume: snapshot });
		for (const runner of resumed.run.runners()) expect(runner.systemPrompt).toContain("Who you are, deep inside:");
		await resumed.run.run();
		const cut = prefixLines(snapshot);
		const resumedAt = resumed.run.log.events.findIndex((event) => event.type === "run_resumed");
		expect(resumedAt).toBe(cut);
		expect(after(resumed.run.log.events, "motive_dealt", cut)).toHaveLength(snapshot.agents);
		expect(after(resumed.run.log.events, "goal_dealt", cut)).toHaveLength(snapshot.agents);
	}, 120_000);
});

describe("the cast in a run (v12)", () => {
	it("plays the named figures with the frame first, keeps them across a resume and refuses --cast there", async () => {
		const cast = ["banner", "second-chair", "house", "believer", "crier", "old-wound"];
		const first = compose({ agents: 6, cast }, { snapshotAfter: 7 });
		const figures = first.run.host.residents.map((agent) => coreMotiveOf(first.run.host, agent)?.figure);
		expect([...figures].sort()).toEqual([...cast].sort());
		for (const runner of first.run.runners()) expect(runner.systemPrompt.startsWith("You play a character in a fictional story")).toBe(true);
		await first.run.run();
		const door = first.taken();
		if (door === undefined) throw new Error("no snapshot was taken");
		expect(sliceIn(door, "motives", Cores).map((entry) => entry.figure)).toEqual(figures);
		const resumed = compose({ minutes: 60 }, { resume: door });
		expect(resumed.run.runners().map((runner) => runner.systemPrompt)).toEqual(first.run.runners().map((runner) => runner.systemPrompt));
		expect(() => resumedOverrides(door, { cast })).toThrow(/--cast applies only to a fresh run/);
	}, 60_000);

	it("refuses an unknown figure and plays figures without personas in a control group", () => {
		expect(() => compose({ agents: 6, cast: ["nobody"] })).toThrow(/Unknown figures nobody/);
		const plain = compose({ agents: 6, cast: ["banner"], personas: false });
		for (const runner of plain.run.runners()) expect(runner.systemPrompt).not.toContain("Your character:");
	});
});
