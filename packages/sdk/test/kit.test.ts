// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { describe, expect, it } from "vitest";
import { SwtError, type ActorId, type Envelope, type PluginPort, type RandomSource } from "@swarmtales/contracts";
import { defineEvents, defineService, refuse, reply } from "../src/mechanic/definers.ts";
import type { Shape } from "../src/mechanic/context-types.ts";
import { createKit, type KitBinding } from "../src/mechanic/kit.ts";
import type { InstanceParts } from "../src/mechanic/parts.ts";
import type { DeclaredTool, None, PluginHead } from "../src/mechanic/types.ts";

const Counter = defineService({
	name: "counter",
	summary: "A counter.",
	methods: { add: { kind: "command", summary: "Adds.", input: Type.Object({ by: Type.Integer() }), output: Type.Object({ total: Type.Integer() }) } },
});
const Board = defineEvents("board", { moved: Type.Object({ cell: Type.Integer() }) });
const State = Type.Object({ count: Type.Integer() });
type M = Shape<{ readonly size: number }, { count: number }, None, { readonly intro: readonly [] }, [], [typeof Counter]>;

const random: RandomSource = { next: () => 0, int: (min) => min, pick: (items) => items[0] ?? raise("empty"), shuffle: (items) => [...items] };
function raise(message: string): never {
	throw new TypeError(message);
}
const port: PluginPort = {
	stage: () => undefined,
	id: "tally",
	source: "@test/tally/tally",
	seed: 7,
	maxTicks: 9,
	tick: () => 2,
	emit: () => undefined,
	call: () => undefined,
	has: () => false,
	rng: () => random,
	actors: { ids: [], ofKind: () => [], has: () => false, mayAct: () => true, shared: () => undefined, suspend: () => undefined, resume: () => undefined },
	schedule: { at: () => undefined },
	access: { lock: () => undefined, unlock: () => undefined, isLocked: () => false, isOpen: () => true, open: () => [] },
};
const head: PluginHead = { id: "tally", package: "@test/tally", summary: "Counts.", options: Type.Object({}), state: State, version: 2, events: {}, audiences: {}, prompts: { intro: [] }, requires: [], provides: [Counter], uses: [], tools: [], metrics: [] };

/** The stand-ins of issue 16 (`contextFor`, `viewFor`, `convertArguments`), with a trace of what the kit called. */
function setup(): { readonly parts: InstanceParts<M>; readonly bind: KitBinding; readonly trace: string[] } {
	const trace: string[] = [];
	const parts: InstanceParts<M> = {
		port,
		head,
		options: { size: 3 },
		state: { value: { count: 1 } },
		setup: { options: { size: 3 }, residents: ["A01"], actors: ["resident:A01"], seed: 7, rng: () => random },
		texts: { render: (owner, id) => `text of ${owner}/${id}` },
	};
	const bind: KitBinding = {
		contextFor(p, actor: ActorId = "kernel") {
			trace.push(`context ${actor}`);
			return {
				mechanic: p.port.id,
				seed: p.port.seed,
				options: p.options,
				state: p.state.value,
				tick: p.port.tick(),
				ticks: p.port.maxTicks,
				residents: { ids: [], has: () => false, mayAct: () => true, suspend: () => undefined, resume: () => undefined },
				actors: p.port.actors,
				schedule: p.port.schedule,
				access: { lock: () => undefined, unlock: () => undefined, isLocked: () => false, isOpen: () => true },
				emit: () => undefined,
				call: () => raise("stand-in"),
				has: () => false,
				tryCall: () => undefined,
				stage: () => undefined,
				prompt: () => "",
				rng: () => random,
				actor,
				resident: actor.startsWith("resident:") ? actor.slice(9) : undefined,
			};
		},
		viewFor: (p) => ({ options: p.options, state: p.state.value, tick: p.port.tick(), residents: { ids: [], has: () => false, mayAct: () => true }, call: () => raise("stand-in"), tryCall: () => undefined }),
		convertArguments(_schema, raw) {
			trace.push("convert");
			return typeof raw === "object" && raw !== null && "cell" in raw && raw.cell === "three" ? { ...raw, cell: 3 } : raw;
		},
	};
	return { parts, bind, trace };
}

/** The code and the first issue of what `run` throws. */
function thrown(run: () => unknown): { readonly code: string; readonly summary: string; readonly details: unknown } {
	try {
		run();
	} catch (error) {
		if (error instanceof SwtError) return { code: error.code, summary: error.issues[0]?.summary ?? "", details: error.issues[0]?.details };
		throw error;
	}
	return { code: "nothing thrown", summary: "", details: undefined };
}

describe("createKit: tool", () => {
	const Params = Type.Object({ cell: Type.Integer({ minimum: 0, maximum: 8 }) });
	const declared: DeclaredTool = { name: "playMove", description: "Plays a cell.", parameters: Params, for: ["resident"], free: false };

	it("prepare converts, then checks, then binds check and run to the caller's context", () => {
		const { parts, bind, trace } = setup();
		const tool = createKit(parts, bind).tool(declared, {
			check: (params, ctx) => (ctx.resident === "A01" ? undefined : refuse("NOT_YOU", String(Parse(Params, params).cell))),
			run: (params, ctx) => reply(`${ctx.actor} plays ${Parse(Params, params).cell} with ${ctx.state.count}`),
		});
		expect([tool.name, tool.description, tool.parameters, tool.free, "sample" in tool]).toEqual(["playMove", "Plays a cell.", Params, false, false]);
		const prepared = tool.prepare({ cell: "three" }, "resident:A01");
		expect(trace).toEqual(["convert", "context resident:A01"]);
		expect(prepared?.params).toEqual({ cell: 3 });
		expect(prepared?.rule()).toBeUndefined();
		expect(prepared?.execute()).toEqual({ ok: true, reply: "resident:A01 plays 3 with 1" });
		expect(tool.prepare({ cell: 4 }, "resident:B02")?.rule()).toEqual({ ok: false, code: "NOT_YOU", detail: "4" });
	});

	it("prepare answers undefined for arguments that do not fit after the conversion, and builds no context", () => {
		const { parts, bind, trace } = setup();
		const tool = createKit(parts, bind).tool(declared, { run: () => reply("never") });
		expect(tool.prepare({ cell: 9 }, "resident:A01")).toBeUndefined();
		expect(tool.prepare({ cell: "four" }, "resident:A01")).toBeUndefined();
		expect(tool.prepare(undefined, "resident:A01")).toBeUndefined();
		expect(trace).toEqual(["convert", "convert", "convert"]);
		expect(tool.prepare({ cell: 0 }, "resident:A01")?.rule()).toBeUndefined();
	});

	it("renders a description that is a declared prompt id, keeps `free`, and binds `sample` to the actor", () => {
		const { parts, bind } = setup();
		const tool = createKit(parts, bind).tool({ ...declared, description: "intro", free: true }, { sample: (ctx) => ({ cell: ctx.resident === "A01" ? 1 : 2 }), run: () => reply("ok") });
		expect([tool.description, tool.free]).toEqual(["text of tally/intro", true]);
		expect(tool.sample?.("resident:A01", random)).toEqual({ cell: 1 });
		expect(tool.sample?.("kernel", random)).toEqual({ cell: 2 });
	});
});

describe("createKit: provide", () => {
	const provided = (total: unknown): { readonly service: ReturnType<ReturnType<typeof createKit<M>>["provide"]>; readonly seen: unknown[] } => {
		const { parts, bind } = setup();
		const seen: unknown[] = [];
		const service = createKit(parts, bind).provide(Counter, {
			add: (input, ctx, caller) => {
				seen.push(input, ctx.mechanic, caller);
				return { total };
			},
		});
		return { service, seen };
	};

	it("hands the parsed input, the provider's context and the caller to the implementation", () => {
		const { service, seen } = provided(5);
		expect(service.service).toBe(Counter);
		expect(service.call("add", { by: 2 }, "board")).toEqual({ total: 5 });
		expect(seen).toEqual([{ by: 2 }, "tally", "board"]);
	});

	it("raises SWT-M022 for a wrong output, and names the provider", () => {
		const fault = thrown(() => provided("five").service.call("add", { by: 2 }, "board"));
		expect(fault.code).toBe("SWT-M022");
		expect(fault.details).toEqual({ side: "output" });
		expect(fault.summary).toContain('the output of "counter.add" is wrong (provider "tally", caller "board"): /total');
	});

	it("raises SWT-M022 for a wrong input before the implementation runs, and for a method that does not exist", () => {
		const { service, seen } = provided(5);
		const fault = thrown(() => service.call("add", { by: "x" }, "board"));
		expect([fault.code, fault.details]).toEqual(["SWT-M022", { side: "input" }]);
		expect(thrown(() => service.call("toString", {}, "board")).summary).toBe('the input of "counter.toString" is wrong (provider "tally", caller "board"): the service has no method "toString"');
		expect(seen).toEqual([]);
	});
});

describe("createKit: listen, fact, limit", () => {
	const event: Envelope = { seq: 4, tick: 2, source: "@test/board/board", type: "moved", actor: "resident:A01", payload: { cell: 3 } };

	it("binds a listener to the declaring mechanic's schema object and parses the payload", () => {
		const { parts, bind } = setup();
		const seen: unknown[] = [];
		const kit = createKit(parts, bind);
		const listener = kit.listen(Board, "moved", (payload, ctx, whole) => seen.push(payload.cell, ctx.mechanic, whole.seq), { after: ["board"] });
		expect([listener.source, listener.type, listener.after]).toEqual(["board", "moved", ["board"]]);
		expect(listener.schema).toBe(Board.events.moved);
		expect("after" in kit.listen(Board, "moved", () => undefined)).toBe(false);
		listener.run(event);
		expect(seen).toEqual([3, "tally", 4]);
		expect(thrown(() => {
				listener.run({ ...event, payload: { cell: "x" } });
			}).code).toBe("SWT-M021");
		expect(seen).toHaveLength(3);
	});

	it("checks a fact's value against its output (SWT-M023) and binds a limit under the bare id", () => {
		const { parts, bind } = setup();
		const kit = createKit(parts, bind);
		const Sum = Type.Integer();
		const fact = kit.fact({ output: Sum, compute: (view) => view.state.count + view.options.size });
		expect(fact.output).toBe(Sum);
		expect(fact.compute()).toBe(4);
		const wrong = kit.fact({ output: Type.Integer(), compute: (view) => view.state.count / 2 });
		const fault = thrown(() => wrong.compute());
		expect(fault.code).toBe("SWT-M023");
		expect(fault.summary).toMatch(/^a fact of mechanic "tally" has a wrong value: must be /);
		const limit = kit.limit("full", { summary: "The board is full.", breached: (view) => (view.state.count > 1 ? "full" : undefined) });
		expect([limit.id, limit.summary, limit.check()]).toEqual(["full", "The board is full.", undefined]);
	});
});

describe("createKit: slice", () => {
	it("saves a state that is its own slice and replaces it on load", () => {
		const { parts, bind } = setup();
		const slice = createKit(parts, bind).slice({ version: 2, schema: State });
		expect([slice.version, slice.save()]).toEqual([2, { count: 1 }]);
		slice.load({ count: 8 }, 2);
		expect(parts.state.value).toEqual({ count: 8 });
		expect(thrown(() => {
				slice.load({ count: "8" }, 2);
			}).summary).toContain("does not match the state schema when it is loaded: /count");
		const newer = thrown(() => {
			slice.load({ count: 8 }, 3);
		});
		expect([newer.code, newer.details, newer.summary]).toEqual(["SWT-M024", { problem: "newer" }, 'the snapshot slice of mechanic "tally" has version 3, which is newer than 2']);
		parts.state.value = { count: 0.5 };
		expect(thrown(() => slice.save())).toMatchObject({ code: "SWT-M024", details: { problem: "saved" } });
	});

	it("migrates an old slice step by step and loads it through `snapshot`, with the setup", () => {
		const { parts, bind } = setup();
		const slice = createKit(parts, bind).slice({
			version: 2,
			schema: State,
			snapshot: { save: (state) => ({ count: state.count * 10 }), load: (data, given) => ({ count: typeof data === "object" && data !== null && "count" in data && typeof data.count === "number" ? data.count + given.options.size : -1 }) },
			migrations: { 1: (data) => ({ count: Number(data) }) },
		});
		expect(slice.save()).toEqual({ count: 10 });
		slice.load("4", 1);
		expect(parts.state.value).toEqual({ count: 7 });
		expect(thrown(() => {
				slice.load("4", 0);
			}).summary).toContain("has version 0, and the head has no migration from it");
		expect(parts.state.value).toEqual({ count: 7 });
	});
});
