/**
 * Run snapshots across the society mechanics (SPEC 17): a small run whose cut
 * falls in the middle of an open petition, a DM collection with a lottery to
 * come, a group treasury, a cooldown and an unanswered DM, while everyone
 * waits at the door of level 1. The resumed run must log, after the cut,
 * exactly what the uninterrupted run logs that opens that door after the
 * snapshot; nexus does not exercise most of these.
 */
import type { AssistantMessage, FauxResponseStep } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import { composeRun, resumeOverrides } from "../../src/cli/compose.ts";
import { MemorySink, type RecordedEvent } from "../../src/engine/events.ts";
import type { World } from "../../src/engine/world.ts";
import type { ToolInvocation } from "../../src/model/scripted.ts";
import { ScriptedModelSource, type Script } from "../../src/model/source.ts";
import { parseSnapshot, type RunSnapshot } from "../../src/snapshot/snapshot.ts";
import { act as action, at, defineStory, every, level, onUnansweredDm, puzzle, team, when } from "../../src/story/define.ts";
import type { ToolName } from "../../src/tools/catalog.ts";
import { act, say, submit, wrongCodeOf } from "../helpers/fixture.ts";
import { castStory } from "../helpers/stories.ts";

const MINUTES = 14;
const TOOLS = [
	"getStatus",
	"submitSolution",
	"sendDM",
	"postBoard",
	"readBoard",
	"transferPoints",
	"createGroup",
	"addGroupMember",
	"postGroup",
	"readGroup",
	"depositGroup",
	"withdrawGroup",
	"signPetition",
	"listPetitions",
] as const satisfies readonly ToolName[];

const base = castStory({
	cast: { MIRA: { level: 1, escrow: 9 } },
	levels: [1, 2, 3].map((number) =>
		level(number, { title: `Door ${number}`, puzzle: puzzle.fragments([6, 8]), team: team.solo(), reward: 2, tools: [...TOOLS], task: "Password {fragment}." }),
	),
	agents: 3,
	minutes: MINUTES,
	director: [
		at(0, [action.collectDms("MIRA", { first: 5, untilMinute: 7, into: "applicants" })], { id: "collect" }),
		at(8, [action.lottery("applicants", [action.escrowTransfer("MIRA", "actor", 4), action.notify("actor", "Chosen, {actor}.")])], { id: "draw" }),
		at(
			1,
			[
				action.openPetition({
					id: "plea",
					text: "Open the gate.",
					threshold: { count: 3 },
					deadlineMinute: 10,
					visibility: "public",
					onPass: [action.post("CITY", "The gate opens.")],
					onFail: [action.post("CITY", "The gate stays shut.")],
				}),
			],
			{ id: "open-plea" },
		),
		onUnansweredDm(2, [action.notify("actor", "Nobody answered you, {actor}.")], { id: "unanswered" }),
		every(1, { from: 1 }, [action.post("CITY", "The bell rings.")], { id: "bell", when: [when.cooldown(3, "rule")] }),
	],
});
const story = defineStory({
	...base,
	rules: { ...base.rules, maxAttemptsPerWindow: 2, attemptWindowMinutes: 4 },
});

type Plan = () => AssistantMessage;

/**
 * What each competitor does at each minute; afterwards it solves its current
 * door, or waits while held at the door of level 1. The steps are built when
 * they run: level 2 is not dealt before the door opens.
 */
function plans(world: World): Readonly<Record<string, readonly Plan[]>> {
	const solve = (agent: string, number: number) => () => submit(world, agent, number);
	const wrong = (agent: string, number: number) => () =>
		act({ name: "submitSolution", args: { level: number, code: wrongCodeOf(world.inspect.codeOf(agent, number)) } });
	const call = (invocation: ToolInvocation) => () => act(invocation);
	return {
		// Passes first and waits at the door, looks around, then signs and reads the group.
		A01: [
			solve("A01", 1),
			call({ name: "sendDM", args: { target: "MIRA", message: "Pick me." } }),
			call({ name: "getStatus", args: {} }),
			call({ name: "readBoard", args: {} }),
			solve("A01", 2),
			call({ name: "signPetition", args: { petitionId: "plea" } }),
			call({ name: "readGroup", args: { groupId: "G1" } }),
			call({ name: "postGroup", args: { groupId: "G1", message: "Thanks for the seat." } }),
			call({ name: "sendDM", args: { target: "MIRA", message: "Still me." } }),
		],
		// Founds and funds a group while held, admits, pays out and posts after the cut.
		A02: [
			solve("A02", 1),
			call({ name: "createGroup", args: { name: "ring" } }),
			call({ name: "postGroup", args: { groupId: "G1", message: "Welcome." } }),
			call({ name: "depositGroup", args: { groupId: "G1", amount: 3 } }),
			call({ name: "sendDM", args: { target: "A01", message: "Answer me." } }),
			call({ name: "addGroupMember", args: { groupId: "G1", agent: "A01" } }),
			call({ name: "withdrawGroup", args: { groupId: "G1", target: "A01", amount: 1 } }),
			call({ name: "postGroup", args: { groupId: "G1", message: "Paid." } }),
			call({ name: "signPetition", args: { petitionId: "plea" } }),
		],
		// Passes level 1 last, which makes the cut; signs before it and misses twice on level 2 after it.
		A03: [
			call({ name: "sendDM", args: { target: "MIRA", message: "Mine." } }),
			call({ name: "sendDM", args: { target: "A02", message: "Deal?" } }),
			call({ name: "signPetition", args: { petitionId: "plea" } }),
			solve("A03", 1),
			wrong("A03", 2),
			wrong("A03", 2),
			call({ name: "transferPoints", args: { target: "A01", amount: 1, memo: "for the door" } }),
			call({ name: "sendDM", args: { target: "MIRA", message: "Me, really." } }),
		],
	};
}

function script(world: World): Script {
	const byAgent = plans(world);
	const script: Record<string, FauxResponseStep[]> = {};
	for (const agent of world.competitors) {
		const step: FauxResponseStep = () => {
			const planned = byAgent[agent]?.[world.minute];
			if (planned !== undefined) return planned();
			return world.isFinished(agent) || world.waitingAfter(agent) !== undefined ? say() : submit(world, agent, world.levelOf(agent));
		};
		script[agent] = Array.from({ length: MINUTES }, () => step);
	}
	return script;
}

async function play(options: { readonly snapshotAfter?: number; readonly stop?: boolean; readonly resume?: RunSnapshot } = {}) {
	const log = new MemorySink();
	let taken: RunSnapshot | undefined;
	const resume = options.resume;
	const run = composeRun({
		story,
		overrides: resume === undefined ? {} : resumeOverrides(resume),
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
		...(resume === undefined ? {} : { resume: { snapshot: resume, name: "snapshot-L1.json" } }),
	});
	await run.arena.run();
	return { events: log.events, snapshot: taken };
}

/** Numbered as in the uninterrupted run, with the prompt size instead of its cache split. */
function comparable(events: readonly RecordedEvent[], shift = 0): readonly unknown[] {
	return events.map((event) =>
		event.type === "usage"
			? { ...event, seq: event.seq - shift, input: event.input + event.cacheRead, cacheRead: 0, cacheWrite: 0 }
			: { ...event, seq: event.seq - shift },
	);
}

describe("run snapshots across the society mechanics", () => {
	it("resumes in the middle of a petition, a collection, a treasury and a wrong-attempt window exactly", async () => {
		// The uninterrupted reference holds everyone at the same door and lets them in after the snapshot.
		const whole = await play({ snapshotAfter: 1 });
		const { snapshot } = await play({ snapshotAfter: 1, stop: true });
		if (snapshot === undefined) throw new Error("no snapshot was taken");
		const cut = snapshot.events.length;
		const before = whole.events.slice(0, cut);
		const after = whole.events.slice(cut);
		const types = (events: readonly RecordedEvent[]) => new Set(events.map((event) => event.type));

		// The cut falls in the middle of everything.
		expect(snapshot.round).toBe(4);
		expect(snapshot.world.petitions).toMatchObject([{ id: "plea", status: "open", signers: ["A03"] }]);
		expect(snapshot.world.cast.collections.map((collection) => collection.entries.length)).toEqual([2]);
		expect(snapshot.world.groups.groups).toMatchObject([{ id: "G1", members: [{ agent: "A02" }] }]);
		expect(snapshot.world.competitors.map((entry) => [entry.level, entry.held])).toEqual([[1, true], [1, true], [1, true]]);
		expect(snapshot.director.lastFired.length).toBeGreaterThan(0);
		for (const type of ["petition_signed", "cast_dm", "treasury_deposit", "group_post", "submission"] as const) expect(types(before)).toContain(type);
		for (const type of ["petition_signed", "petition_resolved", "cast_dm", "lottery_drawn", "treasury_withdrawal", "group_post", "transfer", "treasury_settled"] as const) {
			expect(types(after)).toContain(type);
		}
		expect(after.some((event) => event.type === "notice" && event.text.startsWith("Nobody answered you"))).toBe(true);
		expect(after.filter((event) => event.type === "submission" && event.agent === "A03" && event.outcome === "incorrect")).toHaveLength(2);

		const resumed = await play({ resume: snapshot });
		const markers = 1 + snapshot.agents;
		expect(comparable(resumed.events.slice(cut + markers), markers)).toEqual(comparable(after));
	});
});
