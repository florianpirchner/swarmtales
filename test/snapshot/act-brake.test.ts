/**
 * The brake of an act without a tribunal (v08, SPEC 17): once Act I has run
 * its `maxMinutes` with residents still inside it, the run logs `act_brake`;
 * a run that takes its snapshot after the act's last level writes it anyway,
 * says so in the snapshot, and lets the door open at the next minute. Those
 * behind keep their level and play on from there. A resumed run continues
 * exactly like the run that was not stopped, names included.
 */
import type { FauxResponseStep } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import type { AnyStory, Host } from "@swarmtales/contracts";
import type { RecordedEvent } from "@swarmtales/legacy-log";
import { prefixLines, type ResumePoint } from "../../apps/cli/src/host/snapshot.ts";
import { resumedOverrides, type RunOverrides } from "../../apps/cli/src/run-options.ts";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import { act, createHostFixture, say } from "../helpers/host-fixture.ts";
import { codeOf, factOf, isFinished, levelOf, waitingAfter } from "../helpers/host-inspect.ts";
import { comparable, NamesSlice, ProgressionSlice, resumeMarkers, sliceIn, snapshotTaker, type TakenSnapshot } from "../helpers/host-snapshot.ts";

const MINUTES = 24;
/** A03 never gets past this door. */
const STUCK = 5;

/** The City of Keys with a short Act I: its brake after 10 minutes. */
const shortAct: AnyStory = { ...cityOfKeys, acts: (cityOfKeys.acts ?? []).map((entry, index) => (index === 0 ? { ...entry, maxMinutes: 10 } : entry)) };

/** Everyone submits its own solution once a minute; A03 stops at door 5. */
function script(host: Host, lastLevel: number): Record<string, FauxResponseStep[]> {
	const result: Record<string, FauxResponseStep[]> = {};
	for (const agent of host.residents) {
		const step: FauxResponseStep = (context) => {
			if (context.messages.at(-1)?.role === "toolResult") return say("Submitted.");
			if (isFinished({ host, effective: { lastLevel } }, agent) || waitingAfter(host, agent) !== null) return say("Waiting.");
			const level = levelOf(host, agent);
			if (agent === "A03" && level >= STUCK) return say("I cannot get through this door.");
			return act({ name: "submitSolution", args: { level, code: codeOf(host, agent, level) } });
		};
		result[agent] = Array.from({ length: MINUTES * 2 }, () => step);
	}
	return result;
}

const BASE: RunOverrides = { minutes: MINUTES, activation: "always", passesPerMinute: 1, stopWhenDone: false, stopWhenSeatsDecided: false, gamemaker: false, classifier: false, names: true };

const Names = Type.Record(Type.String(), Type.String());

async function play(options: { readonly snapshotAfter?: number; readonly stop?: boolean; readonly resume?: ResumePoint } = {}) {
	const taker = options.snapshotAfter === undefined ? undefined : snapshotTaker({ afterLevel: options.snapshotAfter, stop: options.stop ?? false });
	const resume = options.resume;
	const lastLevel = Math.max(...shortAct.levels.map((entry) => entry.number));
	const run = createHostFixture({
		story: shortAct,
		...(resume === undefined ? BASE : resumedOverrides(resume, BASE)),
		script: (host) => script(host, lastLevel),
		...(taker === undefined ? {} : { snapshot: taker.request }),
		...(resume === undefined ? {} : { resume: { point: resume, name: "snapshot-L7.json" } }),
	});
	await run.run();
	const snapshot: TakenSnapshot | undefined = taker?.taken();
	return { events: run.log.events, ofType: <T extends RecordedEvent["type"]>(type: T) => run.events(type), host: run.host, nameOf: (agent: string) => factOf(run.host, "names.names", Names)[agent], ...(snapshot === undefined ? {} : { snapshot }) };
}

describe("the brake of a tribunal-free act (v08)", () => {
	it("only logs the brake in a run without a snapshot; the stuck resident plays on", async () => {
		const { ofType, host } = await play();
		expect(ofType("act_brake")).toEqual([
			expect.objectContaining({ minute: 9, act: "Act I - Learning to talk", fromLevel: 1, toLevel: 7, startedAt: 0, maxMinutes: 10, behind: [{ agent: "A03", level: STUCK }] }),
		]);
		expect(ofType("act_brake")[0]?.snapshot).toBeUndefined();
		// Without a door the others went on into Act II long before; A03 is still on its door.
		expect(levelOf(host, "A03")).toBe(STUCK);
		expect(host.residents.filter((agent) => agent !== "A03").every((agent) => levelOf(host, agent) >= 8)).toBe(true);
	}, 60_000);

	it("writes the checkpoint anyway, opens the door at the next minute, and a resumed run plays on exactly like the run that went on", async () => {
		const whole = await play({ snapshotAfter: 7 });
		const first = await play({ snapshotAfter: 7, stop: true });
		const taken = first.snapshot;
		if (taken === undefined) throw new Error("the brake wrote no snapshot");
		const snapshot = taken.point;
		expect(first.ofType("act_brake")).toMatchObject([{ minute: 9, behind: [{ agent: "A03", level: STUCK }], snapshot: true }]);
		expect(taken.file).toMatchObject({ level: 7, minute: 9, brake: { act: "Act I - Learning to talk", minute: 9, maxMinutes: 10, behind: [{ agent: "A03", level: STUCK }] } });
		expect(sliceIn(snapshot, "progression", ProgressionSlice)).toMatchObject({ door: 7, doorReleased: true });
		expect(first.ofType("run_end").at(-1)?.reason).toBe("the brake of Act I - Learning to talk fired after 10 minutes; snapshot after level 7 written to memory; stopped there");

		// The run that went on: at minute 10 the door opens for everyone who passed level 7; A03 stays on its door.
		const entered = whole.ofType("level_up").filter((event) => event.to === 8);
		expect(entered.length).toBeGreaterThan(0);
		expect(entered.every((event) => event.agent !== "A03")).toBe(true);
		expect(levelOf(whole.host, "A03")).toBe(STUCK);
		expect(whole.ofType("act_brake")).toHaveLength(1);

		// The resumed run logs, after the cut, what the run that went on logged.
		const resumed = await play({ resume: snapshot });
		const cut = prefixLines(snapshot);
		const markers = resumeMarkers(snapshot);
		expect(resumed.events.slice(0, cut)).toEqual(first.events.slice(0, cut));
		expect(comparable(resumed.events.slice(cut + markers), markers)).toEqual(comparable(whole.events.slice(cut)));
		expect(levelOf(resumed.host, "A03")).toBe(STUCK);
		// The snapshot keeps the names the city gave at minute 2 (v08); the resumed run shows the same ones.
		const names = sliceIn(snapshot, "names", NamesSlice);
		expect(names).toMatchObject({ settled: true });
		expect(names.entries).toHaveLength(6);
		expect(whole.host.residents.map((agent) => resumed.nameOf(agent))).toEqual(whole.host.residents.map((agent) => whole.nameOf(agent)));
		expect(resumed.nameOf("A03")).toMatch(/^[A-Z][a-z]+-\d{4}$/);
		// The brake does not fire again after the resume.
		expect(resumed.ofType("act_brake")).toHaveLength(1);
	}, 120_000);
});
