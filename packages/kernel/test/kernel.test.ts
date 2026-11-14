// SPDX-License-Identifier: Apache-2.0
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { describe, expect, it } from "vitest";
import { kindOf, SwtError } from "@swarmtales/contracts";
import type { ActorDriver, ActorId, Envelope, EventSink, KernelDefinition, PluginInstance, ResolvedPlugin, ResumeInput, RunEnd, SchedulerDefinition } from "@swarmtales/contracts";
import { createKernel, createRng } from "../src/index.ts";

const A: ActorId = "resident:a";
const ADD = "@sample/counter/counter/add";
const added = Type.Object({ by: Type.Number({ description: "The amount" }) }, { description: "The counter grew" });

// A hand-written plugin: a counter with a tool that adds to it (and throws for 13), a free look, a run limit at
// `full`, a fact, a line of input and a slice.
function counter(full: number, more: Partial<PluginInstance["hooks"]> = {}): ResolvedPlugin {
	return {
		id: "counter",
		package: "@sample/counter",
		version: "1.0.0",
		requires: [],
		provides: [],
		events: { added },
		audiences: { added: ["all"] },
		options: null,
		create(port): PluginInstance {
			let count = 0;
			const add = (by: number) => {
				if (by === 13) throw new RangeError("unlucky");
				count += by;
				port.emit("added", { by });
				return { ok: true, reply: `now ${String(count)}` } as const;
			};
			return {
				tools: [
					{ name: "add", description: "Adds to the counter", parameters: added, free: false, prepare: (raw) => ({ params: raw, rule: () => undefined, execute: () => add(Number(raw)) }), sample: (_actor, random) => random.int(1, 3) },
					{ name: "look", description: "Reads the counter", parameters: Type.Object({}, { description: "Nothing" }), free: true, prepare: (raw) => ({ params: raw, rule: () => undefined, execute: () => ({ ok: true, reply: String(count) }) }) },
				],
				services: [],
				listeners: [],
				hooks: { inputs: [{ run: () => [`count ${String(count)}`] }], ...more },
				stages: {},
				jobs: {},
				limits: [{ id: "full", summary: "The counter is full", check: () => (count >= full ? "full" : undefined) }],
				facts: { count: { output: Type.Number({ description: "The counter" }), compute: () => count } },
				slice: { version: 1, save: () => count, load: (data) => void (count = Number(data)) },
			};
		},
	};
}

// The three-line scheduler: every tick it activates every actor once, in the order of the definition.
const each: SchedulerDefinition = {
	id: "@sample/each",
	revision: 1,
	determinism: "seeded",
	options: Type.Object({}, { description: "No options" }),
	events: {},
	create: () => ({
		async run(port, drivers, until) {
			for (let ticks = 0; until === undefined || ticks < until.ticks; ticks += 1) {
				await port.beginTick();
				for (const id of port.actors.ids.filter(() => !port.halted)) {
					const open = port.open(id, port.inputsFor(id), {});
					await drivers[kindOf(id)]?.(open);
					open.close(false);
				}
				const end = await port.endTick(false);
				if (end !== undefined) return end;
			}
			return undefined;
		},
	}),
};

function definition(options: { readonly full?: number; readonly maxTicks?: number; readonly plugins?: readonly ResolvedPlugin[] } = {}): KernelDefinition {
	const plugins = options.plugins ?? [counter(options.full ?? 100)];
	return { game: { id: "sample", hash: "h1" }, seed: 11, actors: [{ id: A, kind: "resident", grant: "all", shared: {} }], plugins, scheduler: { definition: each, options: {} }, grants: { all: [ADD, "@sample/counter/counter/look"] }, names: { [ADD]: "plus" }, startLocks: {}, replies: {}, limits: { maxTicks: options.maxTicks ?? 4 } };
}

// A sink that keeps what it gets.
function keeper(): EventSink & { readonly events: Envelope[]; readonly ends: RunEnd[] } {
	const events: Envelope[] = [];
	const ends: RunEnd[] = [];
	return { events, ends, write: (event) => void events.push(event), close: (end) => void ends.push(end) };
}

// Adds the tick plus one, so a later tick is told from an earlier one.
const adder: ActorDriver = async (activation) => {
	await activation.call("plus", activation.tick + 1);
};
const unlucky: ActorDriver = async (activation) => {
	await activation.call("plus", 13);
};
const types = (events: readonly Envelope[]): readonly string[] => events.map((event) => event.type);
const caught = async (code: () => unknown): Promise<unknown> => {
	try {
		await code();
	} catch (error) {
		return error;
	}
	return undefined;
};
const broken = (): never => {
	throw new RangeError("the hook broke");
};
const codeOf = (error: unknown): string | undefined => (error instanceof SwtError ? error.issues[0]?.code : undefined);

describe("createKernel", () => {
	it("plays a run to its limit, tells the sinks and refuses what comes after the end", async () => {
		const sink = keeper();
		const kernel = createKernel(definition({ full: 3 }), { sinks: [sink] });
		expect(kernel.plugins).toEqual(["counter"]);
		expect(kernel.toolSpecs("all").map((spec) => spec.name)).toEqual(["plus", "look"]);
		expect(kernel.openTools(A)).toEqual(["plus", "look"]);
		expect(kernel.openTools("resident:nobody")).toEqual([]);
		expect(kernel.sample(A, "plus", createRng(1))).toBeTypeOf("number");
		expect(kernel.sample(A, "look", createRng(1))).toBeUndefined();
		const end = await kernel.run({ resident: adder });
		expect(end).toEqual({ reason: "limit", tick: 2, limit: "counter.full" });
		expect(kernel.ended).toEqual(end);
		expect(kernel.tick).toBe(2);
		expect(sink.events).toEqual(kernel.log.all());
		expect(sink.ends).toEqual([end]);
		expect(types(kernel.log.all()).slice(0, 7)).toEqual(["run_started", "tick_started", "activation_opened", "tool_called", "added", "tool_result", "activation_closed"]);
		expect(types(kernel.log.all()).slice(-2)).toEqual(["limit_reached", "run_ended"]);
		expect(kernel.log.ofType("@sample/counter/counter", "added").map((event) => event.audience)).toEqual([["all"], ["all"]]);
		expect(kernel.log.ofType("kernel", "activation_opened")[0]?.payload).toMatchObject({ inputs: [{ source: "counter", text: "count 0" }] });
		expect(kernel.fact("counter.count")).toBe(3);
		expect(await kernel.run({ resident: adder })).toEqual(end);
		expect(() => {
			kernel.start();
		}).toThrow(RangeError);
		expect(await caught(() => kernel.submit({ actor: A, as: "plus", params: 1 }))).toBeInstanceOf(RangeError);
		expect(kernel.log.length).toBe(sink.events.length);
	});

	it("ends at the last tick, starts once and takes a call from outside an activation", async () => {
		const kernel = createKernel(definition({ maxTicks: 2 }));
		kernel.start();
		expect(() => {
			kernel.start();
		}).toThrow(RangeError);
		expect(await kernel.submit({ actor: A, as: "plus", params: 5 })).toEqual({ ok: true, reply: "now 5" });
		expect(await kernel.run({ resident: adder }, { ticks: 1 })).toBeUndefined();
		expect(await kernel.run({ resident: adder })).toEqual({ reason: "ticks", tick: 2 });
		expect(types(kernel.log.ofType("kernel", "run_started"))).toHaveLength(1);
		expect(kernel.fact("counter.count")).toBe(8);
	});

	it("names the known facts for an unknown key", () => {
		const error = caught(() => createKernel(definition()).fact("counter.cuont"));
		return expect(error).resolves.toSatisfy((thrown) => codeOf(thrown) === "SWT-R015" && thrown instanceof SwtError && thrown.issues[0]?.fix === 'Did you mean "counter.count"?');
	});

	it("ends with the error when plugin code throws, and gives the first failure as the cause of every later use", async () => {
		const sink = keeper();
		const kernel = createKernel(definition(), { sinks: [sink] });
		const first = await caught(() => kernel.run({ resident: unlucky }));
		expect(codeOf(first)).toBe("SWT-R003");
		expect(first).toMatchObject({ cause: new RangeError("unlucky") });
		expect(kernel.log.all().at(-1)).toMatchObject({ type: "run_ended", payload: { reason: "error", detail: "SWT-R003: counter: unlucky" } });
		expect(kernel.ended).toEqual({ reason: "error", tick: 0 });
		expect(sink.ends).toEqual([{ reason: "error", tick: 0 }]);
		expect(sink.events).toEqual(kernel.log.all());
		const later = [await caught(() => kernel.run({ resident: adder })), await caught(() => kernel.submit({ actor: A, as: "plus", params: 1 })), await caught(() => kernel.snapshot()), await caught(() => { kernel.start(); })];
		expect(later.map(codeOf)).toEqual(["SWT-R001", "SWT-R001", "SWT-R001", "SWT-R001"]);
		expect(later.every((error) => error instanceof SwtError && error.cause === first)).toBe(true);
		expect(kernel.log.length).toBe(sink.events.length);
	});

	it("ends with the error of a driver and of a hook", async () => {
		const kernel = createKernel(definition());
		const thrown = new TypeError("the driver broke");
		expect(await caught(() => kernel.run({ resident: () => Promise.reject<undefined>(thrown) }))).toBe(thrown);
		expect(kernel.log.all().at(-1)).toMatchObject({ type: "run_ended", payload: { reason: "error", detail: "the driver broke" } });
		expect(await caught(() => kernel.run({ resident: adder }))).toMatchObject({ cause: thrown });
		const hooked = createKernel(definition({ plugins: [counter(100, { tickStarted: [{ run: broken }] })] }));
		const first = await caught(() => hooked.run({ resident: adder }));
		expect(codeOf(first)).toBe("SWT-R003");
		expect(await caught(() => hooked.submit({ actor: A, as: "plus", params: 1 }))).toMatchObject({ cause: first });
	});

	it("refuses two plugins with a `toAct` hook", () => {
		const acting = (id: string): ResolvedPlugin => ({ ...counter(100), id, events: {}, audiences: {}, create: (port) => ({ ...counter(100).create(port), tools: [], hooks: { toAct: () => [A] } }) });
		const error = caught(() => createKernel({ ...definition({ plugins: [acting("one"), acting("two")] }), grants: {}, names: {} }));
		return expect(error).resolves.toSatisfy((thrown) => codeOf(thrown) === "SWT-R013");
	});
});

describe("createKernel, resumed", () => {
	// Two ticks of a run, then its snapshot and its log as a file holds them: through JSON, with the stamp of a sink.
	async function cut(): Promise<ResumeInput> {
		const kernel = createKernel(definition({ full: 6 }));
		await kernel.run({ resident: adder }, { ticks: 2 });
		const text = JSON.stringify({ snapshot: kernel.snapshot(), log: kernel.log.all().map((event) => ({ ...event, at: "2026-01-01T00:00:00.000Z" })) });
		return Parse(Type.Object({ snapshot: Type.Unknown(), log: Type.Array(Type.Unknown()) }), JSON.parse(text));
	}

	it("gives the same later events as the run that was not cut", async () => {
		const whole = createKernel(definition({ full: 6 }));
		const end = await whole.run({ resident: adder });
		expect(end).toEqual({ reason: "limit", tick: 3, limit: "counter.full" });
		const sink = keeper();
		const resumed = createKernel(definition({ full: 6 }), { sinks: [sink] }, await cut());
		expect(resumed.tick).toBe(2);
		expect(resumed.fact("counter.count")).toBe(3);
		expect(() => {
			resumed.start();
		}).toThrow(RangeError);
		expect(await resumed.run({ resident: adder })).toEqual(end);
		expect(resumed.log.all()).toEqual(whole.log.all());
		expect(sink.events).toEqual(whole.log.all().slice(resumed.log.length - sink.events.length));
		expect(sink.events[0]?.type).toBe("tick_started");
		const over = createKernel(definition({ full: 6 }), {}, { snapshot: resumed.snapshot(), log: resumed.log.all() });
		expect(over.ended).toEqual(end);
		expect(await over.run({ resident: adder })).toEqual(end);
		expect(over.log.length).toBe(whole.log.length);
	});

	it("refuses a snapshot or a log that does not fit", async () => {
		const input = await cut();
		const refused = (resume: ResumeInput, game = definition({ full: 6 })) => caught(() => createKernel(game, {}, resume)).then(codeOf);
		expect(await refused({ ...input, snapshot: { format: "other" } })).toBe("SWT-R002");
		expect(await refused({ ...input, log: input.log.slice(1) })).toBe("SWT-R002");
		expect(await refused({ ...input, log: input.log.slice(0, -1) })).toBe("SWT-R002");
		expect(await refused(input, { ...definition({ full: 6 }), seed: 12 })).toBe("SWT-R002");
		expect(await refused(input)).toBeUndefined();
	});
});
