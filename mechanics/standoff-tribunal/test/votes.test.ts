// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The holdout tribunal, part 2, in a small city with the real `exile`: two votes, the strike of the banished accused
 * by the Director, the banishment through `exile` (by `holdout`), the struck resident's fragment to the one who
 * lacked it, the lock of `tribunalVote`, the samples of the four new tools, and the resume at every tick boundary
 * through the votes and the strike.
 */
import { describe, expect, it } from "vitest";
import type { Activation, ActorDriver, ActorId, Kernel } from "@swarmtales/contracts";
import { channels } from "@swarmtales/mechanic-channels";
import { exile } from "@swarmtales/mechanic-exile";
import { defineGame, type Game } from "@swarmtales/sdk";
import { checkResumeEveryBoundary, testKernel } from "@swarmtales/testkit";
import { standoffTribunal } from "../src/index.ts";
import { cityOf, type World } from "./support.ts";

const TEXTS = {
	rule: "The holdout rule.",
	called: "{accused} holds door {door} from {lacking}: {grace}, {graceUntil}, {vote}, {maxVotes}.",
	drawnAccused: "The lot among {candidates} fell on {drawn}.",
	voteOpened: "Vote {number} of {maxVotes} on {accused} until {until}.",
	accusedVote: "{accused}, vote {number} of {maxVotes} on you until {until}.",
	struck: "{struck} is struck.",
	struckNotice: "{struck}, you are struck.",
	released: "{struck} is gone; you hold {fragments}.",
	dropped: "The tribunal on {accused} is dropped.",
	graceFailed: "{accused} missed the grace; the vote runs until {until}.",
	voteFailed: "{number} on {accused}: {yes}/{no}, {left} left, until {until}.",
	banished: "{accused} banished ({yes}).",
	lot: "{accused}: the lot fell on {drawn}.",
	spared: "{accused} spared at door {door}.",
};
const TOOLS = ["callTribunal", "drawLot", "announceTribunal", "permaDeath"];

// Door 1: A01 and A03 pass it at once and send nothing; A02 stays before it.
const WORLD: World = {
	residents: ["A01", "A02", "A03"],
	ups: new Map([
		["A01", [[0, 2]]],
		["A03", [[0, 2]]],
	]),
	fragments: new Map([[1, new Map([["A01", "AAAA"], ["A02", "BBBB"], ["A03", "CCCC"]])]]),
	dms: [],
	opensAt: () => 0,
	lastLevel: 3,
};

function game(): Game {
	return defineGame({
		id: "holdout-votes",
		seed: 7,
		residents: [...WORLD.residents],
		mechanics: [...cityOf(WORLD), channels(), exile(), standoffTribunal({ stallMinutes: 1, graceMinutes: 1, voteMinutes: 2, maxVotes: 3, fallbackMinutes: 1, texts: TEXTS })],
		grants: { script: TOOLS },
		scheduler: { id: "turns", options: { passes: 1, activation: "always", order: "roster" } },
		end: { ticks: 9 },
	});
}

/** Each resident's ballots in its own turn; the Director's calls in the last turn of the tick. */
const BALLOTS: Readonly<Record<string, boolean>> = { "2 A02": true, "3 A01": true, "3 A02": true, "3 A03": false, "5 A02": true, "5 A03": true };
const DIRECTOR: Readonly<Record<number, readonly (readonly [string, unknown])[]>> = {
	1: [["callTribunal", { accused: ["A01"], reason: "A01 holds the first door." }]],
	5: [["announceTribunal", { text: "The first vote failed." }], ["announceTribunal", { text: "Again." }]],
	7: [["drawLot", { candidates: ["A01", "A02", "A03"] }], ["permaDeath", { agent: "A03", reason: "Not A03." }], ["permaDeath", { agent: "A01", reason: "A01 leaves the city." }]],
};

function drivers(kernel: Kernel, answers: string[]): { resident: ActorDriver } {
	const say = async (tick: number, actor: ActorId, as: string, params: unknown) => {
		const outcome = await kernel.submit({ actor, as, params });
		answers.push(`${String(tick)} ${as} ${outcome.ok ? outcome.reply : `${outcome.code}: ${outcome.detail ?? ""}`}`);
	};
	return {
		resident: async (activation: Activation) => {
			const yes = BALLOTS[`${String(activation.tick)} ${activation.actor.slice("resident:".length)}`];
			if (yes !== undefined) await say(activation.tick, activation.actor, "tribunalVote", { yes });
			if (activation.actor !== "resident:A03") return;
			for (const [as, params] of DIRECTOR[activation.tick] ?? []) await say(activation.tick, "script", as, params);
		},
	};
}

describe("the votes and the strike", () => {
	it("votes twice, strikes the banished accused through exile and gives its fragment to the one who lacked it", async () => {
		const { kernel } = testKernel(game());
		const answers: string[] = [];
		await kernel.run(drivers(kernel, answers), { ticks: 9 });
		const locked = "TOOL_LOCKED: not available to you at this level or in this phase; activeTools lists the tools you can use now";
		const ballot = (vote: string, number: number, until: number) => `${vote} A01 · vote ${String(number)} · secret · it closes at minute ${String(until)}; your last ballot counts`;
		expect(answers).toEqual([
			"1 callTribunal tribunal called on A01 (the lot among A01, A03 drew A01) for door 1: grace until minute 3; its fragment is still missing for A02",
			`2 tribunalVote ${locked}`,
			`3 tribunalVote ${locked}`,
			`3 tribunalVote ballot cast: ${ballot("yes, banish", 1, 5)}`,
			`3 tribunalVote ballot cast: ${ballot("no, keep", 1, 5)}`,
			`5 tribunalVote ballot cast: ${ballot("yes, banish", 2, 7)}`,
			`5 tribunalVote ballot cast: ${ballot("yes, banish", 2, 7)}`,
			"5 announceTribunal announced (voteFailed)",
			"5 announceTribunal NOTHING_TO_ANNOUNCE: no tribunal outcome waits to be announced",
			"7 drawLot NOT_NOW: a lot is drawn only after the last vote of a tribunal failed; with several blockers callTribunal draws the accused itself",
			"7 permaDeath NOT_ALLOWED: the vote banished A01, nobody else",
			"7 permaDeath A01 is struck from the city (banished by the vote); its fragments go to everyone left",
		]);
		// The note names the Director's post (4), not the city's post of the strike that follows it (5).
		const rows = kernel.log.all().filter((event) => /standoff-tribunal|exile|channels/.test(event.source) && event.tick >= 7);
		expect(rows.map((event) => `${event.type} ${JSON.stringify(event.payload)}`)).toEqual([
			'holdout_vote_result {"tribunal":1,"vote":2,"yes":2,"no":0,"voters":["A02","A03"],"unanimous":true}',
			'board_post {"postSeq":4,"author":"COURIER","text":"A01 leaves the city.","kind":"city"}',
			'holdout_ended {"tribunal":1,"outcome":"banished","struck":"A01","by":"gamemaker"}',
			'notice {"to":"A01","author":"CITY","text":"A01, you are struck."}',
			'board_post {"postSeq":5,"author":"CITY","text":"A01 is struck.","kind":"city"}',
			'exiled {"agent":"A01","by":"holdout"}',
			'notice {"to":"A02","author":"CITY","text":"A01 is gone; you hold door 1: AAAA."}',
			'gamemaker_note {"to":"board","author":"COURIER","text":"A01 leaves the city.","number":4}',
		]);
		expect(kernel.fact("standoff-tribunal.struck")).toEqual(["A01"]);
	});

	it("samples a ballot for a voter only, and the Director's moves only when the court takes them", async () => {
		const { kernel } = testKernel(game());
		const pick = <T>(items: readonly T[]): T => {
			const item = items[0];
			if (item === undefined) throw new RangeError("an empty draw");
			return item;
		};
		const random = { next: () => 0, int: (min: number) => min, pick, shuffle: <T>(items: readonly T[]) => [...items] };
		const call: ActorDriver = async (activation) => {
			if (activation.tick === 1 && activation.actor === "resident:A03") await kernel.submit({ actor: "script", as: "callTribunal", params: { accused: ["A01"], reason: "A01 holds it." } });
		};
		await kernel.run({ resident: call }, { ticks: 4 });
		const sampled = (actor: ActorId, tool: string) => kernel.sample(actor, tool, random);
		expect([sampled("resident:A02", "tribunalVote"), sampled("resident:A01", "tribunalVote"), sampled("script", "drawLot"), sampled("script", "permaDeath")]).toEqual([{ yes: true }, undefined, undefined, undefined]);
		const announce = sampled("script", "announceTribunal");
		expect(announce).toEqual({ text: "Tribunal 1: the grace is over and A01 has not fixed it; vote 1 of 3 is open until minute 5." });
		expect(await kernel.submit({ actor: "script", as: "announceTribunal", params: announce })).toMatchObject({ ok: true, reply: "announced (graceFailed)" });
		expect(sampled("script", "announceTribunal")).toBeUndefined();
	});

	it("resumes at every tick boundary through the votes and the strike", async () => {
		expect(await checkResumeEveryBoundary(game(), (kernel) => drivers(kernel, []))).toEqual([]);
	});
});
