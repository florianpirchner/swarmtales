// SPDX-License-Identifier: Apache-2.0
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { SwtError, type ActorId, type Envelope, type PluginPort, type RandomSource, type SwtIssue } from "@swarmtales/contracts";
import { defineHandlers, defineHead } from "../src/mechanic/define-head.ts";
import { defineMechanic } from "../src/mechanic/define-mechanic.ts";
import { defineEvents, defineService, reply } from "../src/mechanic/definers.ts";

const Tally = defineService({
	name: "tally",
	summary: "The count.",
	methods: { read: { kind: "query", summary: "The count.", input: Type.Object({}), output: Type.Integer() } },
});
const Board = defineEvents("board", { moved: Type.Object({ cell: Type.Integer() }) });

const head = defineHead({
	id: "counter",
	package: "@test/counter",
	summary: "Counts.",
	options: Type.Object({ step: Type.Integer({ minimum: 1, maximum: 5, default: 1, description: "What one call adds." }) }, { description: "The options." }),
	state: Type.Object({ count: Type.Integer(), residents: Type.Array(Type.String()) }),
	start: (setup) => ({ count: 0, residents: [...setup.residents] }),
	events: { counted: Type.Object({ count: Type.Integer() }) },
	audiences: { counted: ["resident"] },
	prompts: { "counter/add": [] },
	provides: [Tally],
	tools: {
		add: { description: "counter/add", params: Type.Object({ times: Type.Integer() }), for: ["resident"] },
		look: { description: "Shows the count.", params: Type.Object({}), free: true },
	},
});
const adding = defineHandlers(head, {
	add: {
		run(params, ctx) {
			ctx.state.count += params.times * ctx.options.step;
			ctx.emit("counted", { count: ctx.state.count });
			if (ctx.resident !== undefined) ctx.access.lock(ctx.resident, "add");
			return reply(`Count: ${ctx.state.count}`);
		},
	},
});
const counter = defineMechanic(head, {
	tools: { ...adding, look: { run: (_params, ctx) => reply(`Count: ${ctx.state.count}`) } },
	services: { tally: { read: (_input, ctx) => ctx.state.count } },
	listeners: (kit) => [
		kit.listen(Board, "moved", (payload, ctx) => {
			ctx.state.count += payload.cell;
		}),
	],
	facts: { total: { output: Type.Integer(), compute: (view) => view.state.count } },
	limits: { high: { summary: "Ends at 100.", breached: (view) => (view.state.count >= 100 ? "the count reached 100" : undefined) } },
	jobs: { reset: (ctx) => void (ctx.state.count = 0) },
	hooks: { toAct: (ctx) => ctx.state.residents },
	pipeline: { after: (call, _outcome, ctx) => void (ctx.state.count += call.tool === "look" ? 1000 : 0) },
});

const random: RandomSource = { next: () => 0, int: (min) => min, pick: (items) => items[0] ?? raise(), shuffle: (items) => [...items] };
function raise(): never {
	throw new RangeError("pick of an empty list");
}
const ACTORS: readonly ActorId[] = ["resident:A01", "resident:A02", "director:D1"];

/** A stub port of the plugin `owner`, with a note of every emit and lock. */
function stub(owner: { readonly id: string; readonly package: string }): { readonly port: PluginPort; readonly calls: unknown[][] } {
	const calls: unknown[][] = [];
	const port: PluginPort = {
		stage: () => undefined,
		id: owner.id,
		source: `${owner.package}/${owner.id}`,
		seed: 7,
		maxTicks: 9,
		tick: () => 2,
		emit: (type, payload) => void calls.push(["emit", type, payload]),
		call: () => undefined,
		has: () => false,
		rng: () => random,
		actors: { ids: ACTORS, ofKind: (kind) => ACTORS.filter((id) => id.startsWith(`${kind}:`)), has: () => true, mayAct: () => true, shared: () => undefined, suspend: () => undefined, resume: () => undefined },
		schedule: { at: () => undefined },
		access: { lock: (actor, tool) => void calls.push(["lock", actor, tool]), unlock: () => undefined, isLocked: () => false, isOpen: () => true, open: () => [] },
	};
	return { port, calls };
}

/** The issues of the `SwtError` that `run` throws. */
function issuesOf(run: () => unknown): readonly SwtIssue[] {
	try {
		run();
	} catch (error) {
		if (error instanceof SwtError) return error.issues;
		throw error;
	}
	return [];
}
const texts = { render: (owner: string, id: string): string => `text of ${owner}/${id}` };

describe("defineMechanic: the definition", () => {
	it("says of each tool whether its body has a `sample` (M1 review, finding C2)", () => {
		const none = Type.Object({}, { description: "No arguments." });
		const pair = defineHead({ id: "pair", package: "@test/pair", summary: "Two tools.", tools: { drawn: { description: "Draws.", params: none }, fixed: { description: "Stays.", params: none } } });
		const definition = defineMechanic(pair, { tools: { drawn: { run: () => reply("Drawn."), sample: () => ({}) }, fixed: { run: () => reply("Stays.") } } });
		expect(definition.head.tools.map((tool) => [tool.name, tool.sampled])).toEqual([["drawn", true], ["fixed", false]]);
	});

	it("is callable and carries the erased head", () => {
		expect(counter({ step: 2 })).toEqual({ mechanic: counter, options: { step: 2 } });
		expect(counter().options).toEqual({});
		expect([counter.id, counter.package, counter.source]).toEqual(["counter", "@test/counter", "@test/counter/counter"]);
		expect(counter.events).toBe(head.events);
		expect(counter.head.tools.map((tool) => [tool.name, tool.for, tool.free])).toEqual([
			["add", ["resident"], false],
			["look", [], true],
		]);
		expect(counter.head).toMatchObject({ version: 1, audiences: { counted: ["resident"] }, provides: [Tally], requires: [] });
	});

	it("parseOptions fills defaults and reports every bad or unknown option as SWT-G020 under `options`", () => {
		const raw = { step: undefined };
		expect(counter.parseOptions(raw)).toEqual({ step: 1 });
		expect(counter.parseOptions(undefined)).toEqual({ step: 1 });
		expect(raw).toEqual({ step: undefined });
		const issues = issuesOf(() => counter.parseOptions({ stp: 2, step: 9 }));
		expect(issues.map((issue) => [issue.code, issue.where?.path])).toEqual([
			["SWT-G020", "options.stp"],
			["SWT-G020", "options.step"],
		]);
		expect(issues[0]?.summary).toContain('is unknown; did you mean "step"?');
		expect(issuesOf(() => counter.parseOptions([1])).map((issue) => issue.where?.path)).toEqual(["options"]);
	});
});

describe("defineMechanic: resolve", () => {
	it("gives the plugin of the head's package, and parses the options not again", () => {
		// 9 is over the schema's maximum: `resolve` takes what `parseOptions` gave and checks no schema.
		const plugin = counter.resolve({ step: 9 }, texts, "1.2.3");
		expect(plugin).toMatchObject({ id: "counter", package: "@test/counter", version: "1.2.3", requires: [], provides: ["tally"], audiences: { counted: ["resident"] }, options: { step: 9 } });
		expect(plugin.events).toBe(head.events);
		const { port } = stub(plugin);
		const add = plugin.create(port).tools[0];
		expect(add?.prepare({ times: 1 }, "resident:A01")?.execute()).toEqual(reply("Count: 9"));
	});

	it("the instance answers a tool call against a stub port", () => {
		const plugin = counter.resolve(counter.parseOptions({ step: 2 }), texts, "0.0.0");
		const { port, calls } = stub(plugin);
		const instance = plugin.create(port);
		const [add, look] = instance.tools;
		expect([add?.name, add?.description, look?.description, look?.free]).toEqual(["add", "text of counter/counter/add", "Shows the count.", true]);
		expect(add?.prepare({ times: "x" }, "resident:A01")).toBeUndefined();
		expect(add?.prepare({ times: "3" }, "resident:A01")?.execute()).toEqual(reply("Count: 6"));
		// The head's package reaches the canonical name of the lock.
		expect(calls).toEqual([
			["emit", "counted", { count: 6 }],
			["lock", "resident:A01", "@test/counter/counter/add"],
		]);
	});

	it("the instance answers a service call and a listener", () => {
		const plugin = counter.resolve(counter.parseOptions({ step: 2 }), texts, "0.0.0");
		const instance = plugin.create(stub(plugin).port);
		instance.tools[0]?.prepare({ times: 3 }, "kernel")?.execute();
		expect(instance.services[0]?.call("read", {}, "other")).toBe(6);
		const moved: Envelope = { seq: 5, tick: 2, source: "@test/board/board", type: "moved", actor: "kernel", payload: { cell: 4 } };
		expect(instance.listeners.map((listener) => [listener.source, listener.type])).toEqual([["board", "moved"]]);
		instance.listeners[0]?.run(moved);
		expect(instance.facts.total?.compute()).toBe(10);
	});

	it("the instance carries limits, hooks, stage handlers, jobs and the slice of the body", () => {
		const plugin = counter.resolve(counter.parseOptions({}), texts, "0.0.0");
		const instance = plugin.create(stub(plugin).port);
		instance.tools[0]?.prepare({ times: 10 }, "kernel")?.execute();
		expect(instance.limits.map((limit) => [limit.id, limit.check()])).toEqual([["high", undefined]]);
		expect(instance.hooks.toAct?.()).toEqual(["resident:A01", "resident:A02"]);
		expect(Object.keys(instance.stages)).toEqual(["after"]);
		expect(instance.slice?.save()).toEqual({ count: 10, residents: ["A01", "A02"] });
		instance.jobs.reset?.(undefined);
		expect(instance.slice?.save()).toMatchObject({ count: 0 });
		expect(instance.slice?.version).toBe(1);
	});

	it("each instance has its own state, and a custom state is saved through `snapshot`", () => {
		const setHead = defineHead({
			id: "seen",
			package: "@test/seen",
			summary: "Remembers.",
			state: Type.Array(Type.String()),
			snapshot: { save: (state: Set<string>) => [...state], load: (data) => new Set(data) },
			version: 2,
			migrations: { 1: () => ["migrated"] },
			start: () => new Set<string>(),
			tools: { see: { description: "Sees.", params: Type.Object({ what: Type.String() }) } },
		});
		const seen = defineMechanic(setHead, { tools: { see: { run: (params, ctx) => reply(String(ctx.state.add(params.what).size)) } } });
		const plugin = seen.resolve(seen.parseOptions({}), texts, "0.0.0");
		const [first, second] = [plugin.create(stub(plugin).port), plugin.create(stub(plugin).port)];
		first.tools[0]?.prepare({ what: "a" }, "kernel")?.execute();
		expect([first.slice?.save(), second.slice?.save()]).toEqual([["a"], []]);
		second.slice?.load(["old"], 1);
		expect(second.slice?.save()).toEqual(["migrated"]);
	});
});

describe("defineMechanic: what the types let through", () => {
	const plain = { id: "plain", package: "@test/plain", summary: "Plain." };
	const codes = (run: () => unknown): readonly (readonly unknown[])[] => issuesOf(run).map((issue) => [issue.code, issue.details]);

	it("refuses a body that does not fit its head with SWT-M012, every difference at once", () => {
		const stray = { ...adding, look: { run: () => reply("") } };
		const toolHead = defineHead({ ...plain, provides: [Tally], tools: { peek: { description: "Peeks.", params: Type.Object({}) } } });
		// @ts-expect-error -- the body lacks `services` and `tools.peek`; the stray entries came through a spread
		expect(codes(() => defineMechanic(toolHead, { tools: { ...stray }, services: { ...{ other: {} } } }))).toEqual([
			["SWT-M012", { part: "tool", problem: "missing" }],
			["SWT-M012", { part: "tool", problem: "undeclared" }],
			["SWT-M012", { part: "tool", problem: "undeclared" }],
			["SWT-M012", { part: "service", problem: "missing" }],
			["SWT-M012", { part: "service", problem: "undeclared" }],
		]);
	});

	it("refuses a state that cannot be started or saved with SWT-M014", () => {
		expect(codes(() => defineMechanic(defineHead({ ...plain, state: Type.Integer() }), {}))).toEqual([["SWT-M014", { problem: "no-start" }]]);
		expect(codes(() => defineMechanic(defineHead({ ...plain, snapshot: { save: (state: Set<string>) => (state.clear(), undefined), load: () => new Set<string>() } }), {}))).toEqual([["SWT-M014", { problem: "no-schema" }]]);
		expect(codes(() => defineMechanic(defineHead(plain), {}))).toEqual([]);
	});

	it("refuses an `options` schema that is no object", () => {
		expect(issuesOf(() => defineMechanic(defineHead({ ...plain, options: Type.Integer() }), {})).map((issue) => issue.code)).toEqual(["SWT-M013"]);
	});
});

describe("the value defineMechanic returns (M4-72)", () => {
	it("refuses a write after the definition, on the definition, its head and the lists of the head", () => {
		const alias = counter;
		expect(Reflect.set(alias, "resolve", () => undefined)).toBe(false);
		expect(Reflect.set(counter.head, "options", Type.Object({}))).toBe(false);
		expect(() => Object.defineProperty(counter.head, "summary", { value: "changed" })).toThrow(TypeError);
		expect(() => Object.defineProperty(counter.head.tools[0], "name", { value: "other" })).toThrow(TypeError);
		expect(Reflect.set(counter.head.events, "extra", Type.Object({}))).toBe(false);
		expect([counter.head.summary, counter.head.tools[0]?.name, Object.isFrozen(counter)]).toEqual(["Counts.", "add", true]);
	});
});
