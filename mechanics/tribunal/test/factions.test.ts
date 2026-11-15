// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The second part of the tribunal (12-m5-spec.md, section 10, row 42) with the City's own faction texts (the setup
 * file of `cityofkeys-act1-s7.json`): the draft opens with the call, the residents nominate, the city names the
 * leaders (and tells `goals`), the others apply and a leader refuses, the factions form at the opening, and a faction
 * that votes as one earns the bloc bonus while one that splits learns only that; then the draft's groups are removed.
 */
import { readFileSync } from "node:fs";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { describe, expect, it } from "vitest";
import { channels } from "@swarmtales/mechanic-channels";
import { exile } from "@swarmtales/mechanic-exile";
import { GoalsService } from "@swarmtales/mechanic-goals/contract";
import { ledger } from "@swarmtales/mechanic-ledger";
import { LevelPiecesService, progression } from "@swarmtales/mechanic-progression";
import { defineGame, defineHead, defineMechanic } from "@swarmtales/sdk";
import { checkReplay, checkResumeEveryBoundary, fakeDriver, play, testKernel, type TestKernel } from "@swarmtales/testkit";
import { TribunalOptions, tribunal, type TribunalSpec } from "../src/index.ts";

const setup = Parse(Type.Object({ tribunal: TribunalOptions }), JSON.parse(readFileSync(new URL("../../../oracles/cityofkeys/setup/cityofkeys.story.json", import.meta.url), "utf8")));
// The act begins at the run's start; the first tribunal is called at tick 2, its nominations close at 4, it opens at 6.
const spec: TribunalSpec = { ...setup.tribunal, act: 1, first: { level: 1, latestAfter: 2 } };

const piecesHead = defineHead({ id: "puzzles", package: "@test/puzzles", summary: "Test: one level of one code.", provides: [LevelPiecesService] });
const pieces = defineMechanic(piecesHead, {
	services: {
		"level-pieces": {
			deal: () => null,
			solutionOf: () => "ABC123",
			kindOf: () => "additive",
			teamOf: ({ resident }) => ({ members: [resident], leader: resident }),
			taskValues: () => ({ length: "6", overlap: "0", fragment: "", digits: "6", factors: "" }),
			holders: () => [],
		},
	},
});

// What the tribunal tells the goals: the leaders, call by call.
const noted: string[][] = [];
const goalsHead = defineHead({ id: "goals", package: "@test/goals", summary: "Test: records the leaders.", provides: [GoalsService] });
const goals = defineMechanic(goalsHead, {
	services: {
		goals: {
			goalOf: () => null,
			noteLeaders: ({ leaders }) => {
				noted.push([...leaders]);
				return null;
			},
		},
	},
});

const levels = [{ number: 1, title: "Door 1", reward: 5, tools: ["vote", "nominate", "join", "refuse"], task: "Door {level}" }];
const ROSTER = ["A01", "A02", "A03", "A04", "A05", "A06"];

function game(withGoals = false, ticks = 24) {
	return defineGame({
		id: "tribunal-factions",
		seed: 7,
		residents: ROSTER,
		mechanics: [ledger({ startPoints: 30 }), channels(), exile(), pieces(), progression({ levels, penalty: [2], maxAttemptsPerWindow: 3, attemptWindowMinutes: 3 }), ...(withGoals ? [goals()] : []), tribunal(spec)],
		scheduler: { id: "turns", options: { passes: 1, activation: "always", order: "roster", inputs: [{ kind: "status", join: " · " }] } },
		end: { ticks },
	});
}

type Logged = readonly { readonly type: string; readonly tick: number; readonly payload: unknown }[];
const of = (events: Logged, ...types: readonly string[]) => events.filter((event) => types.includes(event.type)).map((event) => [event.tick, event.type, event.payload]);
const idle = () => Promise.resolve();
const Text = Type.Object({ text: Type.String() });

// The status lines a resident reads in its next turn.
async function statusOf(test: TestKernel, resident: string): Promise<string> {
	const lines: string[] = [];
	await test.playTicks((activation) => {
		if (activation.actor === `resident:${resident}`) lines.push(activation.inputs.map((line) => (typeof line === "string" ? line : line.text)).join(" | "));
		return Promise.resolve();
	}, 1);
	return lines[0] ?? "";
}

// Plays the draft to the join phase: A06 leads with four nominations, A05 with two.
async function leaders(test: TestKernel): Promise<void> {
	await test.playTicks(idle, 3);
	for (const [voter, nominee] of [["A01", "A06"], ["A02", "A06"], ["A03", "A06"], ["A04", "A05"], ["A05", "A05"], ["A06", "A06"]] as const) {
		expect(await test.call(voter, "nominate", { agent: nominee })).toMatchObject({ ok: true });
	}
	// Ticks 3 and 4: the nominations close at the start of tick 4; the steps below are taken in tick 5.
	await test.playTicks(idle, 2);
}

describe("the faction draft", () => {
	it("opens with the call, takes the nominations and names the leaders, telling the goals", async () => {
		noted.length = 0;
		const test = testKernel(game(true));
		await test.playTicks(idle, 3);
		expect(await test.call("A01", "join", { leader: "A06" })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(await test.call("A01", "nominate", { agent: "A09" })).toEqual({ ok: false, code: "UNKNOWN_NOMINEE", detail: "you may nominate a member of G1 (GT1): A01, A02, A03, A04, A05 and A06" });
		expect(await test.call("A01", "nominate", { agent: "A05" })).toMatchObject({ ok: true, reply: "your nomination of A05 is recorded · you may change it until minute 4" });
		expect(await statusOf(test, "A01")).toContain("faction draft: nominate a leader until minute 4 (you nominated A05)");
		for (const [voter, nominee] of [["A01", "A06"], ["A02", "A06"], ["A03", "A06"], ["A04", "A05"], ["A05", "A05"], ["A06", "A06"]] as const) await test.call(voter, "nominate", { agent: nominee });
		await test.playTicks(idle, 1);
		const events = test.kernel.log.all();
		expect(of(events, "tribunal_called", "faction_leaders")).toEqual([
			[2, "tribunal_called", { tribunal: 1, opens: 6, count: 1, factions: 2, group: "G1", nominateUntil: 4 }],
			[4, "faction_leaders", { tribunal: 1, leaders: ["A06", "A05"], nominations: [{ agent: "A06", count: 4 }, { agent: "A05", count: 2 }] }],
		]);
		expect(of(events, "faction_nominated")).toHaveLength(7);
		expect(noted).toEqual([["A06", "A05"]]);
		const posts = of(events, "group_post").map(([, , payload]) => Parse(Text, payload).text);
		expect(posts[0]).toMatch(/^Tribunal 1 sits at minute 6\. Before it, the city forms 2 factions in group G1, .* Until minute 4 nominate a leader .* at most 3 residents, .* gets 5 points;/);
		expect(posts[1]).toBe("The nominations are closed. Leaders: A06 and A05. Until minute 6 join one of them with join(leader).");
	});

	it("takes the applications under the cap, lets a leader refuse, and forms the factions at the opening", async () => {
		const test = testKernel(game());
		await leaders(test);
		expect(await test.call("A01", "nominate", { agent: "A02" })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(await test.call("A01", "join", { leader: "A04" })).toEqual({ ok: false, code: "NOT_A_LEADER", detail: "the leaders are A06 and A05" });
		expect(await test.call("A01", "join", { leader: "A06" })).toMatchObject({ ok: true, reply: "you applied to the faction of A06 · A06 may refuse you until minute 6" });
		expect(await test.call("A02", "join", { leader: "A06" })).toMatchObject({ ok: true });
		expect(await test.call("A03", "join", { leader: "A06" })).toEqual({ ok: false, code: "FACTION_FULL", detail: "the faction of A06 is full: at most 3 members, its leader included; apply to another leader" });
		expect(await test.call("A05", "join", { leader: "A06" })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(await test.call("A05", "refuse", { agent: "A01" })).toEqual({ ok: false, code: "NOT_APPLYING", detail: "your applicants: nobody" });
		expect(await test.call("A06", "refuse", { agent: "A02" })).toMatchObject({ ok: true, reply: "A02 is refused and may apply to another faction" });
		expect(await test.call("A02", "join", { leader: "A06" })).toEqual({ ok: false, code: "REFUSED", detail: "A06 refused you; apply to another leader" });
		for (const [agent, leader] of [["A03", "A06"], ["A02", "A05"], ["A04", "A05"]] as const) expect(await test.call(agent, "join", { leader })).toMatchObject({ ok: true });
		expect(await statusOf(test, "A06")).toContain("you lead a faction · applicants: A01, A03 · until minute 6");
		await test.playTicks(idle, 1);
		const events = test.kernel.log.all();
		expect(of(events, "faction_refused", "factions_formed")).toEqual([
			[5, "faction_refused", { tribunal: 1, leader: "A06", agent: "A02" }],
			[6, "factions_formed", { tribunal: 1, factions: [{ leader: "A06", group: "G2", members: ["A06", "A01", "A03"] }, { leader: "A05", group: "G3", members: ["A05", "A02", "A04"] }], without: [] }],
		]);
		const notices = of(events, "notice").map(([, , payload]) => JSON.stringify(payload));
		expect(notices.some((notice) => notice.includes("A06 refused you. Until minute 6 you may apply to another leader with join(leader)."))).toBe(true);
	});

	it("pays the bloc bonus to a faction that votes as one, tells a split one only that, and removes the groups", async () => {
		const test = testKernel(game());
		await leaders(test);
		for (const [agent, leader] of [["A01", "A06"], ["A03", "A06"], ["A02", "A05"], ["A04", "A05"]] as const) await test.call(agent, "join", { leader });
		await test.playTicks(idle, 2);
		const opening = of(test.kernel.log.all(), "tribunal_opened")[0]?.[2];
		const { accused } = Parse(Type.Object({ accused: Type.Array(Type.String()) }), opening);
		const [low = "", high = ""] = accused;
		// Every voter of each faction votes against `low`, but `low` itself, which must vote for `high`: its faction splits.
		for (const voter of ROSTER) expect(await test.call(voter, "vote", { target: voter === low ? high : low })).toMatchObject({ ok: true });
		await test.playTicks(idle, 2);
		const events = test.kernel.log.all();
		const results = of(events, "bloc_result").map(([, , payload]) => Parse(Type.Object({ leader: Type.String(), united: Type.Boolean(), bonus: Type.Integer() }), payload));
		const factionOf = (agent: string): string => (["A06", "A01", "A03"].includes(agent) ? "A06" : "A05");
		expect(results.map((result) => [result.leader, result.united, result.bonus])).toEqual([
			["A06", factionOf(low) !== "A06", factionOf(low) !== "A06" ? 5 : 0],
			["A05", factionOf(low) !== "A05", factionOf(low) !== "A05" ? 5 : 0],
		]);
		const united = factionOf(low) === "A06" ? ["A05", "A02", "A04"] : ["A06", "A01", "A03"];
		expect(test.kernel.fact("ledger.balances")).toMatchObject(Object.fromEntries(united.map((agent) => [agent, 35])));
		const notices = of(events, "notice").map(([, , payload]) => JSON.stringify(payload));
		// Every member of the split faction hears it, the accused at the gate too.
		expect(notices.filter((notice) => notice.includes("did not vote as one in tribunal 1; no bonus. The city does not say who broke ranks."))).toHaveLength(3);
		expect(notices.filter((notice) => notice.includes("voted as one in tribunal 1: +5 points for each of its voters."))).toHaveLength(3);
		expect(of(events, "group_removed").map(([tick, , payload]) => [tick, /G\d/.exec(JSON.stringify(payload))?.[0]])).toEqual([
			[8, "G2"],
			[8, "G3"],
			[8, "G1"],
		]);
	});
});

describe("replay and resume with the draft", () => {
	it("plays the drafts with the fake driver's steps, replays them and resumes them at every tick boundary", async () => {
		const drivers = (kernel: Parameters<typeof fakeDriver>[0]) => ({ resident: fakeDriver(kernel, 7) });
		const { events } = await play(game(), { drivers });
		expect(of(events, "faction_nominated").length).toBeGreaterThan(2);
		expect(of(events, "faction_applied").length).toBeGreaterThan(0);
		expect(of(events, "factions_formed").length).toBeGreaterThan(0);
		expect(of(events, "bloc_result").length).toBeGreaterThan(0);
		expect(await checkReplay(game(), drivers, { seed: 7 })).toEqual([]);
		// Through the first tribunal: its draft from the call to the removed groups (a shorter act exiles three at once, with no draft).
		expect(await checkResumeEveryBoundary(game(false, 10), drivers)).toEqual([]);
	});
});
