/**
 * The brake of an act without a tribunal (v08, SPEC 17): once Act I has run
 * its `maxMinutes` with residents still inside it, the run logs `act_brake`;
 * a run that takes its snapshot after the act's last level writes it anyway,
 * says so in the snapshot, and lets the door open at the next minute. Those
 * behind keep their level and play on from there. A resumed run continues
 * exactly like the run that was not stopped, names included.
 */
import type { FauxResponseStep } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import { composeRun, resumeOverrides } from "../../apps/cli/src/compose.ts";
import type { World } from "@swarmtales/engine";
import { act, say, type Script, ScriptedModelSource } from "@swarmtales/models";
import { parseSnapshot, type RunSnapshot, MemorySink } from "@swarmtales/chronicle";
import type { AnyStory, RecordedEvent } from "@swarmtales/contracts";
import cityOfKeys from "../../stories/cityofkeys/story.ts";

const MINUTES = 24;
/** A03 never gets past this door. */
const STUCK = 5;

/** The City of Keys with a short Act I: its brake after 10 minutes. */
const shortAct: AnyStory = { ...cityOfKeys, acts: (cityOfKeys.acts ?? []).map((entry, index) => (index === 0 ? { ...entry, maxMinutes: 10 } : entry)) };

/** Everyone submits its own solution once a minute; A03 stops at door 5. */
function script(world: World): Script {
	const result: Record<string, FauxResponseStep[]> = {};
	for (const agent of world.competitors) {
		const step: FauxResponseStep = (context) => {
			if (context.messages.at(-1)?.role === "toolResult") return say("Submitted.");
			if (world.isFinished(agent) || world.waitingAfter(agent) !== undefined) return say("Waiting.");
			const level = world.levelOf(agent);
			if (agent === "A03" && level >= STUCK) return say("I cannot get through this door.");
			return act({ name: "submitSolution", args: { level, code: world.inspect.codeOf(agent, level) } });
		};
		result[agent] = Array.from({ length: MINUTES * 2 }, () => step);
	}
	return result;
}

async function play(options: { readonly snapshotAfter?: number; readonly stop?: boolean; readonly resume?: RunSnapshot } = {}) {
	const log = new MemorySink();
	let taken: RunSnapshot | undefined;
	const base = { minutes: MINUTES, activation: "always", passesPerMinute: 1, stopWhenDone: false, stopWhenSeatsDecided: false, gamemaker: false, classifier: false } as const;
	const resume = options.resume;
	const run = composeRun({
		story: shortAct,
		overrides: resume === undefined ? base : resumeOverrides(resume, base),
		models: (world) => new ScriptedModelSource(script(world)),
		sinks: [log],
		...(options.snapshotAfter === undefined
			? {}
			: {
					snapshot: {
						afterLevel: options.snapshotAfter,
						stop: options.stop ?? false,
						write: (snapshot) => {
							taken = parseSnapshot(JSON.parse(JSON.stringify(snapshot)));
							return "memory";
						},
					},
				}),
		...(resume === undefined ? {} : { resume: { snapshot: resume, name: "snapshot-L7.json" } }),
	});
	await run.arena.run();
	const ofType = <T extends RecordedEvent["type"]>(type: T): readonly Extract<RecordedEvent, { type: T }>[] =>
		log.events.filter((event): event is Extract<RecordedEvent, { type: T }> => event.type === type);
	return { events: log.events, ofType, world: run.world, ...(taken === undefined ? {} : { snapshot: taken }) };
}

/** Events as compared across runs, without the prompt-cache split of the scripted provider. */
function comparable(events: readonly RecordedEvent[], shift = 0): readonly unknown[] {
	return events.map((event) => (event.type === "usage" ? { ...event, seq: event.seq - shift, input: event.input + event.cacheRead, cacheRead: 0, cacheWrite: 0 } : { ...event, seq: event.seq - shift }));
}

describe("the brake of a tribunal-free act (v08)", () => {
	it("only logs the brake in a run without a snapshot; the stuck resident plays on", async () => {
		const { ofType, world } = await play();
		expect(ofType("act_brake")).toEqual([
			expect.objectContaining({ minute: 9, act: "Act I - Learning to talk", fromLevel: 1, toLevel: 7, startedAt: 0, maxMinutes: 10, behind: [{ agent: "A03", level: STUCK }] }),
		]);
		expect(ofType("act_brake")[0]?.snapshot).toBeUndefined();
		// Without a door the others went on into Act II long before; A03 is still on its door.
		expect(world.levelOf("A03")).toBe(STUCK);
		expect(world.competitors.filter((agent) => agent !== "A03").every((agent) => world.levelOf(agent) >= 8)).toBe(true);
	}, 60_000);

	it("writes the checkpoint anyway, opens the door at the next minute, and a resumed run plays on exactly like the run that went on", async () => {
		const whole = await play({ snapshotAfter: 7 });
		const first = await play({ snapshotAfter: 7, stop: true });
		const snapshot = first.snapshot;
		if (snapshot === undefined) throw new Error("the brake wrote no snapshot");
		expect(first.ofType("act_brake")).toMatchObject([{ minute: 9, behind: [{ agent: "A03", level: STUCK }], snapshot: true }]);
		expect(snapshot).toMatchObject({ level: 7, minute: 9, brake: { act: "Act I - Learning to talk", minute: 9, maxMinutes: 10, behind: [{ agent: "A03", level: STUCK }] } });
		expect(snapshot.world).toMatchObject({ door: 7, doorReleased: true });
		expect(first.ofType("run_end").at(-1)?.reason).toBe("the brake of Act I - Learning to talk fired after 10 minutes; snapshot after level 7 written to memory; stopped there");

		// The run that went on: at minute 10 the door opens for everyone who passed level 7; A03 stays on its door.
		const entered = whole.ofType("level_up").filter((event) => event.to === 8);
		expect(entered.length).toBeGreaterThan(0);
		expect(entered.every((event) => event.agent !== "A03")).toBe(true);
		expect(whole.world.levelOf("A03")).toBe(STUCK);
		expect(whole.ofType("act_brake")).toHaveLength(1);

		// The resumed run logs, after the cut, what the run that went on logged.
		const resumed = await play({ resume: snapshot });
		const cut = snapshot.events.length;
		const markers = 1 + snapshot.agents;
		expect(resumed.events.slice(0, cut)).toEqual(snapshot.events);
		expect(comparable(resumed.events.slice(cut + markers), markers)).toEqual(comparable(whole.events.slice(cut)));
		expect(resumed.world.levelOf("A03")).toBe(STUCK);
		// The snapshot keeps the names the city gave at minute 2 (v08); the resumed run shows the same ones.
		expect(snapshot.world.names).toMatchObject({ settled: true });
		expect(snapshot.world.names?.entries).toHaveLength(6);
		expect(whole.world.competitors.map((agent) => resumed.world.nameOf(agent))).toEqual(whole.world.competitors.map((agent) => whole.world.nameOf(agent)));
		expect(resumed.world.nameOf("A03")).toMatch(/^[A-Z][a-z]+-\d{4}$/);
		// The brake does not fire again after the resume.
		expect(resumed.ofType("act_brake")).toHaveLength(1);
	}, 120_000);
});
