// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The first part of the tribunal (12-m5-spec.md, section 10, row 41) with the City's own texts (the setup file of
 * `cityofkeys-act1-s7.json`, its faction draft left out until M5-42): the city plans the first tribunal at its
 * deadline, calls it ahead, opens it with the lowest-ranked accused, takes the secret votes, burns a non-voter's
 * points and sends the one voted out to the gate of `exile` with its prices and texts. The prices and the next trial
 * are read through the real `standoff` (`ransom-price`, `trial-risk`), and a verdict waits at the decision gate.
 */
import { readFileSync } from "node:fs";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { describe, expect, it } from "vitest";
import { channels } from "@swarmtales/mechanic-channels";
import { decisions } from "@swarmtales/mechanic-decisions";
import { exile } from "@swarmtales/mechanic-exile";
import { ledger } from "@swarmtales/mechanic-ledger";
import { LevelPiecesService, progression } from "@swarmtales/mechanic-progression";
import { standoff } from "@swarmtales/mechanic-standoff";
import { defineGame, defineHead, defineMechanic } from "@swarmtales/sdk";
import { checkReplay, checkResumeEveryBoundary, fakeDriver, play, testKernel, type TestKernel } from "@swarmtales/testkit";
import { TribunalOptions, tribunal, type TribunalSpec } from "../src/index.ts";

const setup = Parse(Type.Object({ tribunal: TribunalOptions }), JSON.parse(readFileSync(new URL("../../../oracles/cityofkeys/setup/cityofkeys.story.json", import.meta.url), "utf8")));
// The act begins at the run's start, the first tribunal is due at tick 2; the draft comes with M5-42.
const spec: TribunalSpec = { ...setup.tribunal, act: 1, first: { level: 1, latestAfter: 2 } };
delete spec.factions;

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

const levels = [{ number: 1, title: "Door 1", reward: 5, tools: ["vote"], task: "Door {level}" }];

function game(extra: readonly ReturnType<typeof decisions>[] = [], options: Partial<TribunalSpec> = {}, ticks = 24) {
	return defineGame({
		id: "tribunal-unit",
		seed: 7,
		residents: ["A01", "A02", "A03", "A04", "A05", "A06"],
		mechanics: [ledger({ startPoints: 30 }), channels(), exile(), pieces(), progression({ levels, penalty: [2], maxAttemptsPerWindow: 3, attemptWindowMinutes: 3 }), ...extra, tribunal({ ...spec, ...options }), standoff()],
		scheduler: { id: "turns", options: { passes: 1, activation: "always", order: "roster", inputs: [{ kind: "status", join: " · " }] } },
		end: { ticks },
	});
}

type Logged = readonly { readonly type: string; readonly tick: number; readonly payload: unknown }[];
const of = (events: Logged, ...types: readonly string[]) => events.filter((event) => types.includes(event.type)).map((event) => [event.tick, event.type, event.payload]);
const idle = () => Promise.resolve();

// Plays to the opening of tribunal 1 and gives its accused, lowest first, and the voters who are not accused.
async function opened(test: TestKernel, ticks = 7): Promise<{ readonly accused: readonly string[]; readonly others: readonly string[] }> {
	await test.playTicks(idle, ticks);
	const opening = of(test.kernel.log.all(), "tribunal_opened")[0]?.[2];
	const { accused } = Parse(Type.Object({ accused: Type.Array(Type.String()) }), opening);
	return { accused, others: ["A01", "A02", "A03", "A04", "A05", "A06"].filter((id) => !accused.includes(id)) };
}

describe("a tribunal from its plan to the gate", () => {
	it("plans the first at its deadline, calls it ahead and opens it in the old words", async () => {
		const test = testKernel(game());
		await test.playTicks(idle, 3);
		expect(await test.call("A01", "vote", { target: "A02" })).toMatchObject({ ok: false, code: "TOOL_LOCKED", detail: "not available to you at this level or in this phase; activeTools lists the tools you can use now" });
		const { accused } = await opened(test, 4);
		const events = test.kernel.log.all();
		expect(of(events, "tribunal_scheduled", "tribunal_announced", "tribunal_called", "tribunal_opened")).toEqual([
			[2, "tribunal_scheduled", { tribunal: 1, opens: 6, calledAt: 2, count: 1, factions: 0, by: "deadline" }],
			[2, "tribunal_announced", { target: 3, residents: 6 }],
			[2, "tribunal_called", { tribunal: 1, opens: 6, count: 1, factions: 0 }],
			[6, "tribunal_opened", { tribunal: 1, accused, voters: ["A01", "A02", "A03", "A04", "A05", "A06"], until: 8, count: 1 }],
		]);
		expect(accused).toHaveLength(2);
		const posts = of(events, "board_post").map(([, , payload]) => Parse(Type.Object({ text: Type.String() }), payload).text);
		expect(posts[1]).toBe("Tribunal 1 sits at minute 6: the city exiles 1, and the 2 with the fewest points stand trial.");
		expect(posts[2]).toBe(`Tribunal 1 at minute 6. Accused: ${[...accused].sort().join(" and ")}; the city exiles 1. Every resident votes in secret with vote(target) until minute 8, the accused too, but never against themselves.`);
	});

	it("takes each secret vote once, never against oneself, and sends the one voted out to the gate", async () => {
		const test = testKernel(game());
		const { accused, others } = await opened(test);
		const [low = "", high = ""] = accused;
		expect(await test.call(low, "vote", { target: low })).toEqual({ ok: false, code: "SELF_VOTE", detail: `you may not vote against yourself; vote against ${high}` });
		expect(await test.call(others[0] ?? "", "vote", { target: others[1] ?? "" })).toEqual({ ok: false, code: "NOT_ACCUSED", detail: `the accused are ${accused.join(" and ")}` });
		for (const voter of [low, ...others.slice(0, 3)]) expect(await test.call(voter, "vote", { target: voter === low ? high : low })).toMatchObject({ ok: true });
		expect(await test.call(others[0] ?? "", "vote", { target: high })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		const lines: string[] = [];
		await test.playTicks((activation) => {
			if (activation.actor === `resident:${high}`) lines.push(activation.inputs.map((line) => (typeof line === "string" ? line : line.text)).join(" | "));
			return Promise.resolve();
		}, 2);
		expect(lines[0]).toContain("accused · the vote closes at minute 8");
		const events = test.kernel.log.all();
		const late = [high, others[3] ?? ""].sort();
		expect(of(events, "tribunal_result", "exile_gate")).toEqual([
			[8, "tribunal_result", { counts: [{ agent: low, votes: 3 }, { agent: high, votes: 1 }], exiled: [low], nonVoters: late }],
			// The median of the register after the penalties (22, 22, 30, 30, 30, 30) is 30: a third of it, at least 20.
			[8, "exile_gate", { agent: low, until: 13, ransomable: true, voters: others.slice(0, 3).toSorted(), price: 20, selfPrice: 30 }],
		]);
		expect(of(events, "notice").filter(([, , payload]) => JSON.stringify(payload).includes("You did not vote"))).toHaveLength(2);
		expect(test.kernel.fact("ledger.balances")).toMatchObject({ [high]: 22, [others[3] ?? ""]: 22 });
	});
});

describe("the faction draft", () => {
	it("is refused at load until its part of the port lands (M5-42)", () => {
		expect(() => testKernel(game([], setup.tribunal.factions === undefined ? {} : { factions: setup.tribunal.factions }))).toThrow(/options\.factions/);
	});
});

describe("what the standoff reads of the tribunal", () => {
	it("prices the city's pieces at half a ransom and sees the next trial coming", async () => {
		const test = testKernel(game());
		expect(test.fact("standoff.cityPiecePrice")).toBe(10);
		await test.playTicks(idle, 3);
		expect(test.fact("standoff.section")).toMatchObject({ risk: { opens: 6, now: false } });
		const { accused } = await opened(test, 4);
		expect(test.fact("standoff.section")).toMatchObject({ risk: { opens: 6, now: true }, atRisk: accused.map((agent) => ({ agent, gate: null })) });
	});
});

describe("the verdict at the decision gate", () => {
	it("waits for its holders and sends the amended verdict to the gate", async () => {
		const test = testKernel(game([decisions({ holders: ["human"] })], { decisionWindow: 2 }));
		const { accused } = await opened(test);
		const [low = "", high = ""] = accused;
		await test.playTicks(idle, 2);
		expect(of(test.kernel.log.all(), "decision_proposed", "tribunal_result")).toEqual([[8, "decision_proposed", expect.objectContaining({ kind: "tribunal.verdict", owner: "tribunal", proposal: { tribunal: 1, exiled: [low] }, deadline: 10 })]]);
		expect(await test.kernel.submit({ actor: "human", as: "amendDecision", params: { decision: "D1", proposal: { tribunal: 1, exiled: [high] }, reason: "spare the other" } })).toMatchObject({ ok: true });
		await test.playTicks(idle, 2);
		expect(of(test.kernel.log.all(), "tribunal_result", "exile_gate").map(([tick, type, payload]) => [tick, type, JSON.stringify(payload).includes(`"exiled":["${high}"]`) || JSON.stringify(payload).includes(`"agent":"${high}"`)])).toEqual([
			[10, "tribunal_result", true],
			[10, "exile_gate", true],
		]);
	});
});

describe("replay and resume", () => {
	it("plays the first tribunal and the forced final one with the fake driver's votes, replays them and resumes them at every tick boundary", async () => {
		const drivers = (kernel: Parameters<typeof fakeDriver>[0]) => ({ resident: fakeDriver(kernel, 7) });
		const { events } = await play(game(), { drivers });
		expect(of(events, "tribunal_result").map(([tick]) => tick)).toEqual([8, 18]);
		expect(of(events, "tribunal_vote").length).toBeGreaterThan(4);
		expect(await checkReplay(game(), drivers, { seed: 7 })).toEqual([]);
		// A shorter act holds one tribunal, which exiles all three: through its opening, the votes, the result and the gates.
		const short = await play(game([], {}, 14), { drivers });
		expect(of(short.events, "exile_gate")).toHaveLength(3);
		expect(await checkResumeEveryBoundary(game([], {}, 14), drivers)).toEqual([]);
	});
});
