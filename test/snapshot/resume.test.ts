/**
 * Run snapshots end to end (SPEC 17): a scripted City of Keys run is snapshotted
 * after level 7 and resumed; from the cut on, the resumed run logs exactly
 * what the uninterrupted run logs that holds everyone at the door of level 7
 * and then lets them in together.
 */
import type { FauxResponseStep } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { SnapshotError } from "@swarmtales/chronicle";
import type { AnyStory, Host } from "@swarmtales/contracts";
import type { RecordedEvent } from "@swarmtales/legacy-log";
import type { Script } from "@swarmtales/models";
import { prefixLines, type ResumePoint } from "../../apps/cli/src/host/snapshot.ts";
import { resumedOverrides, type RunOverrides } from "../../apps/cli/src/run-options.ts";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import { act, createHostFixture, say, storyDefaults } from "../helpers/host-fixture.ts";
import { codeOf, factOf } from "../helpers/host-inspect.ts";
import {
	ChannelsSlice,
	ClassifierSlice,
	comparable,
	GamemakerSlice,
	overseerSliceIn,
	ProgressionSlice,
	PuzzlesLevels,
	ReceiptsSlice,
	resumeMarkers,
	ScriptSlice,
	sliceIn,
	snapshotTaker,
	type TakenSnapshot,
} from "../helpers/host-snapshot.ts";

const MINUTES = 26;

const Ranking = Type.Object({ ranking: Type.Array(Type.Object({ agent: Type.String(), level: Type.Integer(), finished: Type.Boolean() }, { additionalProperties: true })) }, { additionalProperties: true });

function rankOf(host: Host, agent: string): { readonly level: number; readonly finished: boolean } {
	const entry = factOf(host, "progression.section", Ranking).ranking.find((row) => row.agent === agent);
	if (entry === undefined) throw new Error(`no ranking row of ${agent}`);
	return entry;
}

/**
 * Competitors that solve their doors from the observer view but stumble and
 * talk on the way: every few minutes a wrong code, then a DM, a board post, a
 * transfer or a group, whichever the level allows. Every step is a function
 * of the city and the context only, so a resumed run gets the same answers.
 */
function chattyScript(host: Host): Script {
	const script: Record<string, FauxResponseStep[]> = {};
	host.residents.forEach((agent, index) => {
		const step: FauxResponseStep = (context) => {
			const minute = host.minute;
			const neighbour = host.residents[(index + 1) % host.residents.length] ?? agent;
			// Which step of this minute: every step starts with the minute's status line.
			const status = `[status] minute ${String(minute)} · `;
			const steps = context.messages.filter((message) => message.role === "user" && textOf(message.content).includes(status)).length;
			// Submit, talk, submit again (the level may have changed meanwhile).
			if (steps === 1 || steps === 3) {
				const rank = rankOf(host, agent);
				if (rank.finished) return act({ name: "postBoard", args: { message: `${agent} watches at minute ${String(minute)}.` } });
				const level = rank.level;
				const code = codeOf(host, agent, level);
				const wrong = (minute + index) % 4 === 0;
				return act({ name: "submitSolution", args: { level, code: wrong ? (code.startsWith("1") ? "2" : "1") + code.slice(1) : code } });
			}
			if (steps === 2) {
				switch ((minute + index) % 4) {
					case 0:
						return act({ name: "sendDM", args: { target: neighbour, message: `Deal? I help you at minute ${String(minute)}.` } });
					case 1:
						return act({ name: "transferPoints", args: { target: neighbour, amount: 1, memo: "a deal" } });
					case 2:
						return act({ name: "createGroup", args: { name: `circle of ${agent}` } });
					default:
						return act({ name: "readBoard", args: {} });
				}
			}
			return say(`${agent} waits.`);
		};
		script[agent] = Array.from({ length: MINUTES * 4 }, () => step);
	});
	return script;
}

function textOf(content: string | readonly { readonly type: string; readonly text?: string }[]): string {
	return typeof content === "string" ? content : content.map((part) => part.text ?? "").join("\n");
}

/** The gamemaker writes one note a look, to a resident chosen by the round. */
function gamemakerScript(host: Host): readonly FauxResponseStep[] {
	const step: FauxResponseStep = (context) => {
		if (context.messages.at(-1)?.role === "toolResult") return say("Done.");
		const agent = host.residents[host.minute % host.residents.length] ?? "A01";
		return act({ name: "notify", args: { agent, text: `${agent}, the city keeps count.` } });
	};
	return Array.from({ length: MINUTES * 3 }, () => step);
}

/** The classifier labels every statement that offers a deal as an offer to the next resident. */
function classifierScript(): readonly FauxResponseStep[] {
	const step: FauxResponseStep = (context) => {
		const prompt = context.messages.findLast((message) => message.role === "user");
		const text = typeof prompt?.content === "string" ? prompt.content : "";
		const items = [...text.matchAll(/^#(\d+) (A\d+) [^\n]*Deal\?/gm)].map((match) => ({ ref: Number(match[1]), labels: ["offer"], targets: [] }));
		return act({ name: "label", args: { items } });
	};
	return Array.from({ length: MINUTES * 2 }, () => step);
}

interface Played {
	readonly events: readonly RecordedEvent[];
	readonly snapshot?: TakenSnapshot;
}

interface PlayOptions {
	readonly snapshotAfter?: number;
	readonly stop?: boolean;
	readonly resume?: ResumePoint;
	readonly story?: AnyStory;
}

async function play(overrides: RunOverrides, extra: PlayOptions = {}): Promise<Played> {
	const resume = extra.resume;
	const story = extra.story ?? cityOfKeys;
	const taker = extra.snapshotAfter === undefined ? undefined : snapshotTaker({ afterLevel: extra.snapshotAfter, stop: extra.stop ?? false });
	const run = createHostFixture({
		story,
		...storyDefaults(story),
		names: true,
		minutes: MINUTES,
		...(resume === undefined ? overrides : resumedOverrides(resume, overrides)),
		script: chattyScript,
		gamemakerScript,
		classifierScript: classifierScript(),
		meta: { run: resume === undefined ? "first" : "resumed" },
		...(taker === undefined ? {} : { snapshot: taker.request }),
		...(resume === undefined ? {} : { resume: { point: resume, name: "snapshot-L7.json" } }),
	});
	await run.run();
	const snapshot = taker?.taken();
	return { events: run.log.events, ...(snapshot === undefined ? {} : { snapshot }) };
}

/** Nexus with a different level 8: another reward, title and code length. */
const changedWall: AnyStory = {
	...cityOfKeys,
	levels: cityOfKeys.levels.map((entry) =>
		entry.number === 8 ? { ...entry, title: "The new wall", reward: 33, puzzle: { ...entry.puzzle, digits: 4 } } : entry,
	),
};

/** The `seq` of the first event that matches, or infinity. */
function seqOf(events: readonly RecordedEvent[], match: (event: RecordedEvent) => boolean): number {
	return events.find(match)?.seq ?? Number.POSITIVE_INFINITY;
}

function pointOf(played: Played): ResumePoint {
	if (played.snapshot === undefined) throw new Error("no snapshot was taken");
	return played.snapshot.point;
}

describe("run snapshots", () => {
	it("resumes a run after level 7 so that it continues exactly like the held, then released run", async () => {
		const whole = await play({}, { snapshotAfter: 7 });
		const first = await play({}, { snapshotAfter: 7, stop: true });
		const snapshot = pointOf(first);

		// The cut: every competitor passed level 7 and waits at its door, the run still going, and the gamemaker looked.
		const progression = sliceIn(snapshot, "progression", ProgressionSlice);
		expect(progression.door).toBe(7);
		expect(progression.competitors.every((entry) => entry.level === 7 && entry.held && entry.solved.includes(7))).toBe(true);
		expect(sliceIn(snapshot, "puzzles", PuzzlesLevels).levels.map((entry) => entry.level)).not.toContain(8);
		expect(snapshot.round).toBeLessThan(MINUTES);
		const cut = prefixLines(snapshot);
		const prefix = first.events.slice(0, cut);
		expect(prefix.filter((event) => event.type === "gamemaker_turn").at(-1)).toMatchObject({ round: snapshot.round });
		expect(comparable(prefix)).toEqual(comparable(whole.events.slice(0, cut)));
		const end = first.events.at(-1);
		expect(end?.type === "run_end" ? end.reason : undefined).toMatch(/^snapshot after level 7 written to memory; stopped there$/);

		// The snapshot carries more than a cold start would: talk, groups, receipts, notes and labels.
		const channels = sliceIn(snapshot, "channels", ChannelsSlice);
		expect(channels.groups.groups.length).toBeGreaterThan(0);
		expect(sliceIn(snapshot, "receipts", ReceiptsSlice).receipts.length).toBeGreaterThan(10);
		expect(channels.dms.length).toBeGreaterThan(0);
		expect(overseerSliceIn(snapshot, "gamemaker", GamemakerSlice).notes.length).toBeGreaterThan(0);
		expect(overseerSliceIn(snapshot, "classifier", ClassifierSlice).history.length).toBeGreaterThan(0);
		expect(sliceIn(snapshot, "script", ScriptSlice).fired.length).toBeGreaterThan(0);
		expect(whole.events.filter((event) => event.type === "interpretation").length).toBeGreaterThan(0);

		const resumed = await play({}, { resume: snapshot });
		const markers = resumeMarkers(snapshot);
		expect(resumed.events.slice(0, cut)).toEqual(prefix);
		expect(resumed.events[cut]).toMatchObject({ type: "run_resumed", seq: cut + 1, snapshot: "snapshot-L7.json", level: 7, round: snapshot.round });
		expect(resumed.events.slice(cut + 1, cut + markers).map((event) => event.type)).toEqual(Array.from({ length: snapshot.agents }, () => "agent_profile"));

		const after = comparable(resumed.events.slice(cut + markers), markers, cut);
		expect(after.length).toBeGreaterThan(200);
		expect(after).toEqual(comparable(whole.events.slice(cut)));
		expect(whole.events.at(-1)?.type).toBe("run_end");
	}, 60_000);

	it("holds whoever passes level 7 at the door until everyone has, then lets them all in at the next round", async () => {
		const held = await play({}, { snapshotAfter: 7 });
		const snapshot = pointOf(held);
		const events = held.events;
		const passes = events.filter((event) => event.type === "level_up" && event.from === 7);
		const competitors = sliceIn(snapshot, "progression", ProgressionSlice).competitors;
		expect(passes.map((event) => (event.type === "level_up" ? event.agent : "")).sort()).toEqual(competitors.map((entry) => entry.agent));
		const lastPass = Math.max(...passes.map((event) => event.seq));
		const firstPass = Math.min(...passes.map((event) => event.seq));
		// Somebody waited at the door for minutes.
		expect(Math.min(...passes.map((event) => event.minute))).toBeLessThan(snapshot.minute - 1);

		// Passing pays and gives a receipt as usual, with a city notice about the door, and no level 8 yet.
		const receipts = sliceIn(snapshot, "receipts", ReceiptsSlice).receipts.filter((receipt) => receipt.kind === "levelUp" && receipt.level === 7);
		expect(receipts).toHaveLength(snapshot.agents);
		const deal8 = seqOf(events, (event) => event.type === "factors_dealt" && event.level === 8);
		const courier8 = seqOf(events, (event) => event.type === "director_action" && event.rule === "courier-8");
		expect(deal8).toBeGreaterThan(lastPass);
		expect(courier8).toBeGreaterThan(deal8);
		const heldInputs = events.flatMap((event) => (event.type === "turn_input" && event.seq > firstPass && event.seq < lastPass ? event.inputs : []));
		expect(heldInputs.some((text) => text.includes("The next door opens once every resident has passed level 7."))).toBe(true);
		expect(heldInputs.some((text) => text.includes("level 7 (passed, waiting at the door)"))).toBe(true);

		// Released together, in the round after the snapshot's.
		const released = events.find((event) => event.seq === deal8);
		expect(released?.minute).toBe(snapshot.minute + 1);
		expect(events.at(-1)?.type).toBe("run_end");
		expect(events.some((event) => event.type === "level_up" && event.from === 8)).toBe(true);
	}, 60_000);

	it("deals level 8 from the story the resumed run is given", async () => {
		const snapshot = pointOf(await play({}, { snapshotAfter: 7, stop: true }));
		const resumed = await play({}, { resume: snapshot, story: changedWall });
		const own = resumed.events.slice(prefixLines(snapshot));
		const deal = own.find((event) => event.type === "factors_dealt" && event.level === 8);
		expect(deal?.type === "factors_dealt" ? deal.digits : undefined).toBe(4);
		expect(own.some((event) => event.type === "turn_input" && event.inputs.some((text) => text.includes("Level 8: The new wall (reward +33)")))).toBe(true);
		expect(own.some((event) => event.type === "director_action" && event.rule === "courier-8")).toBe(true);
		expect(own.some((event) => event.type === "level_up" && event.from === 8)).toBe(true);
	}, 60_000);

	it("holds a resumed run at its own, later door and snapshots there again", async () => {
		const snapshot = pointOf(await play({}, { snapshotAfter: 7, stop: true }));
		const second = (await play({}, { resume: snapshot, snapshotAfter: 8, stop: true })).snapshot?.point;
		if (second === undefined) throw new Error("no second snapshot was taken");
		const progression = sliceIn(second, "progression", ProgressionSlice);
		expect(progression.door).toBe(8);
		expect(progression.competitors.every((entry) => entry.level === 8 && entry.held)).toBe(true);
		expect(sliceIn(second, "puzzles", PuzzlesLevels).levels.map((entry) => entry.level)).not.toContain(9);
		expect(second.events.slice(0, snapshot.events.length)).toEqual(snapshot.events);
		await expect(play({}, { resume: snapshot, snapshotAfter: 7 })).rejects.toThrow(/a new snapshot needs a later level/);
	}, 60_000);

	it("refuses a snapshot that does not fit the run", async () => {
		const snapshot = pointOf(await play({}, { snapshotAfter: 7, stop: true }));
		expect(() => resumedOverrides(snapshot, { seed: 8 })).toThrow(/seed 7; this run asks for seed 8/);
		expect(() => resumedOverrides(snapshot, { agents: 12 })).toThrow(/6 agents; this run asks for 12/);
		expect(() => resumedOverrides(snapshot, { level: 8 })).toThrow(SnapshotError);
		await expect(play({ minutes: snapshot.round }, { resume: snapshot })).rejects.toThrow(/--minutes must be greater than/);
		const otherStory = { ...snapshot, story: "atlantis" };
		await expect(play({}, { resume: otherStory })).rejects.toThrow(/story "atlantis" \(this run: "cityofkeys"\)/);
	}, 60_000);
});
