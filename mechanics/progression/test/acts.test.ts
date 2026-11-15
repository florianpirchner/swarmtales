// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The second half of the port (M5-20) where no oracle file reaches: the acts and the ladders that restart with them,
 * the end of every act with the run, the unlocks of a caller, the lock of `submitSolution` at the gate, the service
 * `progression` (the solves, the doors, the blame's charge, the ranking), the figures of the cast in `listAgents`,
 * and a resume at every boundary with the acts in the slice.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { ExileEvents, ExileService } from "@swarmtales/mechanic-exile/contract";
import { channels } from "@swarmtales/mechanic-channels";
import { ledger } from "@swarmtales/mechanic-ledger";
import { defineGame, defineHead, defineMechanic, refuse, reply, type MechanicUse } from "@swarmtales/sdk";
import type { ToolOutcome } from "@swarmtales/contracts";
import { checkResumeEveryBoundary, fakeDriver, testKernel } from "@swarmtales/testkit";
import { CastExtrasService, LevelPiecesService, progression, ProgressionService } from "../src/index.ts";
import { MANAGED } from "./support.ts";

const CODES: Readonly<Record<number, string>> = { 1: "AAA", 2: "BBB", 3: "CCC" };
const pieces = defineMechanic(defineHead({ id: "puzzles", package: "@test/puzzles", summary: "Test: fixed codes.", provides: [LevelPiecesService] }), {
	services: {
		"level-pieces": {
			deal: () => null,
			solutionOf: ({ level }) => CODES[level] ?? null,
			kindOf: () => "fragments",
			teamOf: ({ resident }) => ({ members: [resident], leader: resident }),
			taskValues: () => ({ length: "3", overlap: "0", fragment: "A", digits: "", factors: "" }),
			holders: ({ level }) => (level === 2 ? [{ holder: "A03", piece: "team certificate", value: "X" }] : []),
		},
	},
});

// Asks the service `progression` by name: `{ "ask": "passed", "input": { "level": 1 } }`.
const Ask = Type.Object({
	ask: Type.String({ description: "The method" }),
	input: Type.Object({ resident: Type.Optional(Type.String({ description: "A resident" })), level: Type.Optional(Type.Integer({ description: "A level" })) }, { description: "Its input" }),
});
const asker = defineMechanic(defineHead({ id: "asker", package: "@test/asker", summary: "Test: asks the progression.", requires: [ProgressionService], tools: { ask: { description: "Test: one method.", params: Ask, for: ["resident"] } } }), {
	tools: {
		ask: {
			run: ({ ask, input }, ctx) => {
				const resident = input.resident ?? "A01";
				const level = input.level ?? 1;
				const answers = {
					passed: () => ctx.call(ProgressionService, "passed", { level }),
					lastProgress: () => ctx.call(ProgressionService, "lastProgress", { resident }),
					hasSolved: () => ctx.call(ProgressionService, "hasSolved", { resident, level }),
					currentAct: () => ctx.call(ProgressionService, "currentAct", {}),
					actStart: () => ctx.call(ProgressionService, "actStart", { fromLevel: level }),
					door: () => ctx.call(ProgressionService, "door", {}),
					doorShut: () => ctx.call(ProgressionService, "doorShut", {}),
					releaseDoor: () => ctx.call(ProgressionService, "releaseDoor", {}),
					unlock: () => ctx.call(ProgressionService, "unlock", { resident, tools: ["createGroup", "listMyGroups"] }),
					chargeBlame: () => ctx.call(ProgressionService, "chargeBlame", { resident }),
					nextBlamePenalty: () => ctx.call(ProgressionService, "nextBlamePenalty", { resident }),
					endAct: () => ctx.call(ProgressionService, "endAct", { fromLevel: level }),
					bounds: () => ctx.call(ProgressionService, "bounds", {}),
					ranking: () => ctx.call(ProgressionService, "ranking", {}).map((entry) => `${entry.rank} ${entry.agent} ${String(entry.points)}`),
					holdersBehind: () => ctx.call(ProgressionService, "holdersBehind", { resident, level }),
				};
				const found = Object.entries(answers).find(([name]) => name === ask)?.[1];
				return found === undefined ? refuse("UNKNOWN_METHOD") : reply(JSON.stringify(found()));
			},
		},
	},
});

const gate = new Set<string>();
const exile = defineMechanic(defineHead({ id: "exile", package: "@test/exile", summary: "Test: who stands at the gate.", events: ExileEvents.events, provides: [ExileService] }), {
	services: {
		exile: {
			banish: () => ({ ok: false, code: "UNKNOWN_RESIDENT" }),
			toGate: () => null,
			isExiled: () => false,
			exiled: () => [],
			standing: ({ resident }) => (gate.has(resident) ? { kind: "gate", until: 9 } : { kind: "alive" }),
			alive: (_input, ctx) => [...ctx.residents.ids],
			exiledBy: () => null,
			gates: () => [],
			ransomed: () => false,
			bequeathed: () => [],
		},
	},
});

const cast = defineMechanic(defineHead({ id: "cast", package: "@test/cast", summary: "Test: one figure.", provides: [CastExtrasService] }), { services: { "cast-extras": { active: () => [{ id: "STEWARD", level: 2 }] } } });

const LOOKS = ["getStatus", "submitSolution", "listAgents"];
const level = (number: number) => ({ number, title: `Door ${String(number)}`, reward: 5, tools: number === 1 ? LOOKS : [...LOOKS, "readBoard", "postBoard"], task: "Level {level}" });

function game(more: readonly MechanicUse[] = [], ticks = 4) {
	gate.clear();
	const options = { levels: [level(1), level(2), level(3)], acts: [2], penalty: [2, 4, 6], blamePenalty: [20, 22], holdAfter: 2, survivors: 1, finishedNotice: "done", managed: [...MANAGED] };
	return defineGame({ id: "acts-unit", seed: 7, residents: ["A01", "A02", "A03"], mechanics: [ledger({ startPoints: 10 }), channels(), pieces(), progression(options), asker(), ...more], scheduler: { id: "turns", options: { passes: 1, activation: "always", order: "roster" } }, end: { ticks } });
}

const textOf = (outcome: ToolOutcome): string => (outcome.ok ? outcome.reply : `${outcome.code}: ${outcome.detail ?? ""}`);
type Test = ReturnType<typeof testKernel>;
const ask = async (test: Test, what: string, input: { readonly resident?: string; readonly level?: number } = {}): Promise<string> => textOf(await test.call("A03", "ask", { ask: what, input }));

const progressionLines = (events: readonly { readonly type: string; readonly payload: unknown }[]) => events.filter((event) => ["act_started", "act_ended", "tools_unlocked"].includes(event.type)).map((event) => `${event.type} ${JSON.stringify(event.payload)}`);
const locks = (events: readonly { readonly type: string; readonly payload: unknown }[], actor: string) => events.flatMap((event) => (event.type.startsWith("tool_") && JSON.stringify(event.payload).includes(`"${actor}"`) ? [`${event.type.slice(5)} ${String(Reflect.get(Object(event.payload), "tool")).split("/").at(-1) ?? ""}`] : []));

describe("the acts", () => {
	it("begin with the first resident on their first level, end the earlier act, restart the ladders, and all end with the run", async () => {
		const test = testKernel(game());
		const wrong = async () => textOf(await test.call("A02", "submitSolution", { level: 1, code: "ZZZ" }));
		expect(await wrong()).toContain("INCORRECT: -2 points");
		expect(await wrong()).toContain("INCORRECT: -4 points");
		await test.call("A01", "submitSolution", { level: 1, code: "AAA" });
		expect([await ask(test, "currentAct"), await ask(test, "actStart", { level: 2 }), await ask(test, "actStart", { level: 1 })]).toEqual(["2", "0", "0"]);
		// The ladder starts again in the new act.
		expect(await wrong()).toContain("INCORRECT: -2 points");
		expect([await ask(test, "endAct", { level: 2 }), await ask(test, "endAct", { level: 2 })]).toEqual(["true", "false"]);
		await test.playTicks(() => Promise.resolve(), 4);
		expect(progressionLines(test.kernel.log.all())).toEqual(['act_started {"fromLevel":1,"residents":["A01","A02","A03"]}', 'act_ended {"fromLevel":1}', 'act_started {"fromLevel":2,"residents":["A01","A02","A03"]}', 'act_ended {"fromLevel":2}']);
	});
});

describe("the tool locks of the levels", () => {
	it("close the managed tools at the start, open the level's set on entering it, and the unlocks of a caller", async () => {
		const test = testKernel(game());
		const atStart = locks(test.kernel.log.all(), "resident:A01");
		expect(atStart).toEqual(["locked readBoard", "locked postBoard", "locked getProblem", "locked sendDM", "locked transferPoints", ...["createGroup", "addGroupMember", "removeGroupMember", "leaveGroup", "listMyGroups", "postGroup", "readGroup", "depositGroup", "withdrawGroup", "setTreasurer"].map((tool) => `locked ${tool}`)]);
		await test.call("A01", "submitSolution", { level: 1, code: "AAA" });
		expect(locks(test.kernel.log.all(), "resident:A01").slice(atStart.length)).toEqual(["unlocked readBoard", "unlocked postBoard"]);
		expect(await test.call("A02", "postBoard", { message: "hello" })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		await ask(test, "unlock", { resident: "A02" });
		await ask(test, "unlock", { resident: "A02" });
		expect(progressionLines(test.kernel.log.all()).filter((line) => line.startsWith("tools"))).toEqual(['tools_unlocked {"agent":"A02","tools":["createGroup","listMyGroups"]}']);
		expect(textOf(await test.call("A02", "getStatus", {}))).toContain("unlocked tools: getStatus, submitSolution, listAgents, createGroup, listMyGroups, activeTools");
	});

	it("refuses submitSolution at the gate of the exile, and only there", async () => {
		const test = testKernel(game([exile()]));
		gate.add("A02");
		expect(await test.call("A02", "submitSolution", { level: 1, code: "AAA" })).toEqual({ ok: false, code: "TOOL_LOCKED", detail: "not available to you at this level or in this phase; activeTools lists the tools you can use now" });
		expect(textOf(await test.call("A02", "getStatus", {}))).toContain("unlocked tools: getStatus, listAgents, activeTools");
		expect(await test.call("A01", "submitSolution", { level: 1, code: "AAA" })).toMatchObject({ ok: true });
	});
});

describe("the service progression and the looks", () => {
	it("answers the solves, the door and its brake, the blame's charge, the bounds, the ranking and the holders behind", async () => {
		const test = testKernel(game([cast()]));
		const answer = async (what: string, input: { readonly resident?: string; readonly level?: number } = {}) => ask(test, what, input);
		for (const id of ["A02", "A01"]) await test.call(id, "submitSolution", { level: 1, code: "AAA" });
		await test.call("A01", "submitSolution", { level: 2, code: "BBB" });
		expect(await answer("passed", { level: 1 })).toBe('["A02","A01"]');
		expect([await answer("lastProgress", { resident: "A01" }), await answer("lastProgress", { resident: "A03" })]).toEqual(["0", "-1"]);
		expect([await answer("hasSolved", { resident: "A01", level: 2 }), await answer("door"), await answer("doorShut")]).toEqual(["true", "2", "true"]);
		expect(await answer("holdersBehind", { resident: "A02", level: 2 })).toBe('[{"holder":"A03","level":1,"piece":"team certificate"}]');
		expect([await answer("chargeBlame", { resident: "A03" }), await answer("chargeBlame", { resident: "A03" }), await answer("nextBlamePenalty", { resident: "A03" })]).toEqual(["20", "22", "22"]);
		expect(await answer("bounds")).toBe('{"startLevel":1,"lastLevel":3,"survivors":1}');
		expect(await answer("ranking")).toBe('["1 A01 20","2 A02 15","3 A03 10"]');
		expect(await test.call("A01", "listAgents", {})).toEqual({ ok: true, reply: "A01: level 2 (you)\nA02: level 2\nA03: level 1\nSTEWARD: level 2" });
		// The brake: the door opens at the next tick although A03 has not passed it.
		expect(await answer("releaseDoor")).toBe("null");
		await test.playTicks(() => Promise.resolve(), 2);
		expect([await answer("door"), await answer("doorShut")]).toEqual(["null", "false"]);
		expect(test.kernel.log.all().filter((event) => event.type === "level_entered").map((event) => JSON.stringify(event.payload)).at(-1)).toBe('{"agent":"A01","level":3}');
	});

	it("resumes at every tick boundary with the acts and the solves in its slice", async () => {
		expect(await checkResumeEveryBoundary(game([cast()], 8), (kernel) => ({ resident: fakeDriver(kernel, 7) }))).toEqual([]);
	});
});
