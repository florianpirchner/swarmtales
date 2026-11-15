// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The second half of the port (M5-64): the additive levels (`factors_dealt`, the factors block, `holders`, the
 * code, `revealFactor`), the pieces held for others and a bequeathed piece at the exile (erratum J27), the deal at a
 * door (`holdAfter`), the facts and the slice, against the City of Keys oracles of seed 7 where they hold the line.
 */
import { resolve } from "node:path";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { channels } from "@swarmtales/mechanic-channels";
import { exile } from "@swarmtales/mechanic-exile";
import { ledger } from "@swarmtales/mechanic-ledger";
import { standoff } from "@swarmtales/mechanic-standoff";
import { progression } from "@swarmtales/mechanic-progression";
import { LevelPiecesService } from "@swarmtales/mechanic-progression/contract";
import { defineHead, defineMechanic, reply } from "@swarmtales/sdk";
import { checkResumeEveryBoundary, projectionDifference, projectLog, projectOracle, readOracle, scriptedDriver, testKernel, type TestKernel } from "@swarmtales/testkit";
import { PuzzlesService } from "../src/contract.ts";
import { city, judge, oracleEvents, prompts, STORY_LEVELS, written, type Options } from "./support.ts";

const OnLevel = Type.Object({ level: Type.Integer() });
const Release = Type.Object({ level: Type.Integer(), target: Type.Union([Type.Literal("board"), Type.Array(Type.String())]) });
// Asks `level-pieces` what `progression` would: the task values, the holders, the code and the kind; `open` deals a level at its door.
const asker = defineMechanic(
	defineHead({ id: "asker", package: "@test/asker", summary: "Test: asks the pieces.", uses: [LevelPiecesService, PuzzlesService], tools: { reveal: { description: "Test: releases.", params: Release, for: ["resident"] }, pieces: { description: "Test: asks.", params: OnLevel, for: ["resident"] }, open: { description: "Test: opens a door.", params: OnLevel, for: ["resident"] } } }),
	{
		tools: {
			reveal: { run: (params, ctx) => reply(JSON.stringify(ctx.tryCall(PuzzlesService, "revealFactor", params))) },
			open: { run: ({ level }, ctx) => reply(String(ctx.tryCall(LevelPiecesService, "deal", { level }))) },
			pieces: {
				run: ({ level }, ctx) => {
					const on = { resident: ctx.resident ?? "", level };
					return reply(JSON.stringify([ctx.tryCall(LevelPiecesService, "taskValues", on), ctx.tryCall(LevelPiecesService, "holders", on), ctx.tryCall(LevelPiecesService, "solutionOf", on), ctx.tryCall(LevelPiecesService, "kindOf", { level })]));
				},
			},
		},
	},
);

const at = (level: number, passed: readonly number[]) => Object.fromEntries(["A01", "A02", "A03", "A04", "A05", "A06"].map((id) => [id, { level, passed: [...passed] }]));
const AT_DOOR_8 = at(8, [1, 2, 3, 4, 5, 6, 7]);
const cityOf = (options: Options = {}) => city(7, { levels: STORY_LEVELS, ...options }, (own) => [ledger(), channels(), exile(), judge(), own, asker()]);
const run = (options: Options = {}): TestKernel => testKernel(cityOf(options));
const answer = async (test: TestKernel, resident: string, tool: string, params: unknown): Promise<string> => {
	const outcome = await test.call(resident, tool, params);
	return outcome.ok ? outcome.reply : `${outcome.code}: ${outcome.detail ?? ""}`;
};
const asked = (text: string): readonly unknown[] => Value.Parse(Type.Array(Type.Unknown()), JSON.parse(text));
const of = (test: TestKernel, type: string): readonly unknown[] => written(test.kernel.log.all(), "puzzles").flatMap(([found, payload]) => (found === type ? [payload] : []));
const FACTORS = [{ source: "puzzles", type: "factors_dealt" }] as const;

describe("the additive levels", () => {
	it.each(["cityofkeys-act1-s7", "cityofkeys-act1-s11", "cityofkeys-burn-s7"])("%s: every factors_dealt payload is byte-equal", (file) => {
		const oracle = readOracle(resolve(import.meta.dirname, `../../../oracles/cityofkeys/${file}.json`));
		const expected = projectOracle(oracle.timeline, FACTORS);
		const actual = projectLog(testKernel(city(oracle.seed, { levels: STORY_LEVELS }), { prompts }).kernel.log.all(), FACTORS);
		expect([expected.length, projectionDifference(expected, actual)]).toEqual([3, undefined]);
	});

	it("writes A06's factors block of door 8, its holders and its code as the task of cityofkeys-act2-s7 has them", async () => {
		const test = run({ standings: AT_DOOR_8 });
		const [values, holders, code, kind] = asked(await answer(test, "A06", "pieces", { level: 8 }));
		const block = ["Your salt: 048136", "City factor: the city posts it on the board.", "Team certificate: held by A05.", "Your counter-factor: held by A05.", "You hold the counter-factor of A05: 135573. A05 needs it."];
		expect(values).toEqual({ length: "6", overlap: "", fragment: "", digits: "6", factors: block.join("\n") });
		expect(holders).toEqual([{ holder: "A05", piece: "counter-factor", value: "568278" }, { holder: "A05", piece: "team certificate", value: "847454" }]);
		const dealt = JSON.stringify(oracleEvents("cityofkeys-act1-s7", "puzzles", "factors_dealt")[0]);
		expect([dealt.includes(`{"agent":"A06","team":2,"salt":"048136"`), dealt.includes(`"code":"${String(code)}"`), kind]).toEqual([true, true, "additive"]);
		expect(test.fact("puzzles.needs")).toContainEqual({ agent: "A06", level: 8, fragments: false, on: ["A05"] });
		const { numbers } = Value.Parse(Type.Object({ numbers: Type.Array(Type.String()) }), test.fact("puzzles.secrets"));
		expect(["048136", "847454"].filter((value) => numbers.includes(value))).toEqual(["048136", "847454"]);
	});

	it("releases a city factor through `deal`: on the board once, privately once per resident, never on a fragment level", async () => {
		const test = run();
		const reveal = async (params: unknown): Promise<unknown> => JSON.parse(await answer(test, "A01", "reveal", params));
		expect(await reveal({ level: 8, target: "board" })).toEqual({ ok: true, agents: [] });
		expect(await reveal({ level: 10, target: "board" })).toEqual({ ok: false, code: "PER_TEAM", detail: "every team of level 10 has its own city factor" });
		expect(await reveal({ level: 10, target: ["A01", "A02", "A01"] })).toEqual({ ok: true, agents: ["A01", "A02"] });
		expect(await reveal({ level: 10, target: ["A02", "A03"] })).toEqual({ ok: true, agents: ["A03"] });
		expect(await reveal({ level: 4, target: "board" })).toEqual({ ok: false, code: "NOT_ADDITIVE", detail: "level 4 has no factors" });
		expect(await reveal({ level: 11, target: "board" })).toEqual({ ok: false, code: "NOT_PLAYED", detail: "level 11 is not played in this run" });
		expect(of(test, "factor_revealed")).toEqual([{ level: 8, target: "board", agents: [] }, { level: 10, target: "notice", agents: ["A01", "A02"] }, { level: 10, target: "notice", agents: ["A03"] }]);
		const posts = test.kernel.log.all().filter((event) => event.type === "board_post" || event.type === "notice").map((event) => JSON.stringify(event.payload));
		expect([posts.length, posts[0]?.includes('"text":"City factor of level 8: 261330."')]).toEqual([4, true]);
	});

	it("deals the levels after `holdAfter` only when the door opens, and writes their deal then", async () => {
		const test = run({ holdAfter: 7 });
		expect([test.fact("puzzles.dealt"), of(test, "factors_dealt")]).toEqual([[1, 2, 3, 4, 5, 6, 7], []]);
		expect(asked(await answer(test, "A01", "pieces", { level: 8 }))[3]).toBe("none");
		for (const level of [8, 9, 10, 8]) await test.call("A01", "open", { level });
		expect(of(test, "factors_dealt")).toEqual(oracleEvents("cityofkeys-act1-s7", "puzzles", "factors_dealt"));
	});

	it("resumes at every tick boundary with the factors, the releases, the delivered messages and a will in its slice", async () => {
		const plans: Readonly<Record<string, readonly { readonly tool: string; readonly params: unknown }[]>> = {
			"0:resident:A01": [{ tool: "gate", params: { target: "A05" } }, { tool: "sendDM", params: { target: "A02", message: "hello" } }],
			"1:resident:A05": [{ tool: "lastWill", params: { text: "Yours.", bequests: [{ to: "A06", factor: "L8-certificate" }] } }],
			"2:resident:A06": [{ tool: "strike", params: { target: "A05" } }, { tool: "pieces", params: { level: 8 } }],
		};
		const resident = scriptedDriver((activation) => plans[`${String(activation.tick)}:${activation.actor}`] ?? []);
		expect(await checkResumeEveryBoundary(cityOf({ standings: AT_DOOR_8 }), () => ({ resident }))).toEqual([]);
		// A snapshot fits only the game it was taken from, so a resumed run never meets levels its snapshot lacks (old `World#restore`).
		const short = run({ lastLevel: 7 });
		expect(() => testKernel(cityOf(), { resume: { snapshot: structuredClone(short.kernel.snapshot()), log: structuredClone([...short.kernel.log.all()]) } })).toThrow(/SWT-R002/);
	});
});

describe("the pieces at the exile", () => {
	it("gives the standoff every piece a resident holds: its rule refuses an unknown one in the words of cityofkeys-act2-s7, and a will delivers once", async () => {
		const test = testKernel(city(7, { levels: STORY_LEVELS, standings: AT_DOOR_8 }, (own) => [ledger(), channels(), exile(), judge(), progression({ levels: Array.from({ length: 10 }, (_, index) => ({ number: index + 1, title: "Door", reward: 5, tools: [], task: "Level {level}" })), managed: [] }), own, standoff()]));
		await test.call("A01", "gate", { target: "A05" });
		const will = (factor: string) => ({ text: "Everything to A04.", bequests: [{ to: "A06", factor }] });
		expect(await answer(test, "A05", "lastWill", will("L8-counter-A99"))).toBe("UNKNOWN_FACTOR: you hold no L8-counter-A99; you hold: L2-fragment, L3-fragment, L4-fragment, L5-fragment, L6-fragment, L7-fragment, L8-certificate, L8-counter-A06");
		expect(await answer(test, "A05", "lastWill", will("L8-certificate"))).not.toMatch(/^[A-Z_]+:/);
		const notices = test.kernel.log.all().filter((event) => event.type === "notice").map((event) => JSON.stringify(event.payload));
		expect(notices.filter((text) => text.includes("847454"))).toEqual(['{"to":"A06","author":"CITY","text":"A05\'s last will leaves you the team certificate of door 8: 847454."}']);
	});

	it("burns no bequeathed fragment, and contracts the levels 5 to 10 as the oracle's first exile", async () => {
		const test = run({ standings: at(4, [1, 2, 3]) });
		await test.call("A01", "gate", { target: "A04" });
		expect(await answer(test, "A04", "lastWill", { text: "For A05.", bequests: [{ to: "A05", factor: "L4-fragment" }] })).not.toMatch(/^[A-Z_]+:/);
		await test.call("A06", "strike", { target: "A04" });
		expect(of(test, "factor_burned")).toEqual([]);
		expect(of(test, "level_contracted")).toEqual(oracleEvents("cityofkeys-burn-s7", "puzzles", "level_contracted").slice(0, 6));
	});
});
