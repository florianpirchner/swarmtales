// SPDX-License-Identifier: Apache-2.0
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { SwtError, type ActorId, type PluginPort, type RandomSource } from "@swarmtales/contracts";
import { actorOf, contextFor, residentOf, viewFor } from "../src/mechanic/context.ts";
import type { Shape } from "../src/mechanic/context-types.ts";
import { defineService, defineTool } from "../src/mechanic/definers.ts";
import type { InstanceParts } from "../src/mechanic/parts.ts";

const Board = defineService({
	name: "board",
	summary: "The board.",
	methods: {
		cells: { kind: "query", summary: "Every cell.", input: Type.Object({}), output: Type.Array(Type.String()) },
		clear: { kind: "command", summary: "Empties it.", input: Type.Object({}), output: Type.Null() },
	},
});
const Chat = defineService({ name: "chat", summary: "A channel.", methods: { count: { kind: "query", summary: "The posts.", input: Type.Object({}), output: Type.Integer() } } });
const events = { moved: Type.Object({ cell: Type.Integer(), by: Type.String() }) };
type M = Shape<{ size: number }, { moves: number }, typeof events, { readonly "grid/turn": readonly ["side"] }, [typeof Board], [], [typeof Chat]>;

const random: RandomSource = {
	next: () => 0,
	int: (min) => min,
	pick<T>(items: readonly T[]): T {
		for (const item of items) return item;
		throw new RangeError("pick of an empty list");
	},
	shuffle: (items) => [...items],
};
const ACTORS: readonly ActorId[] = ["resident:A01", "resident:A02", "director:D1"];

/** A port that notes every call and answers from `answers`. */
function stub(answers: { provided?: readonly string[]; output?: unknown; tick?: number } = {}): { port: PluginPort; calls: unknown[][]; parts: InstanceParts<M> } {
	const calls: unknown[][] = [];
	const note = (...call: unknown[]): undefined => {
		calls.push(call);
	};
	const port: PluginPort = {
		id: "grid",
		source: "@acme/grid/grid",
		seed: 7,
		maxTicks: 30,
		tick: () => answers.tick ?? 4,
		emit: (type, payload) => { note("emit", type, payload); },
		call: (service, method, input) => (note("call", service, method, input), answers.output),
		has: (service) => (answers.provided ?? ["board"]).includes(service),
		rng: (...labels) => (note("rng", ...labels), random),
		actors: {
			ids: ACTORS,
			ofKind: (kind) => ACTORS.filter((id) => id.startsWith(`${kind}:`)),
			has: (id) => ACTORS.some((actor) => actor === id),
			mayAct: (id) => id !== "resident:A02",
			shared: () => undefined,
			suspend: (id, reason) => { note("suspend", id, reason); },
			resume: (id) => { note("resume", id); },
		},
		schedule: { at: (tick, job, data) => { note("at", tick, job, data); } },
		access: {
			lock: (actor, tool) => { note("lock", actor, tool); },
			unlock: (actor, tool) => { note("unlock", actor, tool); },
			isLocked: (actor, tool) => (note("isLocked", actor, tool), true),
			isOpen: (actor, tool) => (note("isOpen", actor, tool), false),
			open: () => [],
		},
	};
	const options = { size: 3 };
	const head = { id: "grid", package: "@acme/grid", summary: "A grid.", options: Type.Object({}), state: undefined, version: 1, events, audiences: {}, prompts: { "grid/turn": ["side"] }, requires: [Board], provides: [], uses: [Chat], tools: [], metrics: [] };
	const texts = { render: (owner: string, id: string, variables: Readonly<Record<string, string | number>>, declared: readonly string[]) => `${owner}|${id}|${JSON.stringify(variables)}|${declared.join(",")}` };
	return { port, calls, parts: { port, head, options, state: { value: { moves: 0 } }, setup: { options, residents: ["A01", "A02"], actors: ["resident:A01", "resident:A02"], seed: 7, rng: () => random }, texts } };
}

const codeOf = (run: () => unknown): string => {
	try {
		run();
	} catch (error) {
		return error instanceof SwtError ? error.code : `not an SwtError: ${String(error)}`;
	}
	return "did not throw";
};

describe("contextFor", () => {
	it("translates resident ids and actor ids both ways", () => {
		const { parts, calls } = stub();
		const ctx = contextFor(parts, "resident:A02");
		expect([ctx.actor, ctx.resident]).toEqual(["resident:A02", "A02"]);
		expect([contextFor(parts).actor, contextFor(parts).resident]).toEqual(["kernel", undefined]);
		expect(contextFor(parts, "director:D1").resident).toBeUndefined();
		expect([residentOf("resident:A01"), residentOf("human"), actorOf("A01")]).toEqual(["A01", undefined, "resident:A01"]);
		expect(ctx.residents.ids).toEqual(["A01", "A02"]);
		// Every actor under its actor id, read-only: the view has no `suspend` and no `resume`.
		expect([ctx.actors.ids, ctx.actors.ofKind("resident"), ctx.actors.has("resident:A01"), ctx.actors.mayAct("resident:A02"), ctx.actors.shared("resident:A01", "team")]).toEqual([ACTORS, ACTORS.filter((id) => id.startsWith("resident:")), true, false, undefined]);
		expect(Object.keys(ctx.actors).sort()).toEqual(["has", "ids", "mayAct", "ofKind", "shared"]);
		expect([ctx.residents.has("A01"), ctx.residents.has("D1"), ctx.residents.has("resident:A01")]).toEqual([true, false, false]);
		expect([ctx.residents.mayAct("A01"), ctx.residents.mayAct("A02")]).toEqual([true, false]);
		ctx.residents.suspend("A01", "voted out");
		ctx.residents.resume("A01");
		expect(calls).toEqual([["suspend", "resident:A01", "voted out"], ["resume", "resident:A01"]]);
	});

	it("names its own tools canonically for a lock, by bare name or by reference", () => {
		const { parts, calls } = stub();
		const { access } = contextFor(parts);
		access.lock("A01", "playMove");
		access.unlock("A02", defineTool("playMove", Type.Object({})));
		expect([access.isLocked("A01", "look"), access.isOpen("A01", "look")]).toEqual([true, false]);
		expect(calls).toEqual([
			["lock", "resident:A01", "@acme/grid/grid/playMove"],
			["unlock", "resident:A02", "@acme/grid/grid/playMove"],
			["isLocked", "resident:A01", "@acme/grid/grid/look"],
			["isOpen", "resident:A01", "@acme/grid/grid/look"],
		]);
	});

	it("names a tool of another mechanic by its bare name through the game's tools, its own tool first", () => {
		const { parts, calls } = stub();
		const tools = new Map([["postTeam", "@acme/chat/chat/postTeam"], ["playMove", "@acme/other/other/playMove"]]);
		const head = { ...parts.head, tools: [{ name: "playMove", description: "Moves.", parameters: Type.Object({}), for: ["resident"], free: false }] };
		const { access } = contextFor({ ...parts, head, tools });
		access.lock("A01", "postTeam");
		access.unlock("A01", "postTeam");
		access.lock("A01", "playMove");
		access.lock("A01", defineTool("postTeam", Type.Object({})));
		access.lock("A01", "nowhere");
		expect(calls).toEqual([
			["lock", "resident:A01", "@acme/chat/chat/postTeam"],
			["unlock", "resident:A01", "@acme/chat/chat/postTeam"],
			["lock", "resident:A01", "@acme/grid/grid/playMove"],
			["lock", "resident:A01", "@acme/grid/grid/postTeam"],
			["lock", "resident:A01", "@acme/grid/grid/nowhere"],
		]);
	});

	it("emits a payload that matches and refuses a wrong one with SWT-M021 before the port sees it", () => {
		const { parts, calls } = stub();
		const ctx = contextFor(parts);
		ctx.emit("moved", { cell: 4, by: "A01" });
		expect(calls).toEqual([["emit", "moved", { cell: 4, by: "A01" }]]);
		expect(
			codeOf(() => {
				// @ts-expect-error -- `by` is missing
				ctx.emit("moved", { cell: 4 });
			}),
		).toBe("SWT-M021");
		expect(() => {
			ctx.emit("moved", { cell: 4.5, by: "A01" });
		}).toThrow(/mechanic "grid" emitted "moved" with a wrong payload: \/cell must be integer/);
		expect(calls).toHaveLength(1);
	});

	it("checks a service output (SWT-M022) and answers undefined for a used service nobody provides", () => {
		const good = stub({ output: ["X", ""] });
		const ctx = contextFor(good.parts);
		expect(ctx.call(Board, "cells", {})).toEqual(["X", ""]);
		expect(good.calls).toEqual([["call", "board", "cells", {}]]);
		expect([ctx.has(Board), ctx.has(Chat), ctx.tryCall(Chat, "count", {})]).toEqual([true, false, undefined]);
		expect(good.calls).toHaveLength(1);
		const bad = stub({ output: [1], provided: ["board", "chat"] });
		expect(codeOf(() => contextFor(bad.parts).call(Board, "cells", {}))).toBe("SWT-M022");
		expect(codeOf(() => contextFor(bad.parts).tryCall(Chat, "count", {}))).toBe("SWT-M022");
		expect(codeOf(() => viewFor(bad.parts).call(Board, "cells", {}))).toBe("SWT-M022");
	});

	it("reads the port's values, renders its prompts with the declared variables and keeps state and tick live", () => {
		const { parts, calls, port } = stub();
		const ctx = contextFor(parts);
		expect([ctx.mechanic, ctx.seed, ctx.ticks, ctx.tick, ctx.options.size]).toEqual(["grid", 7, 30, 4, 3]);
		expect(ctx.schedule).toBe(port.schedule);
		expect(ctx.prompt("grid/turn", { side: "X" })).toBe('grid|grid/turn|{"side":"X"}|side');
		const { rng } = ctx;
		expect(rng("grid", 1)).toBe(random);
		expect(calls).toEqual([["rng", "grid", 1]]);
		ctx.state.moves += 1;
		expect(parts.state.value.moves).toBe(1);
		parts.state.value = { moves: 9 };
		expect([ctx.state.moves, viewFor(parts).state.moves]).toEqual([9, 9]);
	});
});

describe("viewFor", () => {
	it("is the read-only view: options, live state and tick, residents without commands, queries", () => {
		const { parts } = stub({ output: ["O"], tick: 2 });
		const view = viewFor(parts);
		expect([view.options.size, view.tick, view.state.moves]).toEqual([3, 2, 0]);
		expect([view.residents.ids, view.residents.has("A02"), view.residents.mayAct("A02")]).toEqual([["A01", "A02"], true, false]);
		expect(Object.keys(view.residents).sort()).toEqual(["has", "ids", "mayAct"]);
		expect(view.call(Board, "cells", {})).toEqual(["O"]);
		expect(view.tryCall(Chat, "count", {})).toBeUndefined();
	});

	it("refuses a command with SWT-M025 before the port is asked, and names no provider it does not know", () => {
		const { parts, calls } = stub({ output: null, provided: [] });
		const view = viewFor(parts);
		// @ts-expect-error -- `clear` is a command; a fact calls queries only
		const command = (): unknown => view.call(Board, "clear", {});
		expect(codeOf(command)).toBe("SWT-M025");
		const erased: { tryCall(service: unknown, method: string, input: unknown): unknown } = view;
		expect(codeOf(() => erased.tryCall(Board, "clear", {}))).toBe("SWT-M025");
		expect(calls).toEqual([]);
		expect(contextFor(parts).call(Board, "clear", {})).toBeNull();
		const bad = stub({ output: [1] });
		expect(() => viewFor(bad.parts).call(Board, "cells", {})).toThrow(/the output of "board.cells" is wrong \(caller "grid"\): \/0 /);
	});
});
