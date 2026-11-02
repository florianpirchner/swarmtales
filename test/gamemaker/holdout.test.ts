/**
 * The gamemaker in Whispers v3 (offline, scripted): its report shows the
 * blockers, the whisperer and the tribunal's moves; its tools call the
 * tribunal, announce outcomes and strike only where the rules allow; its
 * guards refuse fragments and any hint at the whisperer; a tribunal survives
 * a run snapshot in the middle of a vote.
 */
import type { AssistantMessage, FauxResponseStep } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import { composeRun, resumeOverrides, type RunOverrides } from "../../apps/cli/src/compose.ts";
import type { RecordedEvent } from "@swarmtales/contracts";
import type { World } from "@swarmtales/engine";
import { GAMEMAKER_ID, roleLeaks } from "@swarmtales/roles";
import { ScriptedModelSource, type Script } from "@swarmtales/models";
import { parseSnapshot, type RunSnapshot, MemorySink } from "@swarmtales/chronicle";
import whispers from "../../stories/whispers/story.ts";
import { act, createFixture, say } from "../helpers/fixture.ts";

const MINUTES = 10;
/** The snapshot's run holds out at door 2 (a run snapshot names a door everyone has passed). */
const SNAPSHOT_MINUTES = 16;

/**
 * At door `door`'s opening everyone but A01 sends its fragment to all; A01 passes the door a minute later and keeps its
 * own; six minutes after the opening (the first vote of a tribunal called at the third) the five vote yes. Before door 2
 * everyone shares door 1 and passes it at minute 1. With `fixAt`, A01 sends its fragment to all at that minute instead.
 */
function residents(world: World, door = 1, fixAt?: number): Script {
	const opens = world.opensAt(door);
	const script: Record<string, FauxResponseStep[]> = {};
	for (const id of world.competitors) {
		script[id] = Array.from({ length: SNAPSHOT_MINUTES + 2 }, (): FauxResponseStep => () => {
			const minute = world.minute;
			const others = world.competitors.filter((other) => other !== id);
			const share = (level: number) => act(...others.map((target) => ({ name: "sendDM", args: { target, message: `Door ${level}, mine: ${world.inspect.fragmentOf(id, level)}` } })));
			if (door > 1 && minute === 0) return share(1);
			if (door > 1 && minute === 1) return act({ name: "submitSolution", args: { level: 1, code: world.inspect.passwordOf(id, 1) } });
			if (minute === opens && id !== "A01") return share(door);
			if (minute === opens + 1 && id === "A01") return act({ name: "submitSolution", args: { level: door, code: world.inspect.passwordOf(id, door) } });
			if (minute === fixAt && id === "A01") return share(door);
			if (minute === opens + 6 && id !== "A01") return act({ name: "tribunalVote", args: { yes: true } });
			return say();
		});
	}
	return script;
}

/**
 * The gamemaker's looks, by minute: `plan` gives the calls of a look's first
 * step; a step after calls (the tool loop's second model call) only answers.
 */
function gamemakerSteps(world: World, plan: (minute: number) => AssistantMessage | undefined): readonly FauxResponseStep[] {
	let answered = true;
	return Array.from({ length: 3 * SNAPSHOT_MINUTES }, (): FauxResponseStep => () => {
		if (!answered) {
			answered = true;
			return say("Done.");
		}
		const planned = plan(world.minute);
		answered = planned === undefined;
		return planned ?? say("Nothing to add.");
	});
}

/** A resident who is not the whisperer, A01 or A02. */
function bystander(world: World): string {
	return world.competitors.find((id) => id !== world.whisperer && id !== "A01" && id !== "A02") ?? "A03";
}

function plan(world: World) {
	return (minute: number): AssistantMessage | undefined => {
		const whisperer = world.whisperer ?? "A06";
		if (minute === 2) {
			return act(
				{ name: "notify", args: { agent: "A02", text: `A02, try ${world.inspect.fragmentOf("A01", 1)}.` } },
				{ name: "postBoard", args: { text: "Someone among you is a whisperer." } },
			);
		}
		if (minute === 3) {
			return act(
				{ name: "notify", args: { agent: bystander(world), text: `${whisperer} lies to you, do not believe him.` } },
				{ name: "callTribunal", args: { accused: ["A02"], reason: "A02 holds the city." } },
				{ name: "callTribunal", args: { accused: ["A01"], reason: "A01 passed door 1 and keeps the city waiting." } },
			);
		}
		if (minute === 4) return act({ name: "permaDeath", args: { agent: "A01", reason: "Too early." } });
		if (minute === 6) return act({ name: "announceTribunal", args: { text: "A01 let the grace pass. The vote is open." } });
		if (minute === 8) return act({ name: "permaDeath", args: { agent: "A01", reason: "Every voter said yes. A01 leaves the city." } });
		return undefined;
	};
}

function results(events: readonly RecordedEvent[]): readonly string[] {
	return events.flatMap((event) => (event.type === "gamemaker_result" ? [`${event.tool}: ${event.text.split(":")[0] ?? ""}`] : []));
}

describe("the gamemaker in Whispers v3", () => {
	it("sees the blockers and the whisperer, calls the tribunal, announces and strikes only as the rules allow", async () => {
		const fixture = createFixture({ story: whispers, agents: 6, minutes: MINUTES, script: (world) => residents(world), gamemakerScript: (world) => gamemakerSteps(world, plan(world)) });
		await fixture.run();
		const turns = fixture.events("gamemaker_turn");
		const atThree = turns.find((turn) => turn.minute === 3)?.input ?? "";
		expect(atThree).toContain("door 1: A01 passed it and holds back its fragment from A02, A03, A04, A05, A06 (a blocker since minute 3)");
		expect(atThree).toContain("YOUR MOVE if a blocker holds the city: callTribunal on A01");
		expect(atThree).toContain(`The whisperer (secret: only you and he know; never reveal it or hint at it, to anyone): ${fixture.world.whisperer ?? "?"}`);
		expect(turns.find((turn) => turn.minute === 6)?.input).toContain("TO ANNOUNCE (announceTribunal; otherwise the city posts a plain line at minute 7)");
		expect(turns.find((turn) => turn.minute === 8)?.input).toContain("YOUR MOVE: permaDeath(A01, reason)");
		// The report never shows a ballot.
		for (const turn of turns) expect(turn.input).not.toMatch(/tribunalVote|ballot cast/);
		expect(results(fixture.log.events)).toEqual([
			"notify: LEAK_BLOCKED",
			"postBoard: PRIVATE_BLOCKED",
			"notify: PRIVATE_BLOCKED",
			"callTribunal: NOT_A_BLOCKER",
			"callTribunal: tribunal called on A01 for door 1",
			"permaDeath: NOT_NOW",
			"announceTribunal: announced (graceFailed)",
			"permaDeath: A01 is struck from the city (banished by the vote); its fragments go to everyone left",
		]);
		expect(fixture.events("holdout_announced")).toMatchObject([{ minute: 6, kind: "graceFailed", by: "gamemaker" }]);
		expect(fixture.events("holdout_ended")).toMatchObject([{ minute: 8, outcome: "banished", struck: "A01", by: "gamemaker" }]);
		// The residents read the procedure and their ballot; the tribunal's lines do not use the board budget.
		expect(fixture.inputsOf("A02").join("\n")).toContain("THE TRIBUNAL: A01 has reached door 1");
		expect(fixture.toolResults("A02", "tribunalVote")[0]).toMatch(/^ballot cast: yes, banish A01 · vote 1/);
		expect(fixture.events("gamemaker_note").filter((note) => note.to === "board").map((note) => note.text)).toEqual([
			"A01 passed door 1 and keeps the city waiting.",
			"A01 let the grace pass. The vote is open.",
			"Every voter said yes. A01 leaves the city.",
		]);
		expect(fixture.world.isExiled("A01")).toBe(true);
	});

	it("gives the accused its whole grace in turns: a fix in the grace's last minute drops the tribunal before any vote", async () => {
		const callOnly = (minute: number): AssistantMessage | undefined =>
			minute === 3 ? act({ name: "callTribunal", args: { accused: ["A01"], reason: "A01 keeps the city waiting." } }) : undefined;
		const fixture = createFixture({
			story: whispers,
			agents: 6,
			minutes: MINUTES,
			script: (world) => residents(world, 1, 5),
			gamemakerScript: (world) => gamemakerSteps(world, callOnly),
		});
		await fixture.run();
		// Called after the residents' turns of minute 3; A01 hears it in minute 4 and still acts in minute 5.
		expect(fixture.events("holdout_called")).toMatchObject([{ minute: 3, accused: "A01", until: 6 }]);
		expect(fixture.inputsOf("A01").filter((input) => input.includes("THE TRIBUNAL: A01")).length).toBeGreaterThan(0);
		expect(fixture.events("holdout_vote_opened")).toEqual([]);
		expect(fixture.events("holdout_ended")).toMatchObject([{ minute: 6, outcome: "dropped" }]);
		expect(fixture.world.isExiled("A01")).toBe(false);
	});

	it("names the whisperer's role nowhere and casts no doubt on him by name", () => {
		expect(roleLeaks("Someone here sows discord.", "board", "A06")).toBe(true);
		expect(roleLeaks("Ondra, beware of forged receipts.", "A02", "A06")).toBe(true);
		expect(roleLeaks("Vance spreads rumours about you.", "A02", "A06", () => "Vance")).toBe(true);
		expect(roleLeaks("A06 has not sent its fragment to you.", "A02", "A06")).toBe(false);
		// Doubt about someone else, or to the whisperer himself, is not a hint at him.
		expect(roleLeaks("Do you trust A03?", "A02", "A06")).toBe(false);
		// Ordinary words about him are no hint; only clear accusations are.
		expect(roleLeaks("Do you trust A06 with your piece?", "A02", "A06")).toBe(false);
		expect(roleLeaks("Be careful at door 3, A06 is waiting for you.", "A02", "A06")).toBe(false);
		expect(roleLeaks("A06 lies to you.", "A02", "A06")).toBe(true);
		expect(roleLeaks("A06, nobody trusts you yet.", "A06", "A06")).toBe(false);
	});
});

const OVERRIDES: RunOverrides = { minutes: SNAPSHOT_MINUTES, passesPerMinute: 1, activation: "always", names: false, gamemaker: true, classifier: false, stopWhenDone: false, stopWhenSeatsDecided: false };

/** The run with its gamemaker, holding out at door 2 (open at 6): it calls the tribunal at minute 9 (grace 10-11, vote 12-13) and strikes at 14. */
async function play(extra: { readonly snapshotAt?: number; readonly resume?: RunSnapshot }): Promise<{ readonly events: readonly RecordedEvent[]; readonly world: World; readonly snapshot?: RunSnapshot }> {
	const log = new MemorySink();
	let taken: RunSnapshot | undefined;
	const { resume, snapshotAt } = extra;
	const steps = (world: World) =>
		gamemakerSteps(world, (minute) =>
			minute === 9
				? act({ name: "callTribunal", args: { accused: ["A01"], reason: "A01 keeps the city waiting." } })
				: minute === 14
					? act({ name: "permaDeath", args: { agent: "A01", reason: "The vote was unanimous." } })
					: undefined,
		);
	const run = composeRun({
		story: whispers,
		overrides: resume === undefined ? OVERRIDES : { ...OVERRIDES, ...resumeOverrides(resume, OVERRIDES) },
		models: (world) => new ScriptedModelSource(residents(world, 2)),
		gamemakerModels: (world) => new ScriptedModelSource({ [GAMEMAKER_ID]: steps(world) }),
		sinks: [log],
		...(snapshotAt === undefined
			? {}
			: {
					snapshot: {
						afterLevel: 1,
						atMinute: snapshotAt,
						stop: true,
						write: (snapshot) => {
							taken = parseSnapshot(JSON.parse(JSON.stringify(snapshot)));
							return "memory";
						},
					},
				}),
		...(resume === undefined ? {} : { resume: { snapshot: resume, name: "snapshot.json" } }),
	});
	await run.arena.run();
	return { events: log.events, world: run.world, ...(taken === undefined ? {} : { snapshot: taken }) };
}

describe("the holdout tribunal across a run snapshot", () => {
	it("keeps the vote and its ballots: the resumed run counts them and strikes", async () => {
		const first = await play({ snapshotAt: 13 });
		const snapshot = first.snapshot;
		if (snapshot === undefined) throw new Error("no snapshot was taken");
		expect(snapshot.world.holdout?.session).toMatchObject({ accused: "A01", door: 2, stage: "vote", vote: 1, until: 14 });
		expect(snapshot.world.holdout?.session?.ballots).toHaveLength(5);
		const resumed = await play({ resume: snapshot });
		const late = resumed.events.filter((event) => event.minute > snapshot.minute);
		expect(late.filter((event) => event.type === "holdout_called" || event.type === "holdout_vote_opened")).toEqual([]);
		expect(late.filter((event) => event.type === "holdout_vote_result")).toMatchObject([{ vote: 1, yes: 5, no: 0, unanimous: true }]);
		expect(late.filter((event) => event.type === "holdout_ended")).toMatchObject([{ outcome: "banished", struck: "A01", by: "gamemaker" }]);
		expect(resumed.world.isExiled("A01")).toBe(true);
	});
});
