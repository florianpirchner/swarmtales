// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The marks played with the real `ledger`, `channels` and `receipts`: the first test of M5-17 (which refusal a call
 * reads that breaks a tool's own check and has no marks left, against the old answer), the charge and `marks_spent`
 * after a call that succeeded, the marks left in the replies, the free group of the city, the status part and the
 * terms under a task (carried from the old "task line against the old #withMarks text"), and the resume.
 */
import { Type, type Static } from "typebox";
import { describe, expect, it } from "vitest";
import type { Activation, Envelope } from "@swarmtales/contracts";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { channels } from "@swarmtales/mechanic-channels";
import { ledger } from "@swarmtales/mechanic-ledger";
import { receipts } from "@swarmtales/mechanic-receipts";
import { defineGame, defineHead, defineMechanic, reply, type Game, type MechanicUse } from "@swarmtales/sdk";
import { checkOptionsDocumented, checkResumeEveryBoundary, play, scriptedDriver, testKernel } from "@swarmtales/testkit";
import { marks, MarksOptions } from "../src/index.ts";

type Rules = NonNullable<Static<typeof MarksOptions>["rules"]>;
import { levelsStandIn, say } from "./support.ts";

const TWO: Rules = { fromLevel: 1, perLevel: 2, prices: { board: 1, group: 1, dm: 1, receipt: 1 } };

/** Founds a group of the city with its tool `found`, through the service of `channels`. */
const founder = defineMechanic(defineHead({ id: "founder", package: "@test/founder", summary: "Test: founds a group of the city.", requires: [ChannelsService], tools: { found: { description: "Found.", params: Type.Object({}), for: ["resident"] } } }), {
	tools: { found: { run: (_params, ctx) => reply(JSON.stringify(ctx.call(ChannelsService, "createCityGroup", { name: "wall", members: ["A01", "A02"] }))) } },
});

function game(rules: Rules | undefined, more: readonly MechanicUse[] = [], ticks = 3): Game {
	return defineGame({
		id: "marks-test",
		seed: 7,
		residents: ["A01", "A02", "A03"],
		mechanics: [ledger({ startPoints: 10 }), channels(), receipts(), marks(rules === undefined ? {} : { rules }), founder(), ...more],
		scheduler: { id: "turns", options: { passes: 1, activation: "always", order: "roster" } },
		end: { ticks },
	});
}

const spent = (events: readonly Envelope[]): readonly string[] => events.filter((event) => event.type === "marks_spent").map((event) => JSON.stringify(event.payload));

/**
 * The carried cases of a call that is out of marks (old `test/mechanics/channels`: the board and the direct messages
 * against the old World; old `test/mechanics/receipts`: the show), each also breaking a check of its tool, with the
 * answer the old platform gave: the callers checked the price in their bodies, after their own checks.
 */
const OUT_OF_MARKS = [
	{ tool: "postBoard", params: { message: "   " }, old: "INVALID_TEXT: 1-1200 characters" },
	{ tool: "postBoard", params: { message: "third, no marks left" }, old: "NO_MARKS" },
	{ tool: "sendDM", params: { target: "A01", message: "to myself" }, old: "SELF_DM" },
	{ tool: "sendDM", params: { target: "Z99", message: "to nobody" }, old: "UNKNOWN_AGENT: Z99" },
	{ tool: "sendDM", params: { target: "A02", message: "   " }, old: "INVALID_TEXT: 1-800 characters" },
	{ tool: "sendDM", params: { target: "A02", message: "hello" }, old: "NO_MARKS" },
	{ tool: "postGroup", params: { groupId: "G9", message: "hello" }, old: "GROUP_NOT_VISIBLE" },
	{ tool: "showReceipt", params: { receiptId: "R-0099" }, old: "UNKNOWN_RECEIPT: R-0099" },
	{ tool: "showReceipt", params: { receiptId: "R-0001", to: "A03" }, old: "NO_MARKS" },
] as const;

/** The cases whose answer changes (erratum J45, registered): `postBoard` and `sendDM` check in their bodies, after the stage `rule`. */
const REGISTERED = ["postBoard INVALID_TEXT: 1-1200 characters", "sendDM SELF_DM", "sendDM UNKNOWN_AGENT: Z99", "sendDM INVALID_TEXT: 1-800 characters"];

describe("first test: a call out of marks that breaks its tool's check too", () => {
	it("answers the tool's own refusal where the tool checks in `rule`, and `NO_MARKS` where it checks in its body", async () => {
		const test = testKernel(game(TWO));
		await say(test, "A01", "transferPoints", { target: "A02", amount: 1 });
		expect([await say(test, "A01", "postBoard", { message: "one" }), await say(test, "A01", "postBoard", { message: "two" })]).toEqual(["posted · #1 · marks 1/2 left", "posted · #2 · marks 0/2 left"]);
		const answers: string[] = [];
		for (const { tool, params } of OUT_OF_MARKS) answers.push(await say(test, "A01", tool, params));
		const changed = OUT_OF_MARKS.flatMap((entry, index) => (answers[index] === entry.old ? [] : [`${entry.tool} ${entry.old}`]));
		expect(changed).toEqual(REGISTERED);
		for (const [index, entry] of OUT_OF_MARKS.entries()) expect(answers[index]).toBe(REGISTERED.includes(`${entry.tool} ${entry.old}`) ? "NO_MARKS" : entry.old);
		// The refusals of the price are logged at the stage `rule`; nothing more was charged.
		expect(test.kernel.log.all().filter((event) => event.type === "tool_refused" && JSON.stringify(event.payload).includes("NO_MARKS")).map((event) => String(Reflect.get(Object(event.payload), "stage")))).toEqual(Array.from({ length: 7 }, () => "rule"));
		expect(spent(test.kernel.log.all())).toEqual(['{"agent":"A01","channel":"board","remaining":1}', '{"agent":"A01","channel":"board","remaining":0}']);
	});
});

describe("the charge", () => {
	it("charges a call that succeeded on its channel, names the marks left in the reply and leaves a refused or free call unpaid", async () => {
		const test = testKernel(game({ fromLevel: 1, perLevel: 3, prices: { board: 0, group: 1, dm: 2, receipt: 1 } }));
		const answers = [
			await say(test, "A01", "postBoard", { message: "free" }),
			await say(test, "A01", "sendDM", { target: "Z99", message: "nobody" }),
			await say(test, "A01", "sendDM", { target: "A02", message: "hello" }),
			await say(test, "A01", "sendDM", { target: "A02", message: "again" }),
			await say(test, "A01", "found", {}),
			await say(test, "A01", "postGroup", { groupId: "G1", message: "the city's group is free" }),
			await say(test, "A02", "showReceipt", { receiptId: "R-0099" }),
		];
		expect(answers.slice(0, 4)).toEqual(["posted · #1 · marks 3/3 left", "UNKNOWN_AGENT: Z99", "sent · DM #2 to A02 · the city confirms delivery when it reaches them · marks 1/3 left", "NO_MARKS"]);
		expect(answers[5]).toContain("marks 1/3 left");
		expect(answers[6]).toBe("UNKNOWN_RECEIPT: R-0099");
		expect(spent(test.kernel.log.all())).toEqual(['{"agent":"A01","channel":"dm","remaining":1}']);
		expect(test.fact("marks.remaining")).toEqual({ A01: 1 });
	});

	it("prices nothing and refuses nothing without rules, and the replies carry no marks part", async () => {
		const test = testKernel(game(undefined));
		expect(await say(test, "A01", "postBoard", { message: "hello" })).toBe("posted · #1");
		expect(spent(test.kernel.log.all())).toEqual([]);
	});
});

const LEVELLED: Rules = { fromLevel: 2, perLevel: 5, prices: { board: 0, group: 1, dm: 2 }, ranges: [{ fromLevel: 3, prices: { board: 1, group: 1, dm: 1, receipt: 2 }, refill: { marks: 1, everyMinutes: 1 } }, { fromLevel: 4, refill: { marks: 2, everyMinutes: 3 } }] };

// The marks lines of every activation, as `tick resident kind text`.
async function linesOf(rules: Rules, levels: Map<string, number>, plan: (activation: Activation) => readonly { readonly tool: string; readonly params: unknown }[] = () => []): Promise<readonly string[]> {
	const seen: string[] = [];
	const standIn = levelsStandIn({ levels, queued: new Map(), start: 1, lastLevel: 5, opensAt: (level) => (level === 5 ? 2 : 0) });
	const driver = scriptedDriver((activation) => {
		for (const note of activation.inputs) if (note.source.endsWith("marks")) seen.push(`${String(activation.tick)} ${activation.actor.slice("resident:".length)} ${note.kind} ${note.text}`);
		return plan(activation);
	});
	await play(game(rules, [standIn]), { drivers: { resident: driver } });
	return seen;
}

describe("the status part and the terms under a task", () => {
	it("gives the old terms per level, with a refill, and none below the first level", async () => {
		const lines = await linesOf(LEVELLED, new Map([["A01", 1], ["A02", 3], ["A03", 4]]));
		expect(lines.filter((line) => line.startsWith("0 "))).toEqual([
			"0 A02 status marks 5/5",
			"0 A02 task Marks on this level: 5. Prices: board 1, group 1, DM 1, showing a receipt 2. You regain 1 mark per minute, up to 5. Unused marks expire when you change level.",
			"0 A03 status marks 5/5",
			"0 A03 task Marks on this level: 5. Prices: board 0, group 1, DM 2, showing a receipt 1. You regain 2 marks every 3 minutes, up to 5. Unused marks expire when you change level.",
		]);
		// Once per level: no terms at the next activations.
		expect(lines.filter((line) => line.includes(" task "))).toHaveLength(2);
	});

	it("shows the terms of a new level at the next activation, none at a shut door, and the run-wide terms", async () => {
		const plan = (activation: Activation) => (activation.tick === 0 ? [{ tool: "submitSolution", params: { to: activation.actor.endsWith("A01") ? 2 : 5 } }] : []);
		const lines = await linesOf(LEVELLED, new Map(), plan);
		expect(lines.filter((line) => line.includes(" task "))).toEqual(["1 A01 task Marks on this level: 5. Prices: board 0, group 1, DM 2, showing a receipt 1. Unused marks expire when you change level."]);
		const run = await linesOf({ fromLevel: 1, perRun: 7, prices: { board: 1, group: 1, dm: 1, receipt: 2 } }, new Map([["A01", 3]]));
		expect(run[1]).toBe("0 A01 task Marks for the whole run: 7, never more (your status line shows what you have left). Prices: board 1, group 1, DM 1, showing a receipt 2.");
	});
});

describe("standing", () => {
	it("documents its options and resumes at every tick boundary to the straight run", async () => {
		expect(checkOptionsDocumented({ id: "marks", options: MarksOptions })).toEqual([]);
		const plan = (activation: Activation) => [{ tool: "sendDM", params: { target: activation.actor.endsWith("A01") ? "A02" : "A01", message: `tick ${String(activation.tick)}` } }];
		const levels = levelsStandIn({ levels: new Map(), queued: new Map(), start: 3, lastLevel: 5, opensAt: () => 0 });
		expect(await checkResumeEveryBoundary(game(LEVELLED, [levels], 4), () => ({ resident: scriptedDriver(plan) }))).toEqual([]);
	});
});
