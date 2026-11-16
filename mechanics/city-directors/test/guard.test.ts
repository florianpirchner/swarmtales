// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The guard, against the old `test/interpret/guard.test.ts`: played through the `review` handler of the real
 * `puzzles` on the real `channels`, with a scripted answerer that asks the guard's own `system` and `input`. The
 * city's check runs first and asks nothing; a text it lets through is asked with the rule, the author's secrets and
 * the old pieces; a verdict against the rule is `GUARD_BLOCKED` with its reason, and a failed or unfit answer lets
 * the call through.
 */
import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { channels } from "@swarmtales/mechanic-channels";
import { exile } from "@swarmtales/mechanic-exile";
import { ledger } from "@swarmtales/mechanic-ledger";
import { puzzles } from "@swarmtales/mechanic-puzzles";
import { defineGame } from "@swarmtales/sdk";
import { testKernel, type TestKernel } from "@swarmtales/testkit";
import { guard, GuardAnswer, GUARD_VERDICT_TEXT, guardOptions, guardPrompt } from "../src/index.ts";
import { scriptedAnswerer, type Asked } from "./answerer.ts";
import { lookup } from "./support.ts";

const RULE = "No fragments, seams or any part of a password on the board.";
const guards = [{ id: "no-fragments", rule: RULE, tools: ["postBoard", "postGroup", "transferPoints", "createGroup"], minRun: 3 }];
const LEVELS = [{ number: 1, team: { kind: "random", size: 3 } as const, puzzle: { kind: "fragments" as const, length: [12, 14] satisfies [number, number], overlap: 2 } }];
const options = guardOptions(lookup);

function city(answers: readonly unknown[], asked: Asked[] = []): TestKernel {
	const game = defineGame({
		id: "guard-test",
		seed: 7,
		residents: ["A01", "A02", "A03"],
		mechanics: [ledger({ startPoints: 10 }), channels(), exile(), puzzles({ levels: LEVELS, guards })],
		directors: [{ use: guard, options }],
		scheduler: { id: "turns", options: { passes: 1, activation: "always", order: "roster", afterBlocks: ["director"] } },
		end: { ticks: 3 },
	});
	return testKernel(game, { review: scriptedAnswerer(guard, options, answers, asked) });
}

const Dealt = Type.Object({ holdings: Type.Array(Type.Object({ agent: Type.String(), fragment: Type.String() })) });
const fragmentOf = (test: TestKernel, agent: string): string => Value.Parse(Dealt, test.kernel.log.all().find((event) => event.type === "fragments_dealt")?.payload).holdings.find((held) => held.agent === agent)?.fragment ?? "";
const post = async (test: TestKernel, message: string): Promise<string> => {
	const outcome = await test.call("A01", "postBoard", { message });
	return outcome.ok ? "ok" : `${outcome.code}: ${outcome.detail ?? ""}`;
};

describe("the guard", () => {
	it("is not asked when the city's check refuses, and is asked the old question with the author's secrets", async () => {
		const asked: Asked[] = [];
		const test = city([{ allowed: false, reason: "It names a seam of door 1." }], asked);
		const own = fragmentOf(test, "A01");
		expect(await post(test, `Mine: ${own}`)).toBe("GUARD_BLOCKED: the post carries part of a fragment; fragments travel by DM");
		expect(asked).toEqual([]);
		expect(await post(test, "Who has door 1?")).toBe("GUARD_BLOCKED: It names a seam of door 1.");
		expect(asked.map((entry) => entry.input)).toEqual([
			[
				`The city's rule: ${RULE}`,
				"",
				"A01 wants to send a public board post, read by every resident.",
				"",
				"Secrets the author holds, which the city keeps from the others:",
				`- your fragment of door 1: ${own}`,
				"",
				'The message: "Who has door 1?"',
				"",
				"Does the message keep the rule?",
			].join("\n"),
		]);
		expect(asked[0]?.system).toBe(lookup.render("city-directors", "guard/system", {}, []));
	});

	it("lets the call through on a verdict for the rule, and fails open on a failed or unfit answer", async () => {
		const asked: Asked[] = [];
		const test = city([{ allowed: true, reason: "Fine." }, undefined, { allowed: false }, { allowed: false, reason: "x".repeat(301) }], asked);
		expect(await Promise.all(["one", "two", "three", "four"].map((message) => post(test, message)))).toEqual(["ok", "ok", "ok", "ok"]);
		expect(asked).toHaveLength(4);
	});

	it("tells the model each guarded tool's text, any other tool by name, and no secrets heading without secrets", () => {
		const question = { resident: "A02", tool: "transferPoints", rule: "No fragments.", text: "for the gate", secrets: [] };
		expect(guardPrompt(question, options)).toBe('The city\'s rule: No fragments.\n\nA02 wants to send the memo of a points transfer, read by the recipient and shown on its receipt.\n\nThe message: "for the gate"\n\nDoes the message keep the rule?');
		expect(guardPrompt({ ...question, tool: "createGroup" }, options)).toContain("the name of a new group, read by every member it adds");
		expect(guardPrompt({ ...question, tool: "nominate", text: "y".repeat(2001) }, options)).toContain(`A02 wants to send a message (nominate).\n\nThe message: "${"y".repeat(2000)}"`);
	});

	it("is the answerer guard, woken by nothing else, its answer described by the old verdict tool's text", () => {
		expect([guard.id, guard.answers, guard.on, guard.acts]).toEqual(["guard", "guard", [], "answer"]);
		expect(GUARD_VERDICT_TEXT).toBe(lookup.render("city-directors", "guard/tool-verdict", {}, []));
		expect(guard.output).toBe(GuardAnswer);
		// Runtime revision 8 (B2): the title asks the engine for the answer tool `verdict`, the name its system text gives.
		expect(GuardAnswer).toMatchObject({ title: "verdict", description: GUARD_VERDICT_TEXT });
		expect(options.system).toContain("Call the tool verdict exactly once");
	});
});
