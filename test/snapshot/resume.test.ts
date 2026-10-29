/**
 * Run snapshots end to end (SPEC 17): a scripted nexus run is snapshotted
 * after level 7 and resumed; from the cut on, the resumed run logs exactly
 * what the uninterrupted run logs that holds everyone at the door of level 7
 * and then lets them in together.
 */
import type { FauxResponseStep } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import { composeRun, DEFAULT_LIMITS, resumeOverrides, type RunOverrides } from "../../src/cli/compose.ts";
import { MemorySink, type RecordedEvent } from "../../src/engine/events.ts";
import type { World } from "../../src/engine/world.ts";
import type { AnyStory } from "../../src/story/types.ts";
import { GAMEMAKER_ID } from "../../src/gamemaker/gamemaker.ts";
import { ChatStatementClassifier, CLASSIFIER_ID } from "../../src/interpret/classifier.ts";
import { ScriptedModelSource, type Script } from "../../src/model/source.ts";
import { parseSnapshot, SnapshotError, type RunSnapshot } from "../../src/snapshot/snapshot.ts";
import nexus from "../../stories/nexus/story.ts";
import { act, say } from "../helpers/fixture.ts";

const MINUTES = 26;

/**
 * Competitors that solve their doors from the observer view but stumble and
 * talk on the way: every few minutes a wrong code, then a DM, a board post, a
 * transfer or a group, whichever the level allows. Every step is a function
 * of the world and the context only, so a resumed run gets the same answers.
 */
function chattyScript(world: World): Script {
	const script: Record<string, FauxResponseStep[]> = {};
	world.competitors.forEach((agent, index) => {
		const step: FauxResponseStep = (context) => {
			const minute = world.minute;
			const neighbour = world.competitors[(index + 1) % world.competitors.length] ?? agent;
			// Which step of this minute: every step starts with the minute's status line.
			const status = `[status] minute ${minute} · `;
			const steps = context.messages.filter((message) => message.role === "user" && textOf(message.content).includes(status)).length;
			// Submit, talk, submit again (the level may have changed meanwhile).
			if (steps === 1 || steps === 3) {
				if (world.isFinished(agent)) return act({ name: "postBoard", args: { message: `${agent} watches at minute ${minute}.` } });
				const level = world.levelOf(agent);
				const code = world.inspect.codeOf(agent, level);
				const wrong = (minute + index) % 4 === 0;
				return act({ name: "submitSolution", args: { level, code: wrong ? (code.startsWith("1") ? "2" : "1") + code.slice(1) : code } });
			}
			if (steps === 2) {
				switch ((minute + index) % 4) {
					case 0:
						return act({ name: "sendDM", args: { target: neighbour, message: `Deal? I help you at minute ${minute}.` } });
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
function gamemakerScript(world: World): readonly FauxResponseStep[] {
	const step: FauxResponseStep = (context) => {
		if (context.messages.at(-1)?.role === "toolResult") return say("Done.");
		const agent = world.competitors[world.minute % world.competitors.length] ?? "A01";
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
	readonly snapshot?: RunSnapshot;
}

interface PlayOptions {
	readonly snapshotAfter?: number;
	readonly stop?: boolean;
	readonly resume?: RunSnapshot;
	readonly story?: AnyStory;
}

async function play(overrides: RunOverrides, extra: PlayOptions = {}): Promise<Played> {
	const log = new MemorySink();
	let taken: RunSnapshot | undefined;
	const resume = extra.resume;
	const run = composeRun({
		story: extra.story ?? nexus,
		overrides: { minutes: MINUTES, gamemaker: true, classifier: true, ...(resume === undefined ? overrides : resumeOverrides(resume, overrides)) },
		models: (world) => new ScriptedModelSource(chattyScript(world)),
		gamemakerModels: (world) => new ScriptedModelSource({ [GAMEMAKER_ID]: gamemakerScript(world) }),
		classifier: () =>
			new ChatStatementClassifier({
				binding: new ScriptedModelSource({ [CLASSIFIER_ID]: classifierScript() }).bind(CLASSIFIER_ID, DEFAULT_LIMITS),
				label: "scripted/classifier",
				thinking: "off",
			}),
		sinks: [log],
		meta: { run: resume === undefined ? "first" : "resumed" },
		...(extra.snapshotAfter === undefined
			? {}
			: {
					snapshot: {
						afterLevel: extra.snapshotAfter,
						stop: extra.stop ?? false,
						write: (snapshot) => {
							// Through JSON and the schema, as a file would go.
							taken = parseSnapshot(JSON.parse(JSON.stringify(snapshot)));
							return "memory";
						},
					},
				}),
		...(resume === undefined ? {} : { resume: { snapshot: resume, name: "snapshot-L7.json" } }),
	});
	await run.arena.run();
	return { events: log.events, ...(taken === undefined ? {} : { snapshot: taken }) };
}

/**
 * Events as compared across runs: with the prompt size instead of its split
 * into input and cache tokens, since the provider's prompt cache (simulated
 * by the scripted provider) starts cold in a new process. Memory sinks carry
 * no wall-clock fields.
 */
function comparable(events: readonly RecordedEvent[], shift = 0, from = Number.POSITIVE_INFINITY): readonly unknown[] {
	return events.map((event) => {
		const seq = event.seq - shift;
		if (event.type === "usage") {
			// The scripted provider counts a prompt as input plus cache reads; the split depends on its cache only.
			return { ...event, seq, input: event.input + event.cacheRead, cacheRead: 0, cacheWrite: 0 };
		}
		if (event.type === "interpretation") return { ...event, seq, ref: event.ref > from ? event.ref - shift : event.ref };
		return { ...event, seq };
	});
}

/** Nexus with a different level 8: another reward, title and code length. */
const changedWall: AnyStory = {
	...nexus,
	levels: nexus.levels.map((entry) =>
		entry.number === 8 ? { ...entry, title: "The new wall", reward: 33, puzzle: { ...entry.puzzle, digits: 4 } } : entry,
	),
};

/** The `seq` of the first event that matches, or infinity. */
function seqOf(events: readonly RecordedEvent[], match: (event: RecordedEvent) => boolean): number {
	return events.find(match)?.seq ?? Number.POSITIVE_INFINITY;
}

describe("run snapshots", () => {
	it("resumes a run after level 7 so that it continues exactly like the held, then released run", async () => {
		const whole = await play({}, { snapshotAfter: 7 });
		const first = await play({}, { snapshotAfter: 7, stop: true });
		const snapshot = first.snapshot;
		if (snapshot === undefined) throw new Error("no snapshot was taken");

		// The cut: every competitor passed level 7 and waits at its door, the run still going, and the gamemaker looked.
		expect(snapshot.world.door).toBe(7);
		expect(snapshot.world.competitors.every((entry) => entry.level === 7 && entry.held && entry.solved.includes(7))).toBe(true);
		expect(snapshot.world.levels.map((entry) => entry.level)).not.toContain(8);
		expect(snapshot.round).toBeLessThan(MINUTES);
		const cut = snapshot.events.length;
		expect(snapshot.events.filter((event) => event.type === "gamemaker_turn").at(-1)).toMatchObject({ round: snapshot.round });
		expect(comparable(snapshot.events)).toEqual(comparable(whole.events.slice(0, cut)));
		const end = first.events.at(-1);
		expect(end?.type === "run_end" ? end.reason : undefined).toMatch(/^snapshot after level 7 written to memory; stopped there$/);

		// The snapshot carries more than a cold start would: talk, groups, receipts, notes and labels.
		expect(snapshot.world.groups.groups.length).toBeGreaterThan(0);
		expect(snapshot.world.receipts.length).toBeGreaterThan(10);
		expect(snapshot.world.dms.length).toBeGreaterThan(0);
		expect(snapshot.gamemaker?.notes.length).toBeGreaterThan(0);
		expect(snapshot.interpreter?.history.length).toBeGreaterThan(0);
		expect(snapshot.director.fired.length).toBeGreaterThan(0);
		expect(whole.events.filter((event) => event.type === "interpretation").length).toBeGreaterThan(0);

		const resumed = await play({}, { resume: snapshot });
		const markers = 1 + snapshot.agents;
		expect(resumed.events.slice(0, cut)).toEqual(snapshot.events);
		expect(resumed.events[cut]).toMatchObject({ type: "run_resumed", seq: cut + 1, snapshot: "snapshot-L7.json", level: 7, round: snapshot.round });
		expect(resumed.events.slice(cut + 1, cut + markers).map((event) => event.type)).toEqual(Array.from({ length: snapshot.agents }, () => "agent_profile"));

		const after = comparable(resumed.events.slice(cut + markers), markers, cut);
		expect(after.length).toBeGreaterThan(200);
		expect(after).toEqual(comparable(whole.events.slice(cut)));
		expect(whole.events.at(-1)?.type).toBe("run_end");
	}, 60_000);

	it("holds whoever passes level 7 at the door until everyone has, then lets them all in at the next round", async () => {
		const held = await play({}, { snapshotAfter: 7 });
		const snapshot = held.snapshot;
		if (snapshot === undefined) throw new Error("no snapshot was taken");
		const events = held.events;
		const passes = events.filter((event) => event.type === "level_up" && event.from === 7);
		expect(passes.map((event) => (event.type === "level_up" ? event.agent : "")).sort()).toEqual(snapshot.world.competitors.map((entry) => entry.agent));
		const lastPass = Math.max(...passes.map((event) => event.seq));
		const firstPass = Math.min(...passes.map((event) => event.seq));
		// Somebody waited at the door for minutes.
		expect(Math.min(...passes.map((event) => event.minute))).toBeLessThan(snapshot.minute - 1);

		// Passing pays and gives a receipt as usual, with a city notice about the door, and no level 8 yet.
		const receipts = snapshot.world.receipts.filter((receipt) => receipt.kind === "levelUp" && receipt.level === 7);
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
		const first = await play({}, { snapshotAfter: 7, stop: true });
		const snapshot = first.snapshot;
		if (snapshot === undefined) throw new Error("no snapshot was taken");
		const resumed = await play({}, { resume: snapshot, story: changedWall });
		const own = resumed.events.slice(snapshot.events.length);
		const deal = own.find((event) => event.type === "factors_dealt" && event.level === 8);
		expect(deal?.type === "factors_dealt" ? deal.digits : undefined).toBe(4);
		expect(own.some((event) => event.type === "turn_input" && event.inputs.some((text) => text.includes("Level 8: The new wall (reward +33)")))).toBe(true);
		expect(own.some((event) => event.type === "director_action" && event.rule === "courier-8")).toBe(true);
		expect(own.some((event) => event.type === "level_up" && event.from === 8)).toBe(true);
	}, 60_000);

	it("holds a resumed run at its own, later door and snapshots there again", async () => {
		const first = await play({}, { snapshotAfter: 7, stop: true });
		const snapshot = first.snapshot;
		if (snapshot === undefined) throw new Error("no snapshot was taken");
		const second = (await play({}, { resume: snapshot, snapshotAfter: 8, stop: true })).snapshot;
		expect(second?.world.door).toBe(8);
		expect(second?.world.competitors.every((entry) => entry.level === 8 && entry.held)).toBe(true);
		expect(second?.world.levels.map((entry) => entry.level)).not.toContain(9);
		expect(second?.events.slice(0, snapshot.events.length)).toEqual(snapshot.events);
		await expect(play({}, { resume: snapshot, snapshotAfter: 7 })).rejects.toThrow(/a new snapshot needs a later level/);
	}, 60_000);

	it("refuses a snapshot that does not fit the run", async () => {
		const first = await play({}, { snapshotAfter: 7, stop: true });
		const snapshot = first.snapshot;
		if (snapshot === undefined) throw new Error("no snapshot was taken");
		expect(() => resumeOverrides(snapshot, { seed: 8 })).toThrow(/seed 7; this run asks for seed 8/);
		expect(() => resumeOverrides(snapshot, { agents: 12 })).toThrow(/6 agents; this run asks for 12/);
		expect(() => resumeOverrides(snapshot, { level: 8 })).toThrow(SnapshotError);
		await expect(play({ minutes: snapshot.round }, { resume: snapshot })).rejects.toThrow(/--minutes must be greater than/);
		const otherStory = { ...snapshot, story: "atlantis" };
		await expect(play({}, { resume: otherStory })).rejects.toThrow(/story "atlantis" \(this run: "nexus"\)/);
	}, 60_000);
});
