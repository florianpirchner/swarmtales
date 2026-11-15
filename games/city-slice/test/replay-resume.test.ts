// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The city slice replays and resumes, in process (specification of M3, done-when 2 and 3, sections 7.2 and 7.4).
 * Replay: `replay` gets the game and the lines of a committed timeline, nothing else, and writes the same log. Resume:
 * a second kernel is created from the snapshot the Human Hand took between ticks 6 and 7 and from the log up to it,
 * plays the rest, and its log is the log of the straight run. The command line proves the same with run folders
 * (`apps/cli/test/city-slice.test.ts`).
 */
import { EnvelopeSchema, type Envelope, type ToolOutcome } from "@swarmtales/contracts";
import { replay, testKernel } from "@swarmtales/testkit";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { describe, expect, it } from "vitest";
import game from "../game.ts";
import { AMENDED_HAND, HAND, type HandLine } from "../src/scripts.ts";
import { drivers, plain, playSlice, RECORDS, TICKS, timeline } from "./support.ts";

const RUNS = [
	{ name: "seed-7", seed: 7, hand: HAND, exiled: "A04" },
	{ name: "seed-11", seed: 11, hand: HAND, exiled: "A04" },
	{ name: "amended", seed: 7, hand: AMENDED_HAND, exiled: "A02" },
] as const;
const Log = Type.Array(EnvelopeSchema, { description: "The lines of a committed timeline" });
/** A committed timeline as the events of a log: what a replay starts from. */
const logOf = (name: string): readonly Envelope[] => Parse(Log, timeline(name));
const types = (events: readonly Envelope[], actor: string): readonly string[] => events.filter((event) => event.actor === actor).map((event) => event.type);

/** The straight run, then a second kernel from its snapshot that plays the rest with fresh drivers and the hand lines that were not applied yet. */
async function resumed(seed: number, hand: readonly HandLine[]): Promise<{ readonly straight: readonly Envelope[]; readonly prefix: readonly Envelope[]; readonly log: readonly Envelope[]; readonly outcomes: readonly ToolOutcome[]; readonly pausedAtStart: unknown }> {
	const { events: straight, snapshots } = await playSlice(seed, hand);
	const [snapshot] = snapshots;
	if (snapshot === undefined) throw new RangeError("the Human Hand of the slice takes a snapshot");
	const prefix = straight.slice(0, snapshot.seq);
	const { kernel } = testKernel(game, { seed, records: RECORDS, resume: { snapshot, log: prefix } });
	const pausedAtStart = kernel.fact("humanHand.paused");
	// The hand lines after the `snapshot` line: the calls before it are in the prefix.
	const rest = hand.slice(hand.findIndex((line) => line.command === "snapshot") + 1);
	const table = drivers(seed);
	const outcomes: ToolOutcome[] = [];
	for (let done = snapshot.tick; done < TICKS; done++) {
		for (const line of rest.filter((entry) => entry.at === done)) outcomes.push(await kernel.submit({ actor: "human", as: line.tool ?? "", params: line.params ?? {} }));
		await kernel.run(table, { ticks: 1 });
	}
	return { straight, prefix, log: kernel.log.all(), outcomes, pausedAtStart };
}

describe.each(RUNS)("the city slice replays and resumes, $name", ({ name, seed, hand, exiled }) => {
	it("done-when 2: replay writes the committed timeline again from the game and the log alone, line by line", async () => {
		const log = logOf(name);
		const again = await replay({ game, log, records: RECORDS });
		expect(again.firstDifference).toBeUndefined();
		expect([again.equal, again.log.length, again.issue]).toEqual([true, log.length, undefined]);
		expect(plain(again.log)).toEqual(timeline(name));
		// Results, not copies: the replay made the exile, the burns and the Director's activation again.
		expect(again.log.filter((event) => event.type === "exiled").map((event) => event.payload)).toEqual([{ agent: exiled, by: "court" }]);
		expect(types(again.log, "director:warden")).toEqual(["activation_opened", "tool_called", "tool_result", "asked", "answered", "tool_called", "board_post", "tool_result", "activation_closed"]);
	});

	it("done-when 2: a log with one input changed is not replayed equal, and the first differing line is named", async () => {
		// The third vote against A04 goes to A02 instead: the call is an input, so the replay makes it, and what follows from it differs.
		const log = logOf(name);
		const at = log.findIndex((event) => event.type === "tool_called" && event.actor === "resident:A03" && event.tick === 5);
		const changed = log.map((event, index) => (index === at ? { ...event, payload: { as: "vote", params: { target: "A02" } } } : event));
		const again = await replay({ game, log: changed, records: RECORDS });
		expect([again.equal, again.issue?.code, again.firstDifference?.line]).toEqual([false, "SWT-T003", at + 2]);
		expect(again.firstDifference).toMatchObject({ expected: { type: "vote_cast", payload: { voter: "A03", target: "A04" } }, got: { type: "vote_cast", payload: { voter: "A03", target: "A02" } } });
		// A changed result is found at its own line.
		const settled = log.findIndex((event) => event.type === "decision_settled");
		const edited = log.map((event, index) => (index === settled ? { ...event, payload: { ...Object(event.payload), changed: exiled === "A04" } } : event));
		expect((await replay({ game, log: edited, records: RECORDS })).firstDifference).toMatchObject({ line: settled + 1, got: { payload: { changed: exiled !== "A04" } } });
	});

	it("done-when 3, in process: a kernel created from the snapshot between ticks 6 and 7 plays the rest, and its log is the straight log", async () => {
		const { straight, prefix, log, outcomes, pausedAtStart } = await resumed(seed, hand);
		// The snapshot lies after the pause, before the resume and before the settling: the second kernel does all of that itself.
		expect([prefix.at(-1)?.type, prefix.at(-1)?.actor, pausedAtStart]).toEqual(["tool_result", "human", true]);
		expect(prefix.map((event) => event.type)).not.toContain("resumed");
		const rest = log.slice(prefix.length);
		expect(rest.length).toBeGreaterThan(100);
		expect(rest.filter((event) => ["resumed", "decision_amended", "decision_settled", "exiled", "factor_burned"].includes(event.type)).map((event) => [event.tick, event.type])).toEqual([[7, "resumed"], ...(name === "amended" ? [[8, "decision_amended"]] : []), [8, "decision_settled"], [8, "exiled"], [8, "factor_burned"]]);
		expect(outcomes.map((outcome) => outcome.ok)).toEqual(name === "amended" ? [true, true] : [true]);
		// No marker in process (the marker is the command line's record), so the whole log is compared, job ids included.
		expect(plain(log)).toEqual(plain(straight));
		expect(plain(log)).toEqual(timeline(name));
		// The Director was asked before the snapshot only: the fresh asker of the second kernel is never used.
		expect(rest.filter((event) => event.actor === "director:warden")).toEqual([]);
	});

	it("done-when 2 and 3 together: the resumed log replays equal", async () => {
		const { log } = await resumed(seed, hand);
		expect(await replay({ game, log, records: RECORDS })).toMatchObject({ equal: true });
	});
});

describe("the resumed slice, when the rest is played differently", () => {
	it("differs from the straight log from the first changed input on (the comparison can fail)", async () => {
		// The straight hand on the snapshot of the amended run: the amendment after the snapshot is not made.
		const { events: straight, snapshots } = await playSlice(7, AMENDED_HAND);
		const [snapshot] = snapshots;
		if (snapshot === undefined) throw new RangeError("the Human Hand of the slice takes a snapshot");
		const { kernel } = testKernel(game, { seed: 7, records: RECORDS, resume: { snapshot, log: straight.slice(0, snapshot.seq) } });
		await kernel.submit({ actor: "human", as: "resume", params: {} });
		const end = await kernel.run(drivers(7), { ticks: TICKS - snapshot.tick });
		const log = kernel.log.all();
		const first = log.findIndex((event, index) => JSON.stringify(event) !== JSON.stringify(straight[index]));
		expect([end, straight[first]?.type, straight[first]?.actor, straight[first]?.tick]).toEqual([{ reason: "ticks", tick: 12 }, "tool_called", "human", 8]);
		expect(log.filter((event) => event.type === "exiled").map((event) => event.payload)).toEqual([{ agent: "A04", by: "court" }]);
	});
});
