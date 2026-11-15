// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The second part of the port, first half: `puzzles` provides `level-pieces` to the real `progression` and reads
 * where a resident stands from its events (erratum J34); the service `deal` (`passwordPiece`, `carriesSecret`,
 * `isHandover`); a strike that keeps (erratum J28); the secret check of a Director's note (old `secret-guard.ts`).
 */
import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import type { ActorDriver } from "@swarmtales/contracts";
import { channels } from "@swarmtales/mechanic-channels";
import { exile } from "@swarmtales/mechanic-exile";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { ledger } from "@swarmtales/mechanic-ledger";
import { LevelPiecesService, progression } from "@swarmtales/mechanic-progression";
import { defineGame, defineHead, defineMechanic, reply, type Game } from "@swarmtales/sdk";
import { checkResumeEveryBoundary, scriptedDriver, testKernel, type TestKernel } from "@swarmtales/testkit";
import { PuzzlesService } from "../src/contract.ts";
import { assembleAll, puzzles } from "../src/index.ts";

const Ask = Type.Object({ text: Type.String(), by: Type.Optional(Type.String()) });
// Asks the deal what a game mechanic would: the service `deal`, the task values, and a strike.
const asker = defineMechanic(
	defineHead({
		id: "asker",
		package: "@test/asker",
		summary: "Test: asks the deal.",
		uses: [PuzzlesService, LevelPiecesService, ExileService],
		tools: { ask: { description: "Test: asks.", params: Ask, for: ["resident"] }, task: { description: "Test: the task.", params: Ask, for: ["resident"] }, strike: { description: "Test: banishes.", params: Ask, for: ["resident"] }, call: { description: "Test: calls.", params: Type.Object({ reason: Type.String() }), for: ["resident"] } },
	}),
	{
		tools: {
			ask: { run: ({ text }, ctx) => reply(JSON.stringify(["passwordPiece", "carriesSecret", "isHandover"].map((method) => (method === "passwordPiece" ? ctx.tryCall(PuzzlesService, "passwordPiece", { token: text }) : method === "carriesSecret" ? ctx.tryCall(PuzzlesService, "carriesSecret", { resident: ctx.resident ?? "", text, minRun: 3 }) : ctx.tryCall(PuzzlesService, "isHandover", { text }))))) },
			task: { run: (_params, ctx) => reply(ctx.tryCall(LevelPiecesService, "taskValues", { resident: ctx.resident ?? "", level: 1 })?.fragment ?? "") },
			call: { run: () => reply("called") },
			strike: { run: ({ text, by }, ctx) => reply(JSON.stringify(ctx.tryCall(ExileService, "banish", { resident: text, ...(by === undefined ? {} : { by }) }))) },
		},
	},
);

const fragments = { kind: "fragments" as const, length: [10, 12] satisfies [number, number], overlap: 2 };
const LEVELS = [1, 2].map((number) => ({ number, team: { kind: "random", size: 3 } as const, puzzle: fragments }));
const TOOLS = ["getProblem", "submitSolution", "ask", "task", "strike", "call"];
const level = (number: number) => ({ number, title: `Door ${String(number)}`, reward: 5, tools: TOOLS, task: "Level {level}: {fragment}" });

function game(ticks = 4): Game {
	return defineGame({
		id: "puzzles-pieces",
		seed: 7,
		residents: ["A01", "A02", "A03"],
		mechanics: [ledger({ startPoints: 10 }), channels(), exile(), progression({ levels: [level(1), level(2)], survivors: 2, finishedNotice: "done", managed: [] }), puzzles({ levels: LEVELS, noteTools: ["notify", "boardNote", "call"] }), asker()],
		grants: { script: ["notify", "boardNote"] },
		scheduler: { id: "turns", options: { passes: 1, activation: "always", order: "roster" } },
		end: { ticks },
	});
}

const Dealt = Type.Object({ level: Type.Integer(), holdings: Type.Array(Type.Object({ agent: Type.String(), team: Type.Integer(), fragment: Type.String() })) });

// The fragments of a level and its password, from the deal's audit record.
function dealOf(test: TestKernel, number: number): { readonly fragments: Readonly<Record<string, string>>; readonly password: string } {
	const deal = test.kernel.log.all().flatMap((event) => (event.type === "fragments_dealt" ? [Value.Parse(Dealt, event.payload)] : [])).find((entry) => entry.level === number);
	const holdings = deal?.holdings ?? [];
	return { fragments: Object.fromEntries(holdings.map((entry) => [entry.agent, entry.fragment])), password: assembleAll(holdings.map((entry) => entry.fragment), 2)[0] ?? "" };
}

const answer = async (test: TestKernel, resident: string, tool: string, params: unknown): Promise<string> => {
	const outcome = await test.call(resident, tool, params);
	return outcome.ok ? outcome.reply : `${outcome.code}: ${outcome.detail ?? ""}`;
};

describe("level-pieces for progression, the standing from its events", () => {
	it("answers the codes progression asks, and guards a level until every resident in the city has passed it", async () => {
		const test = testKernel(game());
		const one = dealOf(test, 1);
		const two = dealOf(test, 2);
		const fragment = one.fragments.A01 ?? "";
		expect(one.password.length).toBeGreaterThanOrEqual(10);
		expect(await answer(test, "A01", "ask", { text: fragment })).toBe("[true,true,true]");
		expect(await answer(test, "A01", "ask", { text: "hello there" })).toBe("[false,false,false]");
		for (const resident of ["A01", "A02"]) expect(await answer(test, resident, "submitSolution", { level: 1, code: one.password })).toMatch(/^correct/);
		// A03 has not passed level 1: its fragments stay guarded.
		expect(JSON.parse(await answer(test, "A01", "ask", { text: fragment }))).toEqual([true, true, true]);
		expect(await answer(test, "A03", "submitSolution", { level: 1, code: one.password })).toMatch(/^correct/);
		// Every resident passed level 1 (`level_up`, `level_entered`): only level 2 is guarded now.
		expect(JSON.parse(await answer(test, "A01", "ask", { text: fragment }))).toEqual([true, false, true]);
		expect(JSON.parse(await answer(test, "A01", "ask", { text: two.fragments.A02 ?? "" }))).toEqual([true, true, true]);
		expect(await answer(test, "A01", "getProblem", { level: 2 })).toContain(`Level 2: ${two.fragments.A01 ?? ""}`);
	});

	it("keeps the fragments and the points of a strike that keeps, and gives the fragments to every teammate left", async () => {
		const test = testKernel(game());
		const one = dealOf(test, 1);
		expect(await answer(test, "A02", "strike", { text: "A01", by: "holdout" })).toContain('"ok":true');
		const written = test.kernel.log.all().map((event) => event.type);
		expect(written.filter((type) => type === "factor_burned" || type === "level_contracted")).toEqual([]);
		for (const heir of ["A02", "A03"]) expect(await answer(test, heir, "task", { text: "" })).toBe(`${one.fragments[heir] ?? ""}; you also hold the fragment of A01, who was exiled: ${one.fragments.A01 ?? ""}`);
		// A banishment burns as before: A02's fragment of door 1 is gone for A03, who has not passed it.
		await answer(test, "A03", "strike", { text: "A02" });
		expect(test.kernel.log.all().filter((event) => event.type === "factor_burned").map((event) => event.payload)).toEqual([{ agent: "A02", level: 1, piece: "L1-fragment", needers: ["A03"] }]);
	});

	it("resumes at every tick boundary with the standings and the struck in its slice", async () => {
		const { password } = dealOf(testKernel(game()), 1);
		const plan = (tick: number, actor: string) => (tick === 1 ? [{ tool: "submitSolution", params: { level: 1, code: password } }] : tick === 2 && actor === "resident:A03" ? [{ tool: "strike", params: { text: "A01", by: "holdout" } }] : [{ tool: "task", params: { text: "" } }]);
		const resident: ActorDriver = scriptedDriver((activation) => plan(activation.tick, activation.actor));
		expect(await checkResumeEveryBoundary(game(4), () => ({ resident }))).toEqual([]);
	});
});

describe("the secret check of a Director's note", () => {
	it("refuses a note with a piece of a dealt password in the old words, at stage rule, and lets another through", async () => {
		const test = testKernel(game());
		const { password } = dealOf(test, 2);
		const note = async (tool: string, params: unknown): Promise<string> => {
			const outcome = await test.kernel.submit({ actor: "script", as: tool, params });
			return outcome.ok ? outcome.reply : `${outcome.code}: ${outcome.detail ?? ""}`;
		};
		expect(await note("notify", { agent: "A02", text: `A02, try ${password.slice(2, 7)} tonight.` })).toBe("LEAK_BLOCKED: the text contains a password piece; never write codes");
		expect(await note("boardNote", { text: password.slice(0, 5).toLowerCase() })).toBe("LEAK_BLOCKED: the text contains a password piece; never write codes");
		expect(await note("notify", { agent: "A02", text: "A02, the city keeps count of every point." })).toBe("delivered to A02 as #1");
		const refused = test.kernel.log.all().filter((event) => event.type === "tool_refused").map((event) => Value.Parse(Type.Object({ stage: Type.String(), code: Type.String() }), event.payload));
		expect(refused.map(({ stage, code }) => `${stage} ${code}`)).toEqual(["rule LEAK_BLOCKED", "rule LEAK_BLOCKED"]);
	});

	it("reads the `reason` of a note tool that has no `text`, as a tribunal's call (erratum J134)", async () => {
		const test = testKernel(game());
		const { password } = dealOf(test, 1);
		const call = async (reason: string): Promise<string> => {
			const outcome = await test.call("A01", "call", { reason });
			return outcome.ok ? outcome.reply : outcome.code;
		};
		expect([await call(`A02 hides ${password.slice(1, 6)}`), await call("A02 hides a fragment")]).toEqual(["LEAK_BLOCKED", "called"]);
	});
});
