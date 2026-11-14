// SPDX-License-Identifier: Apache-2.0
/** Game families, overrides (SWT-G041), record sources, and metrics on the head: what they change in a resolved game and what they leave alone. */
import { SwtError, type Envelope, type PromptLookup, type RecordSource, type SchedulerDefinition } from "@swarmtales/contracts";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { defineGame } from "../src/game/define-game.ts";
import { defineGameFamily, familyParams, isGameFamily } from "../src/game/family.ts";
import { resolveGame } from "../src/game/resolve.ts";
import type { ResolveInput } from "../src/game/types.ts";
import { defineHead } from "../src/mechanic/define-head.ts";
import { defineMechanic } from "../src/mechanic/define-mechanic.ts";
import { reply } from "../src/mechanic/definers.ts";
import { defineMetric } from "../src/mechanic/metrics.ts";

const events = { moved: Type.Object({ cell: Type.Integer({ description: "The cell" }) }, { description: "A move" }), passed: Type.Object({}, { description: "A pass" }) };
const moves = defineMetric(events, { id: "moves", title: "Moves played", unit: "moves", reads: ["moved"], compute: (played) => (played.length === 0 ? undefined : played.length) });
const lastCell = defineMetric(events, { id: "lastCell", title: "The last cell", reads: ["moved", "passed"], compute: (seen) => seen.flatMap((event) => (event.type === "moved" ? [event.payload.cell] : [])).at(-1) });

const board = (metrics?: readonly (typeof moves)[]) =>
	defineMechanic(
		defineHead({
			id: "board",
			package: "@test/board",
			summary: "A board.",
			options: Type.Object({ size: Type.Integer({ default: 3, description: "The side." }), open: Type.Boolean({ default: false, description: "Open hands." }) }, { description: "The options." }),
			events,
			tools: { move: { description: "Plays a move.", params: Type.Object({}, { description: "None" }), for: ["resident"] } },
			...(metrics === undefined ? {} : { metrics }),
		}),
		{ tools: { move: { run: () => reply("ok") } } },
	);
const plain = board();
const measured = board([moves, lastCell]);

const turns: SchedulerDefinition = { id: "@test/turns", revision: 1, determinism: "seeded", options: Type.Object({}, { description: "None" }), events: {}, create: () => ({ run: () => Promise.resolve(undefined) }) };
const prompts: PromptLookup = { render: (owner, id) => `${owner}: ${id}` };
const input = (game: ResolveInput["game"], more: Partial<ResolveInput> = {}): ResolveInput => ({ game, schedulers: { turns }, prompts, ...more });
const gameOf = (mechanic: typeof plain, size = 3, open = false) => defineGame({ id: "demo", residents: 2, mechanics: [mechanic({ size, open })], end: { ticks: 5 } });

const Params = Type.Object({ size: Type.Integer({ default: 3, minimum: 2, description: "The side." }), openHands: Type.Boolean({ default: false, description: "Open hands." }) }, { description: "The params." });
const family = defineGameFamily(Params, ({ size, openHands }) => gameOf(plain, size, openHands));

const envelope = (seq: number, type: string, payload: unknown): Envelope => ({ seq, tick: 0, source: "@test/board/board", type, actor: "resident:A01", payload });
const codes = (run: () => unknown): readonly string[] => {
	try {
		run();
	} catch (error) {
		if (error instanceof SwtError) return error.issues.map((issue) => `${issue.code} ${String(issue.details?.param)}`);
		throw error;
	}
	return [];
};

describe("a game family", () => {
	// Pinned before the families were built: the hash of a game that is no family must never move.
	const PINNED = "9e1efeeaa7a651339a5c79f671353006ae68f1af72173c14c00a8bb64a0a0caf";

	it("keeps the hash of a game that is no family, and gives it empty params", () => {
		const resolved = resolveGame(input(gameOf(plain)));
		expect(resolved.definition.game.hash).toBe(PINNED);
		expect(resolved.params).toEqual({});
		expect(Object.keys(resolved.definition)).not.toContain("records");
	});

	it("resolves two param sets to two game hashes and records the effective params of each", () => {
		const base = resolveGame(input(family));
		const arm = resolveGame(input(family, { params: { openHands: true } }));
		expect(base.params).toEqual({ size: 3, openHands: false });
		expect(arm.params).toEqual({ size: 3, openHands: true });
		expect(arm.definition.game.hash).not.toBe(base.definition.game.hash);
		// The defaults of a family give the game it wraps: the same hash as the plain game.
		expect(base.definition.game.hash).toBe(PINNED);
		expect(resolveGame(input(family, { params: { size: 3 } })).definition.game.hash).toBe(PINNED);
		expect(isGameFamily(family)).toBe(true);
		expect(isGameFamily(gameOf(plain))).toBe(false);
	});

	it("refuses an unknown override, a value of the wrong type and any override of a plain game with SWT-G041, naming the param", () => {
		expect(codes(() => resolveGame(input(family, { params: { openHand: true, size: "4" } })))).toEqual(["SWT-G041 openHand", "SWT-G041 size"]);
		expect(codes(() => resolveGame(input(family, { params: { size: 1 } })))).toEqual(["SWT-G041 size"]);
		expect(codes(() => resolveGame(input(gameOf(plain), { params: { size: 4 } })))).toEqual(["SWT-G041 size"]);
		expect(codes(() => resolveGame(input(gameOf(plain), { params: {} })))).toEqual([]);
		expect(familyParams(family, { openHand: true }).issues[0]?.fix).toContain('did you mean "openHands"?');
		const strict = defineGameFamily(Type.Object({ size: Type.Integer({ description: "The side." }) }, { description: "No default." }), ({ size }) => gameOf(plain, size));
		expect(codes(() => resolveGame(input(strict)))).toEqual(["SWT-G041 size"]);
	});

	it("passes the record sources through into the kernel definition, outside the game hash", () => {
		const records: readonly RecordSource[] = [{ id: "@test/driver", events: { asked: Type.Object({}, { description: "A request" }) } }];
		const resolved = resolveGame(input(family, { records }));
		expect(resolved.definition.records).toBe(records);
		expect(resolved.definition.game.hash).toBe(PINNED);
	});
});

describe("metrics on the head", () => {
	it("are on the erased head of the definition, readable without a body, and empty when none is declared", () => {
		expect(measured.head.metrics.map((metric) => [metric.id, metric.title, metric.unit, metric.reads])).toEqual([["moves", "Moves played", "moves", ["moved"]], ["lastCell", "The last cell", undefined, ["moved", "passed"]]]);
		expect(plain.head.metrics).toEqual([]);
	});

	it("leave the game hash as it is without them", () => {
		expect(resolveGame(input(gameOf(measured))).definition.game.hash).toBe(resolveGame(input(gameOf(plain))).definition.game.hash);
	});

	it("compute from the parsed events of the types they read, and are absent without them or with a payload that does not parse", () => {
		const log = [envelope(1, "moved", { cell: 4 }), envelope(2, "passed", {}), envelope(3, "moved", { cell: 7 }), envelope(4, "other", { cell: "x" })];
		expect(moves.compute(log)).toBe(2);
		expect(lastCell.compute(log)).toBe(7);
		expect(moves.compute([envelope(1, "passed", {})])).toBeUndefined();
		expect(moves.compute([...log, envelope(5, "moved", { cell: "seven" })])).toBeUndefined();
		expect(defineMetric(events, { id: "ratio", title: "A ratio", reads: ["moved"], compute: () => 0 / 0 }).compute(log)).toBeUndefined();
	});
});
