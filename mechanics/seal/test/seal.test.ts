// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The seal among the City's real mechanics (12-m5-spec.md, section 10, row 44): the auction opened by the act's start
 * after the goals are dealt, the secret bids of `cityofkeys-act2-seal-s7.json` (A02 5, A06 12) paid at the close, the
 * strike through `exile` with `by: "seal"` before the tribunal's first call, the target the seal asks of the tribunal
 * (`missing`) and the seal that crumbles at it, the end of the act before the goals are
 * resolved, the status parts and locks, the gamemaker's fact, and a fake run replayed and resumed at every tick.
 */
import { readFileSync } from "node:fs";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { describe, expect, it } from "vitest";
import { channels } from "@swarmtales/mechanic-channels";
import { exile } from "@swarmtales/mechanic-exile";
import { goals, GoalsOptions } from "@swarmtales/mechanic-goals";
import { ledger } from "@swarmtales/mechanic-ledger";
import { LevelPiecesService, progression } from "@swarmtales/mechanic-progression";
import { tribunal, TribunalOptions, type TribunalSpec } from "@swarmtales/mechanic-tribunal";
import { defineGame, defineHead, defineMechanic } from "@swarmtales/sdk";
import { checkReplay, checkResumeEveryBoundary, fakeDriver, play, testKernel, type TestKernel } from "@swarmtales/testkit";
import { seal, SealOptions } from "../src/index.ts";

const story = Parse(
	Type.Object({ seal: SealOptions, tribunal: TribunalOptions, goals: Type.Record(Type.String(), Type.Unknown()) }),
	JSON.parse(readFileSync(new URL("../../../oracles/cityofkeys/setup/cityofkeys.story.json", import.meta.url), "utf8")),
);
// The act begins at the run's start; the tribunal's target is a fifth of six (one), its first call at tick 9.
const court = (latestAfter: number): TribunalSpec => {
	const spec: TribunalSpec = { ...story.tribunal, first: { level: 8, latestAfter }, targetShare: 0.2 };
	delete spec.factions;
	return spec;
};
// `permaDeath` is a note tool of the gamemaker's (standoff-tribunal) too: the goals' note check meets the seal's by its bare name.
const GOALS = Parse(GoalsOptions, { ...story.goals, factions: false, noteTools: ["notify", "boardNote", "permaDeath"] });

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

function game(perResidents = story.seal.perResidents, ticks = 16, latestAfter = 9) {
	return defineGame({
		id: "seal-unit",
		seed: 7,
		residents: ["A01", "A02", "A03", "A04", "A05", "A06"],
		mechanics: [
			ledger({ startPoints: 30 }),
			channels(),
			exile(),
			pieces(),
			progression({ levels: [{ number: 8, title: "Door 8", reward: 5, tools: [], task: "Door {level}" }], startLevel: 8 }),
			seal({ ...story.seal, perResidents }),
			goals(GOALS),
			tribunal(court(latestAfter)),
		],
		scheduler: { id: "turns", options: { passes: 1, activation: "always", order: "roster", inputs: [{ kind: "status", join: " · " }] } },
		end: { ticks },
	});
}

type Logged = readonly { readonly type: string; readonly tick: number; readonly payload: unknown }[];
const of = (events: Logged, ...types: readonly string[]) => events.filter((event) => types.includes(event.type)).map((event) => [event.tick, event.type, event.payload]);
const idle = () => Promise.resolve();

// Plays to the auction of seal 1, takes the two bids of the oracle file and plays past its close.
async function won(test: TestKernel): Promise<void> {
	await test.playTicks(idle, 5);
	expect(await test.call("A02", "bid", { points: 5 })).toEqual({ ok: true, reply: "your bid of 5 points stands in secret · the bidding closes at minute 7" });
	expect(await test.call("A06", "bid", { points: 0 })).toEqual({ ok: true, reply: "no bid stands · the bidding closes at minute 7" });
	expect(await test.call("A06", "bid", { points: 12 })).toMatchObject({ ok: true });
	await test.playTicks(idle, 3);
}

describe("the black seal in the city", () => {
	it("is won in secret, paid by every bidder, and broken on a resident through the exile", async () => {
		const test = testKernel(game());
		expect(await test.call("A01", "bid", { points: 1 })).toMatchObject({ ok: false, code: "TOOL_LOCKED", detail: "not available to you at this level or in this phase; activeTools lists the tools you can use now" });
		await won(test);
		expect(await test.call("A02", "permaDeath", { target: "A04" })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(await test.call("A06", "permaDeath", { target: "A06" })).toEqual({ ok: false, code: "SELF", detail: "the seal is never broken on its bearer" });
		expect(await test.call("A06", "permaDeath", { target: "A04" })).toEqual({ ok: true, reply: "you broke the black seal · A04 has left the city" });
		const events = test.kernel.log.all();
		expect(of(events, "seal_auction_opened", "seal_bid", "seal_won", "seal_used", "exiled", "tribunal_announced")).toEqual([
			[4, "seal_auction_opened", { seal: 1, until: 7 }],
			[5, "seal_bid", { seal: 1, agent: "A02", points: 5 }],
			[5, "seal_bid", { seal: 1, agent: "A06", points: 0 }],
			[5, "seal_bid", { seal: 1, agent: "A06", points: 12 }],
			[7, "seal_won", { seal: 1, agent: "A06", bid: 12, bids: [{ agent: "A02", points: 5 }, { agent: "A06", points: 12 }] }],
			[8, "seal_used", { seal: 1, holder: "A06", target: "A04" }],
			[8, "exiled", { agent: "A04", by: "seal" }],
		]);
		expect(test.fact("ledger.balances")).toMatchObject({ A02: 25, A06: 18 });
		expect(of(events, "board_post").map(([, , payload]) => Parse(Type.Object({ text: Type.String() }), payload).text).filter((text) => /^Someone|broke the black seal/.test(text))).toEqual(["Someone now bears the black seal.", "A06 broke the black seal on A04."]);
		// The goals were dealt before the seal began, and the struck resident's goal is void.
		expect(of(events, "goal_dealt")).toHaveLength(6);
		expect(of(events, "goal_resolved").find(([, , payload]) => JSON.stringify(payload).includes('"A04"'))).toBeDefined();
	});

	it("asks the tribunal's target and crumbles once it is reached", async () => {
		const test = testKernel(game(story.seal.perResidents, 16, 2));
		await won(test);
		await test.playTicks(idle, 1);
		const events = test.kernel.log.all();
		expect(of(events, "tribunal_announced")).toEqual([[2, "tribunal_announced", { target: 1, residents: 6 }]]);
		// The tribunal sent the bearer, now the poorest, to the gate at tick 8: the target is reached.
		expect(of(events, "exile_gate").map(([tick, , payload]) => [tick, Parse(Type.Object({ agent: Type.String() }), payload).agent])).toEqual([[8, "A06"]]);
		expect(await test.call("A06", "permaDeath", { target: "A01" })).toEqual({ ok: false, code: "TARGET_REACHED", detail: "the city has exiled all it will; the seal crumbles" });
		expect(of(test.kernel.log.all(), "seal_expired").at(-1)).toEqual([9, "seal_expired", { seal: 1, holder: "A06", reason: "the target was reached" }]);
	});

	it("knows the target before the tribunal's first call: a strike that reaches it ends the act and the next seal with it (A91)", async () => {
		const test = testKernel(game(3));
		await won(test);
		expect(await test.call("A06", "permaDeath", { target: "A04" })).toMatchObject({ ok: true });
		await test.playTicks(idle, 3);
		// The seal reached the target (the tribunal's `missing` is 0), so the tribunal never calls one and its act is over.
		expect(of(test.kernel.log.all(), "tribunal_announced", "seal_won", "seal_expired", "act_ended")).toEqual([
			[7, "seal_won", expect.objectContaining({ seal: 1, agent: "A06" })],
			[8, "act_ended", { fromLevel: 8 }],
			[8, "seal_expired", { seal: 2, reason: "the act ended before the bidding closed" }],
		]);
		expect(await test.call("A01", "bid", { points: 4 })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
	});

	it("shows the auction and the bearer on the status line and ends before the goals are resolved", async () => {
		const test = testKernel(game(story.seal.perResidents, 9));
		const lines: string[] = [];
		await test.playTicks((activation) => {
			if (activation.actor === "resident:A06") lines.push(activation.inputs.map((line) => (typeof line === "string" ? line : line.text)).join(" | "));
			return Promise.resolve();
		}, 5);
		expect(test.fact("seal.section")).toEqual({ auction: { seal: 1, until: 7 }, borne: 0, pending: 1 });
		await test.call("A06", "bid", { points: 12 });
		const rest: string[] = [];
		await test.playTicks((activation) => {
			if (activation.actor === "resident:A06") rest.push(activation.inputs.map((line) => (typeof line === "string" ? line : line.text)).join(" | "));
			return Promise.resolve();
		}, 4);
		expect(lines[4]).toContain("black seal auction: secret bids with bid(points) until minute 7");
		expect(rest[0]).toContain("black seal auction: secret bids with bid(points) until minute 7 (your bid: 12)");
		expect(rest[2]).toContain("you bear a black seal: permaDeath(resident), once, until the act ends");
		expect(test.fact("seal.section")).toEqual({ auction: null, borne: 0, pending: 0 });
		const events = test.kernel.log.all();
		const expired = events.findIndex((event) => event.type === "seal_expired");
		expect(events[expired]?.payload).toEqual({ seal: 1, holder: "A06", reason: "the act ended" });
		expect(events.findIndex((event) => event.type === "goal_resolved")).toBeGreaterThan(expired);
	});
});

describe("replay and resume", () => {
	it("plays an auction with the fake driver's bids and a strike that ends the act, replays it and resumes it at every tick boundary", async () => {
		const drivers = (kernel: Parameters<typeof fakeDriver>[0]) => ({ resident: fakeDriver(kernel, 7) });
		const { events } = await play(game(3), { drivers });
		expect(of(events, "seal_won", "seal_used").map(([, type]) => type)).toEqual(["seal_won", "seal_used"]);
		expect(of(events, "act_ended")).toHaveLength(1);
		expect(await checkReplay(game(3), drivers, { seed: 7 })).toEqual([]);
		expect(await checkResumeEveryBoundary(game(3), drivers)).toEqual([]);
	});
});
