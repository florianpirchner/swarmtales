// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The judge, against the old `test/overseers/judge.test.ts`: played through the real `blame` of `receipts` on the
 * real `ledger`, `channels`, `exile` and `progression`, with a scripted answerer that asks the judge's own `system`
 * and `input`. The question is the old `judgePrompt` in full, the system text the old one of the temper; a failed
 * answer, one off the schema, and one over the old 400 characters are `JUDGE_FAILED`, as before.
 */
import { describe, expect, it } from "vitest";
import { channels } from "@swarmtales/mechanic-channels";
import { exile } from "@swarmtales/mechanic-exile";
import { ledger } from "@swarmtales/mechanic-ledger";
import { LevelPiecesService, progression } from "@swarmtales/mechanic-progression";
import { receipts } from "@swarmtales/mechanic-receipts";
import { defineGame, defineHead, defineMechanic } from "@swarmtales/sdk";
import { idleDriver, testKernel } from "@swarmtales/testkit";
import { judge, JudgeAnswer, JUDGE_VERDICT_TEXT, judgeOptions, type JudgeTemper } from "../src/index.ts";
import { scriptedAnswerer, type Asked } from "./answerer.ts";
import { lookup } from "./support.ts";

// Stands in for `puzzles`: no level has pieces.
const pieces = defineMechanic(defineHead({ id: "puzzles", package: "@test/puzzles", summary: "Test: no pieces.", provides: [LevelPiecesService] }), {
	services: {
		"level-pieces": { deal: () => null, solutionOf: () => null, kindOf: () => "none", teamOf: ({ resident }) => ({ members: [resident], leader: resident }), taskValues: () => ({ length: "", overlap: "", fragment: "", digits: "", factors: "" }), holders: () => [] },
	},
});

/** The old question of the scenario, as `judgePrompt` wrote it. */
const QUESTION = [
	"Delivered message: DM #1 from A01 to A02, delivered by the city.",
	'Its text: "Door 2 is open."',
	"",
	"Later message #2 by A02, a direct message to the sender.",
	'Its text: "I never got a DM from you."',
	"",
	"Where they stand (of 4): A01: 7 points, rank 4 · A02: 13 points, rank 1.",
	"",
	"A01 blames A02: does message #2 deny that A02 received DM #1 from A01?",
].join("\n");

// A01's DM #1 is delivered to A02, A02 answers with DM #2; then A01 blames A02 for it.
async function blame(answers: readonly unknown[], temper: JudgeTemper = "fair", asked: Asked[] = []): Promise<string> {
	const options = judgeOptions(lookup, temper);
	const game = defineGame({
		id: "judge-test",
		seed: 7,
		residents: ["A01", "A02", "A03", "A04"],
		mechanics: [ledger({ startPoints: 10 }), channels(), exile(), pieces(), progression({ blamePenalty: [5, 8] }), receipts()],
		directors: [{ use: judge, options }],
		scheduler: { id: "turns", options: { passes: 1, activation: "always", order: "roster", afterBlocks: ["director"] } },
		end: { ticks: 8 },
	});
	const test = testKernel(game, { review: scriptedAnswerer(judge, options, answers, asked) });
	await test.call("A01", "transferPoints", { target: "A02", amount: 3, memo: "thanks" });
	await test.call("A01", "sendDM", { target: "A02", message: "Door 2 is open." });
	await test.playTicks(idleDriver, 1);
	await test.call("A02", "sendDM", { target: "A01", message: "I never got a DM from you." });
	await test.playTicks(idleDriver, 1);
	const outcome = await test.call("A01", "blame", { dm: 1, accused: "A02", claim: 2 });
	return outcome.ok ? outcome.reply : outcome.code;
}

describe("the judge", () => {
	it("is asked the old question in full with the system text of its temper, and its ruling upholds the blame", async () => {
		const asked: Asked[] = [];
		expect(await blame([{ deniesReceipt: true, board: "Plain as day.", gamemaker: "A02 lied." }], "fair", asked)).toMatch(/^upheld · A02 pays 5 points/);
		expect(asked.map((entry) => entry.input)).toEqual([QUESTION]);
		expect(asked[0]?.system).toBe(lookup.render("city-directors", "judge/system-fair", {}, []));
		expect(asked[0]?.system).toContain("You are fair beyond reproach.");
	});

	it.each(["partial", "capricious"] as const)("keeps the %s temper: its system text, the same question, its ruling", async (temper) => {
		const asked: Asked[] = [];
		expect(await blame([{ deniesReceipt: false, board: "Not so." }], temper, asked)).toMatch(/^rejected · /);
		expect(asked[0]?.system).toBe(lookup.render("city-directors", `judge/system-${temper}`, {}, []));
		expect(asked[0]?.system).not.toBe(judgeOptions(lookup).system);
		expect(asked[0]?.input).toBe(QUESTION);
	});

	it("leaves the blame without effect when the answer fails, does not fit, or passes the old 400 characters", async () => {
		const answers = [[], [{ deniesReceipt: "maybe" }], [{ deniesReceipt: true, board: "x".repeat(401) }]];
		expect(await Promise.all(answers.map((list) => blame(list)))).toEqual(["JUDGE_FAILED", "JUDGE_FAILED", "JUDGE_FAILED"]);
		expect(await blame([{ deniesReceipt: true, board: "x".repeat(400) }])).toMatch(/^upheld/);
	});

	it("is the answerer judge, woken by nothing else, its answer described by the old verdict tool's text", () => {
		expect([judge.id, judge.answers, judge.on, judge.acts]).toEqual(["judge", "judge", [], "answer"]);
		expect(JUDGE_VERDICT_TEXT).toBe(lookup.render("city-directors", "judge/tool-verdict", {}, []));
		expect(judge.output).toBe(JudgeAnswer);
		expect(JudgeAnswer).toMatchObject({ description: JUDGE_VERDICT_TEXT });
	});
});
