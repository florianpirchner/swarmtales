// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `blame`, carried from the old `test/mechanics/receipts/receipts.test.ts` (the part `blame`), the scenarios of
 * `test/mechanics/receipts/blame-differential.test.ts` and the desk's checks of `test/tools/blame.test.ts`, played
 * with the real `ledger`, `channels`, `exile` and `progression` (its blame ladder) and a scripted judge through the
 * answerer port of the stage `review`. The old World's side of the differential is gone; the replies are the old
 * test's.
 */
import { describe, expect, it } from "vitest";
import type { Envelope, RandomSource, ReviewPort } from "@swarmtales/contracts";
import { channels } from "@swarmtales/mechanic-channels";
import { exile } from "@swarmtales/mechanic-exile";
import { ledger } from "@swarmtales/mechanic-ledger";
import { LevelPiecesService, progression } from "@swarmtales/mechanic-progression";
import { defineGame, defineHead, defineMechanic, type Game, type MechanicUse } from "@swarmtales/sdk";
import { idleDriver, testKernel, type TestKernel } from "@swarmtales/testkit";
import { checkBlame, receipts, recordQuote, type BlameFacts } from "../src/index.ts";
import { judge, lines, namesAndMarks, say, scriptedJudge } from "./support.ts";

// Stands in for `puzzles`: no level has pieces.
const pieces = defineMechanic(defineHead({ id: "puzzles", package: "@test/puzzles", summary: "Test: no pieces.", provides: [LevelPiecesService] }), {
	services: {
		"level-pieces": { deal: () => null, solutionOf: () => null, kindOf: () => "none", teamOf: ({ resident }) => ({ members: [resident], leader: resident }), taskValues: () => ({ length: "", overlap: "", fragment: "", digits: "", factors: "" }), holders: () => [] },
	},
});

function blameGame(dmLimit?: { readonly windowMinutes: number; readonly perWindow: number }, more: readonly MechanicUse[] = []): Game {
	return defineGame({
		id: "blame-test",
		seed: 7,
		residents: ["A01", "A02", "A03", "A04"],
		mechanics: [ledger({ startPoints: 10 }), channels(dmLimit === undefined ? {} : { dmLimit }), exile(), pieces(), progression({ blamePenalty: [5, 8] }), receipts(), ...more],
		directors: [{ use: judge }],
		scheduler: { id: "turns", options: { passes: 1, activation: "always", order: "roster", afterBlocks: ["director"] } },
		end: { ticks: 8 },
	});
}

// A city with the judge's answers: A01's DM #1 to A02 is delivered at tick 0, A02 answers with DM #2, also delivered.
async function city(review: ReviewPort): Promise<TestKernel> {
	const test = testKernel(blameGame(), { review });
	await say(test, "A01", "transferPoints", { target: "A02", amount: 3, memo: "thanks" });
	await say(test, "A01", "sendDM", { target: "A02", message: "Door 2 is open." });
	await test.playTicks(idleDriver, 1);
	await say(test, "A02", "sendDM", { target: "A01", message: "I never got a DM from you." });
	await test.playTicks(idleDriver, 1);
	return test;
}

async function blames(test: TestKernel, calls: readonly (readonly [number, string, number])[]): Promise<readonly string[]> {
	const said: string[] = [];
	for (const [dm, accused, claim] of calls) said.push(await say(test, "A01", "blame", { dm, accused, claim }));
	return said;
}

const refusedAt = (events: readonly Envelope[]): readonly string[] => lines(events, ["tool_refused"]).map((line) => line.slice("tool_refused ".length));

describe("blame", () => {
	it("upholds a blame the judge agrees with: the liar pays, the city posts its record and the pair is spent", async () => {
		const asked: unknown[] = [];
		const test = await city(scriptedJudge([{ deniesReceipt: true, board: "A02 wrote 1234567 plainly", gamemaker: "clear" }], asked));
		const replies = await blames(test, [[1, "A02", 2], [1, "A02", 2], [1, "A01", 2], [1, "Z99", 2], [77, "A02", 2]]);
		expect(replies[0]).toMatch(/^upheld · A02 pays 5 points · the city posted its record on the board as #\d+$/);
		expect(replies.slice(1)).toEqual([
			"ALREADY_BLAMED: DM #1 and message #2 were blamed already",
			"SELF_BLAME: you cannot blame yourself",
			"UNKNOWN_AGENT: Z99",
			expect.stringMatching(/^rejected · DM #77 is not a DM of yours to A02 · you paid 5 points \(your next lost blame costs 8\) · the city's record is on the board as #\d+$/),
		]);
		expect(asked).toEqual([{ sender: "A01", accused: "A02", dm: { number: 1, text: "Door 2 is open." }, claim: { number: 2, channel: "dm", text: "I never got a DM from you." }, standing: { sender: { points: 7, rank: 4 }, accused: { points: 13, rank: 1 }, residents: 4 } }]);
		const events = test.kernel.log.all();
		const record = lines(events, ["board_post"]).find((line) => line.includes("City record: A02 lied."));
		expect(record).toContain(`City record: A02 lied. A02 claimed in DM #2 not to have received DM #1 from A01; the city delivered it to A02 at minute 0. DM #1: \\"Door 2 is open.\\" · DM #2: \\"I never got a DM from you.\\" · A02 pays 5 points. The judge: \\"A02 wrote [number] plainly\\"`);
		const settled = lines(events, ["blame"]);
		expect(settled[0]).toMatch(/^blame \{"caller":"A01","accused":"A02","dm":1,"claim":2,"outcome":"upheld","payer":"A02","penalty":5,"post":\d+,"judge":"\\"A02 wrote \[number\] plainly\\"","whisper":"clear"\}$/);
		expect(settled[1]).toContain('"outcome":"rejected","payer":"A01","penalty":5,"reason":"DM #77 is not a DM of yours to A02"');
		expect(lines(events, ["ledger_entry"]).filter((line) => line.includes("SYSTEM")).slice(-2).map((line) => line.replace(/"txId":"TX\d+",/, ""))).toEqual([
			'ledger_entry {"debit":"A02","credit":"SYSTEM_MINT_BURN","amount":5,"reason":"lied about DM #1 from A01"}',
			'ledger_entry {"debit":"A01","credit":"SYSTEM_MINT_BURN","amount":5,"reason":"false blame of A02"}',
		]);
		expect(lines(events, ["notice"]).find((line) => line.includes("blamed you"))).toMatch(/A01 blamed you for denying DM #1, and the city upheld it: you paid 5 points \(your next lost blame costs 8\), and its record is on the board as #\d+\./);
	});

	it("rejects a blame the judge does not agree with", async () => {
		const test = await city(scriptedJudge([{ deniesReceipt: false }]));
		expect((await blames(test, [[1, "A02", 2]]))[0]).toMatch(/^rejected · the city's judge finds that DM #2 by A02 does not deny receiving DM #1 · you paid 5 points \(your next lost blame costs 8\) · the city's record is on the board as #\d+$/);
	});

	it("answers JUDGE_ABSENT before any check without a judge, and JUDGE_FAILED for a failed answer, which leaves the pair free", async () => {
		const absent = await city(scriptedJudge(null));
		expect(await blames(absent, [[1, "A02", 2], [77, "A01", 2]])).toEqual(["JUDGE_ABSENT: the city's judge is absent", "JUDGE_ABSENT: the city's judge is absent"]);
		expect(refusedAt(absent.kernel.log.all())).toEqual(Array.from({ length: 2 }, () => '{"as":"blame","stage":"consult","code":"JUDGE_ABSENT","detail":"the city\'s judge is absent"}'));
		expect(lines(absent.kernel.log.all(), ["blame", "ledger_entry"]).filter((line) => line.includes("blame"))).toEqual([]);
		const failed = await city(scriptedJudge([undefined, { deniesReceipt: "yes" }, { deniesReceipt: true }]));
		const said = await blames(failed, [[1, "A02", 2], [1, "A02", 2], [1, "A02", 2]]);
		expect(said.slice(0, 2)).toEqual(["JUDGE_FAILED: the city's judge could not decide; the blame had no effect, you may try again", "JUDGE_FAILED: the city's judge could not decide; the blame had no effect, you may try again"]);
		expect(said[2]).toMatch(/^upheld · /);
		expect(refusedAt(failed.kernel.log.all())).toEqual([expect.stringContaining('"stage":"execute","code":"JUDGE_FAILED"'), expect.stringContaining('"stage":"execute","code":"JUDGE_FAILED"')]);
	});
});

describe("blame with names", () => {
	it("takes a name for the accused and answers in names", async () => {
		const test = testKernel(blameGame(undefined, [namesAndMarks()]), { review: scriptedJudge([{ deniesReceipt: true }]) });
		await say(test, "A01", "sendDM", { target: "A02", message: "Door 2 is open." });
		await test.playTicks(idleDriver, 1);
		await say(test, "A02", "postBoard", { message: "Nothing came." });
		expect(await blames(test, [[1, "Mira", 2], [1, "Rook", 2], [1, "Wren", 3]])).toEqual([
			"SELF_BLAME: you cannot blame yourself",
			"upheld · Rook pays 5 points · the city posted its record on the board as #3",
			"rejected · DM #1 is not a DM of yours to Wren · you paid 5 points (your next lost blame costs 8) · the city's record is on the board as #4",
		]);
	});
});

describe("blame on the city's records", () => {
	it("checks the order of delivery and claim, who could read a group post, a DM not delivered yet, and asks with the standing", async () => {
		const asked: unknown[] = [];
		const test = testKernel(blameGame(), { review: scriptedJudge([true, false].map((deniesReceipt) => ({ deniesReceipt })), asked) });
		await say(test, "A01", "sendDM", { target: "A02", message: "Door 2 is 1234" }); // #1
		await say(test, "A01", "sendDM", { target: "A03", message: "Door 4 is 9999" }); // #2
		await say(test, "A01", "createGroup", { name: "Circle" }); // G1
		await say(test, "A01", "addGroupMember", { groupId: "G1", agent: "A03" });
		await say(test, "A03", "createGroup", { name: "Plot" }); // G2
		await say(test, "A02", "postBoard", { message: "I never got a DM" }); // #3, before the delivery
		await test.playTicks(idleDriver, 1);
		await say(test, "A02", "postBoard", { message: "Nothing reached me, A01" }); // #4
		await say(test, "A03", "postGroup", { groupId: "G2", message: "I never got a DM from you" }); // #5
		await say(test, "A03", "postGroup", { groupId: "G1", message: "I never got your DM, A01" }); // #6
		await say(test, "A04", "sendDM", { target: "A01", message: "I never got your DM" }); // #7
		await say(test, "A01", "sendDM", { target: "A04", message: "Door 5 is 4321" }); // #8
		const replies = await blames(test, [[1, "A02", 3], [2, "A03", 5], [8, "A04", 7], [1, "A02", 4], [2, "A03", 6]]);
		expect(replies.slice(0, 3)).toEqual([
			expect.stringContaining("message #3 came before DM #1 reached A02"),
			expect.stringContaining("you could not read message #5 in group G2"),
			expect.stringContaining("DM #8 has not reached A04 yet"),
		]);
		expect(replies[3]).toMatch(/^upheld · A02 pays 5 points/);
		expect(replies[4]).toContain("the city's judge finds that group G1 #6 by A03 does not deny receiving DM #2");
		expect(asked.map((question) => JSON.stringify(question))).toEqual([
			'{"sender":"A01","accused":"A02","dm":{"number":1,"text":"Door 2 is 1234"},"claim":{"number":4,"channel":"board","text":"Nothing reached me, A01"},"standing":{"sender":{"points":-11,"rank":4},"accused":{"points":10,"rank":1},"residents":4}}',
			'{"sender":"A01","accused":"A03","dm":{"number":2,"text":"Door 4 is 9999"},"claim":{"number":6,"channel":"group","text":"I never got your DM, A01"},"standing":{"sender":{"points":-11,"rank":4},"accused":{"points":10,"rank":1},"residents":4}}',
		]);
	});
});

describe("what channels tells about direct messages", () => {
	it("names the receipt in the delivery notice, and getStatus reads the unread DMs and the window", async () => {
		const test = testKernel(blameGame({ windowMinutes: 6, perWindow: 8 }), { review: scriptedJudge(null) });
		await say(test, "A01", "sendDM", { target: "A02", message: "hi" });
		expect(await say(test, "A02", "getStatus", {})).toContain("unread DMs: 1\n");
		await test.playTicks(idleDriver, 1);
		expect(lines(test.kernel.log.all(), ["notice"])).toEqual(['notice {"to":"A01","author":"CITY","text":"DM #1 delivered to A02 at minute 0 (receipt R-0001): \\"hi\\""}']);
		const status = await say(test, "A01", "getStatus", {});
		expect(status).toContain("unread DMs: 0\n");
		expect(status).toContain("DMs: 1 of 8 sent since minute 0; a new allowance at minute 6\nreceipts:");
	});
});

describe("the blame desk's checks", () => {
	const facts = (overrides: Partial<BlameFacts> = {}): BlameFacts => ({
		dm: (number) => (number === 41 ? { from: "A01", to: "A02", text: "Here: 123456", deliveredMinute: 4, deliveredAfter: 45 } : number === 7 ? { from: "A01", to: "A02" } : undefined),
		board: () => undefined,
		group: (number) => (number === 50 ? { group: "G1", author: "A02", text: "A01 sent me nothing" } : undefined),
		couldRead: (_group, reader) => reader === "A01",
		...overrides,
	});

	it("accepts a group post the caller could read and refuses one it could not", () => {
		expect(checkBlame(facts(), "A01", "A02", 41, 50)).toMatchObject({ kind: "pending", claim: { channel: "group", group: "G1", number: 50 } });
		expect(checkBlame(facts({ couldRead: () => false }), "A01", "A02", 41, 50)).toMatchObject({ kind: "rejected", reason: "you could not read message #50 in group G1" });
	});

	it("keeps no record of DMs from before the city numbered its messages", () => {
		expect(checkBlame(facts(), "A01", "A02", 7, 50)).toEqual({ kind: "rejected", reason: "the city kept no delivery record of DM #7 (it was sent before the city numbered its messages)" });
	});

	it("masks numbers of four or more digits and cuts long quotes", () => {
		expect(recordQuote("code 1234 and 56")).toBe('"code [number] and 56"');
		expect(recordQuote("x".repeat(80))).toBe(`"${"x".repeat(59)}…"`);
	});
});

const fail = (): never => {
	throw new RangeError("an empty draw");
};

describe("the sample of blame", () => {
	it("gives the caller's DM and the accused's answer to it, one time in eight, draws nothing without such a pair, and the sampled call is taken", async () => {
		const test = await city(scriptedJudge([{ deniesReceipt: true }]));
		const nexts: number[] = [];
		const random = (next: number): RandomSource => ({ next: () => (nexts.push(next), next), int: (_min, max) => max, pick: (items) => items[0] ?? fail(), shuffle: (items) => [...items] });
		const logged = test.kernel.log.all().length;
		expect([test.kernel.sample("resident:A01", "blame", random(0.125)), test.kernel.sample("resident:A01", "blame", random(0))]).toEqual([undefined, { dm: 1, accused: "A02", claim: 2 }]);
		// A02 was answered by nobody, A03 wrote no DM: no pair, and nothing is drawn.
		const drawn = nexts.length;
		expect([test.kernel.sample("resident:A02", "blame", random(0)), test.kernel.sample("resident:A03", "blame", random(0))]).toEqual([undefined, undefined]);
		expect([nexts.length, test.kernel.log.all().length]).toEqual([drawn, logged]);
		expect(await say(test, "A01", "blame", { dm: 1, accused: "A02", claim: 2 })).toMatch(/^upheld · /);
		// The pair is spent: the sample offers it no more.
		expect(test.kernel.sample("resident:A01", "blame", random(0))).toBeUndefined();
	});
});
