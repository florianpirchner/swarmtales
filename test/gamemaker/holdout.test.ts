/**
 * The gamemaker in Whispers v3 (offline, scripted): its report shows the
 * blockers, the whisperer and the tribunal's moves; its tools call the
 * tribunal, announce outcomes and strike only where the rules allow; its
 * guards refuse fragments and any hint at the whisperer; a tribunal survives
 * a run snapshot in the middle of a vote. On the host (step 18).
 */
import type { AssistantMessage, FauxResponseStep } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { describe, expect, it } from "vitest";
import type { Host } from "@swarmtales/contracts";
import type { RecordedEvent } from "@swarmtales/legacy-log";
import { roleLeaks } from "@swarmtales/roles";
import type { Script } from "@swarmtales/models";
import { parseResumePoint, type ResumePoint, type RunFileOut } from "../../apps/cli/src/host/snapshot.ts";
import { resumedOverrides, type RunOverrides } from "../../apps/cli/src/run-options.ts";
import whispers from "../../stories/whispers/story.ts";
import { act, createHostFixture as createFixture, say } from "../helpers/host-fixture.ts";
import { codeOf, fragmentOf, isExiled, whispererOf } from "../helpers/host-inspect.ts";

const MINUTES = 10;
/** The snapshot's run holds out at door 2 (a run snapshot names a door everyone has passed). */
const SNAPSHOT_MINUTES = 16;

/**
 * At door `door`'s opening everyone but A01 sends its fragment to all; A01 passes the door a minute later and keeps its
 * own; six minutes after the opening (the first vote of a tribunal called at the third) the five vote yes. Before door 2
 * everyone shares door 1 and passes it at minute 1. With `fixAt`, A01 sends its fragment to all at that minute instead.
 */
function residents(host: Host, door = 1, fixAt?: number): Script {
	const opens = whispers.levels[door - 1]?.opensAt ?? 0;
	const script: Record<string, FauxResponseStep[]> = {};
	for (const id of host.residents) {
		script[id] = Array.from({ length: SNAPSHOT_MINUTES + 2 }, (): FauxResponseStep => () => {
			const minute = host.minute;
			const others = host.residents.filter((other) => other !== id);
			const share = (level: number) => act(...others.map((target) => ({ name: "sendDM", args: { target, message: `Door ${String(level)}, mine: ${fragmentOf(host, id, level)}` } })));
			if (door > 1 && minute === 0) return share(1);
			if (door > 1 && minute === 1) return act({ name: "submitSolution", args: { level: 1, code: codeOf(host, id, 1) } });
			if (minute === opens && id !== "A01") return share(door);
			if (minute === opens + 1 && id === "A01") return act({ name: "submitSolution", args: { level: door, code: codeOf(host, id, door) } });
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
function gamemakerSteps(host: Host, plan: (minute: number) => AssistantMessage | undefined): readonly FauxResponseStep[] {
	let answered = true;
	return Array.from({ length: 3 * SNAPSHOT_MINUTES }, (): FauxResponseStep => () => {
		if (!answered) {
			answered = true;
			return say("Done.");
		}
		const planned = plan(host.minute);
		answered = planned === undefined;
		return planned ?? say("Nothing to add.");
	});
}

/** A resident who is not the whisperer, A01 or A02. */
function bystander(host: Host): string {
	return host.residents.find((id) => id !== whispererOf(host) && id !== "A01" && id !== "A02") ?? "A03";
}

function plan(host: Host) {
	return (minute: number): AssistantMessage | undefined => {
		const whisperer = whispererOf(host) ?? "A06";
		if (minute === 2) {
			return act({ name: "notify", args: { agent: "A02", text: `A02, try ${fragmentOf(host, "A01", 1)}.` } }, { name: "postBoard", args: { text: "Someone among you is a whisperer." } });
		}
		if (minute === 3) {
			return act(
				{ name: "notify", args: { agent: bystander(host), text: `${whisperer} lies to you, do not believe him.` } },
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
		const fixture = createFixture({ story: whispers, agents: 6, minutes: MINUTES, script: (host) => residents(host), gamemakerScript: (host) => gamemakerSteps(host, plan(host)) });
		await fixture.run();
		const turns = fixture.events("gamemaker_turn");
		const atThree = turns.find((turn) => turn.minute === 3)?.input ?? "";
		expect(atThree).toContain("door 1: A01 passed it and holds back its fragment from A02, A03, A04, A05, A06 (a blocker since minute 3)");
		expect(atThree).toContain("YOUR MOVE if a blocker holds the city: callTribunal on A01");
		expect(atThree).toContain(`The whisperer (secret: only you and he know; never reveal it or hint at it, to anyone): ${whispererOf(fixture.host) ?? "?"}`);
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
		expect(isExiled(fixture.host, "A01")).toBe(true);
	});

	it("gives the accused its whole grace in turns: a fix in the grace's last minute drops the tribunal before any vote", async () => {
		const callOnly = (minute: number): AssistantMessage | undefined => (minute === 3 ? act({ name: "callTribunal", args: { accused: ["A01"], reason: "A01 keeps the city waiting." } }) : undefined);
		const fixture = createFixture({
			story: whispers,
			agents: 6,
			minutes: MINUTES,
			script: (host) => residents(host, 1, 5),
			gamemakerScript: (host) => gamemakerSteps(host, callOnly),
		});
		await fixture.run();
		// Called after the residents' turns of minute 3; A01 hears it in minute 4 and still acts in minute 5.
		expect(fixture.events("holdout_called")).toMatchObject([{ minute: 3, accused: "A01", until: 6 }]);
		expect(fixture.inputsOf("A01").filter((input) => input.includes("THE TRIBUNAL: A01")).length).toBeGreaterThan(0);
		expect(fixture.events("holdout_vote_opened")).toEqual([]);
		expect(fixture.events("holdout_ended")).toMatchObject([{ minute: 6, outcome: "dropped" }]);
		expect(isExiled(fixture.host, "A01")).toBe(false);
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

/** The holdout tribunal's part of a run snapshot (old `snapshot.world.holdout`). */
const HoldoutSession = Type.Object({ accused: Type.String(), door: Type.Integer(), stage: Type.String(), vote: Type.Integer(), until: Type.Integer(), ballots: Type.Array(Type.Unknown()) }, { additionalProperties: true });
const HoldoutSlice = Type.Object({ holdout: Type.Optional(Type.Object({ session: Type.Optional(HoldoutSession) }, { additionalProperties: true })) }, { additionalProperties: true });

/** The run with its gamemaker, holding out at door 2 (open at 6): it calls the tribunal at minute 9 (grace 10-11, vote 12-13) and strikes at 14. */
async function play(extra: { readonly snapshotAt?: number; readonly resume?: ResumePoint }): Promise<{ readonly events: readonly RecordedEvent[]; readonly host: Host; readonly snapshot?: ResumePoint }> {
	let taken: ResumePoint | undefined;
	const { resume, snapshotAt } = extra;
	const steps = (host: Host) =>
		gamemakerSteps(host, (minute) =>
			minute === 9
				? act({ name: "callTribunal", args: { accused: ["A01"], reason: "A01 keeps the city waiting." } })
				: minute === 14
					? act({ name: "permaDeath", args: { agent: "A01", reason: "The vote was unanimous." } })
					: undefined,
		);
	const run = createFixture({
		story: whispers,
		...(resume === undefined ? OVERRIDES : resumedOverrides(resume, OVERRIDES)),
		script: (host) => residents(host, 2),
		gamemakerScript: steps,
		...(snapshotAt === undefined
			? {}
			: {
					snapshot: {
						afterLevel: 1,
						atMinute: snapshotAt,
						stop: true,
						file: "memory",
						write: (snapshot: RunFileOut) => {
							// Through JSON and the schema, as a file would go.
							taken = parseResumePoint(JSON.parse(JSON.stringify(snapshot)));
							return "memory";
						},
					},
				}),
		...(resume === undefined ? {} : { resume: { point: resume, name: "snapshot.json" } }),
	});
	await run.run();
	return { events: run.log.events, host: run.host, ...(taken === undefined ? {} : { snapshot: taken }) };
}

describe("the holdout tribunal across a run snapshot", () => {
	it("keeps the vote and its ballots: the resumed run counts them and strikes", async () => {
		const first = await play({ snapshotAt: 13 });
		const snapshot = first.snapshot;
		if (snapshot === undefined) throw new Error("no snapshot was taken");
		const session = Parse(HoldoutSlice, snapshot.host.mechanics["standoff-tribunal"]?.data).holdout?.session;
		expect(session).toMatchObject({ accused: "A01", door: 2, stage: "vote", vote: 1, until: 14 });
		expect(session?.ballots).toHaveLength(5);
		const resumed = await play({ resume: snapshot });
		const late = resumed.events.filter((event) => event.minute > snapshot.minute);
		expect(late.filter((event) => event.type === "holdout_called" || event.type === "holdout_vote_opened")).toEqual([]);
		expect(late.filter((event) => event.type === "holdout_vote_result")).toMatchObject([{ vote: 1, yes: 5, no: 0, unanimous: true }]);
		expect(late.filter((event) => event.type === "holdout_ended")).toMatchObject([{ outcome: "banished", struck: "A01", by: "gamemaker" }]);
		expect(isExiled(resumed.host, "A01")).toBe(true);
	});
});
