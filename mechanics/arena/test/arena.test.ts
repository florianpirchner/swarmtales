// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The arena on the new kernel. The old tests (`test/mechanics/arena/` on `legacy`) compared the arena with the old
 * engine's goldens, which are dropped (REWRITE 3.10); their cases of what is kept are carried here: the early stops
 * (every resident done, the seats decided, the tribunal's end) at the next tick's start with no `round_end`, the run
 * to its last tick with the last tick's stop check, the act brake once, the points part of the novelty, and a resume
 * at every boundary. The budget, the snapshot cut and the ending evaluator are not the arena's any more (A57).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import type { Envelope } from "@swarmtales/contracts";
import { channels } from "@swarmtales/mechanic-channels";
import { ledger } from "@swarmtales/mechanic-ledger";
import { LedgerService } from "@swarmtales/mechanic-ledger/contract";
import { LevelPiecesService, progression } from "@swarmtales/mechanic-progression";
import { defineGame, defineHead, defineMechanic, reply, type MechanicUse } from "@swarmtales/sdk";
import { checkDeterminism, checkOptionsDocumented, checkPackage, checkResumeEveryBoundary, play, scriptedDriver, type Plan } from "@swarmtales/testkit";
import { runFrame, TribunalViewService } from "../src/index.ts";

const pieces = defineMechanic(defineHead({ id: "puzzles", package: "@test/puzzles", summary: "Test: fixed codes.", provides: [LevelPiecesService] }), {
	services: {
		"level-pieces": {
			deal: () => null,
			solutionOf: ({ level }) => `CODE${String(level)}`,
			kindOf: () => "fragments",
			teamOf: ({ resident }) => ({ members: [resident], leader: resident }),
			taskValues: () => ({ length: "5", overlap: "0", fragment: "CODE", digits: "", factors: "" }),
			holders: () => [],
		},
	},
});

// The tribunal as the stop rule reads it: over from tick `endsAt` on, busy before `busyUntil`.
const tribunal = (endsAt: number, busyUntil = 0): MechanicUse =>
	defineMechanic(defineHead({ id: "tribunal", package: "@test/tribunal", summary: "Test: the tribunal's end.", provides: [TribunalViewService] }), {
		services: { "tribunal-view": { stop: (_input, ctx) => ({ endReason: ctx.tick >= endsAt ? "The tribunals are over." : null, busy: ctx.tick < busyUntil, pursuing: false }) } },
	})();

// A resident gives one point to another: the points part of the novelty.
const gifts = defineMechanic(
	defineHead({ id: "gifts", package: "@test/gifts", summary: "Test: gives a point.", requires: [LedgerService], tools: { gift: { description: "Test: gives one point.", params: Type.Object({ to: Type.String({ description: "A resident" }) }), for: ["resident"] } } }),
	{ tools: { gift: { run: ({ to }, ctx) => (ctx.call(LedgerService, "mint", { account: to, amount: 1, reason: "gift" }), reply("given")) } } },
);

interface Setup {
	readonly frame?: NonNullable<Parameters<typeof runFrame>[0]>;
	readonly ticks?: number;
	readonly residents?: number;
	readonly more?: readonly MechanicUse[];
	readonly activation?: "always" | "onNews";
}

const LEVELS = [1, 2].map((number) => ({ number, title: `Door ${String(number)}`, reward: number === 1 ? 10 : 5, tools: ["submitSolution", "gift"], task: "Password {fragment}." }));

function gameOf({ frame = {}, ticks = 4, residents = 2, more = [], activation = "always" }: Setup) {
	return defineGame({
		id: "arena-unit",
		seed: 7,
		residents,
		mechanics: [ledger({ startPoints: 0 }), channels(), pieces(), progression({ levels: LEVELS, penalty: [3], survivors: 1 }), gifts(), ...more, runFrame({ story: "tiny", rewards: LEVELS.map(({ number, reward }) => ({ level: number, reward })), ...frame })],
		scheduler: { id: "turns", options: { passes: activation === "always" ? 1 : 2, activation, order: "roster" } },
		end: { ticks },
	});
}

const solve = (level: number, code = `CODE${String(level)}`) => ({ tool: "submitSolution", params: { level, code } });
// Resident to its calls by tick.
const planOf = (calls: Readonly<Record<string, Readonly<Record<number, readonly { readonly tool: string; readonly params: unknown }[]>>>>): Plan => (activation) => calls[activation.actor.slice("resident:".length)]?.[activation.tick] ?? [];
const climb: Readonly<Record<number, readonly { readonly tool: string; readonly params: unknown }[]>> = { 0: [solve(1)], 1: [solve(2)] };

const arenaLines = (events: readonly Envelope[]) => events.filter((event) => event.source.endsWith("arena"));
const typesOf = (events: readonly Envelope[]) => arenaLines(events).map((event) => event.type);
const lastOf = (events: readonly Envelope[], type: string) => events.findLast((event) => event.type === type);

describe("the run's lines", () => {
	it("writes run_start after every other start, round_end per tick, and run_end after the acts end", async () => {
		const { events, end } = await play(gameOf({ frame: { meta: { arm: "a" } } }), { drivers: { resident: scriptedDriver(planOf({ A01: climb })) } });
		expect(end?.reason).toBe("ticks");
		expect(typesOf(events)).toEqual(["run_start", "round_end", "round_end", "round_end", "round_end", "run_end"]);
		expect(arenaLines(events)[0]?.payload).toEqual({ story: "tiny", agents: ["A01", "A02"], minutes: 4, seed: 7, meta: { arm: "a" } });
		expect(events.findIndex((event) => event.type === "run_start")).toBeGreaterThan(events.findIndex((event) => event.type === "act_started"));
		expect(events.findIndex((event) => event.type === "run_end")).toBeGreaterThan(events.findIndex((event) => event.type === "act_ended"));
		// `tools` counts the resident tools of the old platform open to it: the looks and the channels (19 here).
		const first = arenaLines(events)[1]?.payload;
		expect(first).toEqual({
			round: 1,
			standings: [
				{ agent: "A01", level: 2, points: 10, rank: 1, tools: 19, activated: true },
				{ agent: "A02", level: 1, points: 0, rank: 2, tools: 19, activated: true },
			],
		});
		// Nothing stops the run: the last tick's stop check names no reason, and nobody counts as activated at the end.
		expect(lastOf(events, "run_end")?.payload).toEqual({ standings: [{ agent: "A01", level: 3, points: 15, rank: 1, tools: 19, activated: false }, { agent: "A02", level: 1, points: 0, rank: 2, tools: 19, activated: false }] });
	});

	it("names the stop of the last tick in run_end, though the run ends by its ticks", async () => {
		const { events, end } = await play(gameOf({ frame: { stopWhenDone: true }, ticks: 2 }), { drivers: { resident: scriptedDriver(planOf({ A01: climb, A02: climb })) } });
		expect(end?.reason).toBe("ticks");
		expect(Reflect.get(Object(lastOf(events, "run_end")?.payload), "reason")).toBe("every competitor has passed the last level");
	});
});

describe("the stop rules", () => {
	it("stops once every resident has passed the last level (stopWhenDone), at the next tick's start, with no round_end", async () => {
		const { events, end } = await play(gameOf({ frame: { stopWhenDone: true }, ticks: 6 }), { drivers: { resident: scriptedDriver(planOf({ A01: climb, A02: climb })) } });
		expect(end).toEqual({ reason: "limit", tick: 2, limit: "arena.stop" });
		expect(typesOf(events)).toEqual(["run_start", "round_end", "round_end", "run_end"]);
		expect(lastOf(events, "limit_reached")?.payload).toEqual({ limit: "arena.stop", reason: "every competitor has passed the last level" });
		expect(Reflect.get(Object(lastOf(events, "run_end")?.payload), "reason")).toBe("every competitor has passed the last level");
		// The tick that stopped started, and no activation was opened in it.
		expect(events.filter((event) => event.type === "activation_opened" && event.tick === 2)).toEqual([]);
	});

	it("plays on while stopWhenDone is off", async () => {
		const { end } = await play(gameOf({ ticks: 4 }), { drivers: { resident: scriptedDriver(planOf({ A01: climb, A02: climb })) } });
		expect(end?.reason).toBe("ticks");
	});

	it("stops once the seats are decided (stopWhenSeatsDecided)", async () => {
		const { events, end } = await play(gameOf({ frame: { stopWhenSeatsDecided: true }, ticks: 6 }), { drivers: { resident: scriptedDriver(planOf({ A01: climb, A02: { 0: [solve(1, "WRONG")] } })) } });
		expect(end).toEqual({ reason: "limit", tick: 2, limit: "arena.stop" });
		expect(Reflect.get(Object(lastOf(events, "run_end")?.payload), "reason")).toBe("seats decided");
	});

	it("ends with the tribunal's end reason, and a busy tribunal holds the early stops back", async () => {
		const { events, end } = await play(gameOf({ frame: { stopWhenDone: true }, ticks: 8, more: [tribunal(4, 4)] }), { drivers: { resident: scriptedDriver(planOf({ A01: climb, A02: climb })) } });
		expect(end).toEqual({ reason: "limit", tick: 4, limit: "arena.stop" });
		expect(Reflect.get(Object(lastOf(events, "run_end")?.payload), "reason")).toBe("The tribunals are over.");
		expect(typesOf(events).filter((type) => type === "round_end")).toHaveLength(4);
	});
});

describe("the act brake and the novelty", () => {
	it("writes act_brake once when an act has run its maxMinutes with residents inside it", async () => {
		const acts = [{ title: "Act I", fromLevel: 1, maxMinutes: 2 }];
		const { events } = await play(gameOf({ frame: { acts }, ticks: 5 }), { drivers: { resident: scriptedDriver(planOf({ A01: climb })) } });
		const brakes = events.filter((event) => event.type === "act_brake");
		expect(brakes.map((event) => [event.tick, event.payload])).toEqual([[1, { act: "Act I", fromLevel: 1, toLevel: 2, startedAt: 0, maxMinutes: 2, behind: [{ agent: "A02", level: 1 }] }]]);
	});

	it("wakes a resident whose points moved since its last turn, and nobody else", async () => {
		const { events } = await play(gameOf({ activation: "onNews", ticks: 1 }), { drivers: { resident: scriptedDriver(planOf({ A02: { 0: [{ tool: "gift", params: { to: "A01" } }] } })) } });
		const pass2 = events.filter((event) => event.type === "activation_opened").slice(2);
		expect(pass2.map((event) => String(Reflect.get(Object(event.payload), "actor")))).toEqual(["resident:A01"]);
	});
});

describe("resume", () => {
	it.each([
		["the plain run", gameOf({ frame: { acts: [{ title: "Act I", fromLevel: 1, maxMinutes: 2 }] }, ticks: 4 })],
		["a stopped run", gameOf({ frame: { stopWhenDone: true }, ticks: 6 })],
		["a run on news", gameOf({ activation: "onNews", ticks: 3 })],
	])("resumes %s at every tick boundary to the log of the straight run", async (_name, game) => {
		const plan = planOf({ A01: climb, A02: { 0: [{ tool: "gift", params: { to: "A01" } }], 1: [solve(1)], 2: [solve(2)] } });
		expect(await checkResumeEveryBoundary(game, () => ({ resident: scriptedDriver(plan) }))).toEqual([]);
	});
});

describe("conformance", () => {
	it("documents its options, matches its package and plays the same run twice", async () => {
		const packageJson: unknown = JSON.parse(readFileSync(join(import.meta.dirname, "..", "package.json"), "utf8"));
		expect(checkPackage(runFrame, packageJson)).toEqual([]);
		expect(checkOptionsDocumented(runFrame)).toEqual([]);
		expect(await checkDeterminism(gameOf({ frame: { stopWhenDone: true } }), () => scriptedDriver(planOf({ A01: climb, A02: climb })))).toEqual([]);
	});
});
