// SPDX-License-Identifier: Apache-2.0
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { SwtError, type Envelope, type KernelDefinition, type KernelTool, type PluginInstance, type PluginPort, type ProvidedService, type ResolvedPlugin, type ToolCall } from "@swarmtales/contracts";
import { loadPlugins } from "../src/loader.ts";
import type { Access, Actors, Clock, Loaded, Log } from "../src/parts.ts";
import { rngFor } from "../src/random.ts";
import { createServices } from "../src/services.ts";

const never = (): never => {
	throw new TypeError("not used by the loader");
};
/** The code and the summary of what `run` throws: of an `SwtError` its first issue, else the error's name and message. */
function failure(run: () => unknown): { readonly code: string; readonly summary: string; readonly fix: string } {
	try {
		run();
	} catch (thrown) {
		if (thrown instanceof SwtError) return { code: thrown.code, summary: thrown.issues[0]?.summary ?? "", fix: thrown.issues[0]?.fix ?? "" };
		return { code: thrown instanceof Error ? thrown.name : "", summary: String(thrown), fix: "" };
	}
	return { code: "nothing thrown", summary: "", fix: "" };
}

const CALL: ToolCall = { actor: "script", tool: "pkg/a/look", name: "look", as: "see", owner: "a", params: null, seq: 1 };
const SCHEMA = Type.Object({}, { description: "an empty payload" });
const EMPTY: PluginInstance = { tools: [], services: [], listeners: [], hooks: {}, stages: {}, jobs: {}, limits: [], facts: {}, slice: undefined };

/** A hand-written plugin: the static data of `head` and an instance made of `body`; `seen` gets its port. */
function plugin(id: string, head: Partial<ResolvedPlugin> = {}, body: Partial<PluginInstance> | ((port: PluginPort) => Partial<PluginInstance>) = {}): ResolvedPlugin {
	const create = (port: PluginPort): PluginInstance => ({ ...EMPTY, ...(typeof body === "function" ? body(port) : body) });
	return { id, package: "pkg", version: "1.0.0", requires: [], provides: [], events: {}, audiences: {}, options: null, create, ...head };
}
const tool = (name: string): KernelTool => ({ name, description: name, parameters: SCHEMA, free: false, prepare: never });
const service = (name: string): ProvidedService => ({ service: { name, summary: name, methods: {} }, call: never });

/** Loads the plugins against fakes of the neighbours; the log records what is emitted and who listens. */
function load(plugins: readonly ResolvedPlugin[], over: Partial<KernelDefinition> = {}): { readonly loaded: Loaded; readonly listened: readonly string[]; readonly hear: () => void; readonly emitted: readonly string[]; readonly jobs: readonly string[] } {
	const scheduler = { definition: { id: "sched", revision: 1, determinism: "seeded" as const, options: SCHEMA, events: { lap_started: SCHEMA }, create: never }, options: null };
	const definition: KernelDefinition = { game: { id: "g", hash: "h" }, seed: 7, actors: [], plugins, scheduler, grants: {}, names: {}, startLocks: {}, replies: {}, limits: { maxTicks: 9 }, ...over };
	const listened: string[] = [];
	const emitted: string[] = [];
	const jobs: string[] = [];
	const heard: ((event: Envelope) => void)[] = [];
	const event: Envelope = { seq: 1, tick: 0, source: "s", type: "t", actor: "kernel", payload: null };
	const log: Log = { length: 0, all: () => [], since: () => [], ofType: () => [], run: (_frame, code) => code(), frame: () => ({ actor: "kernel" }), addSink: never, fail: never, emit: (source, type) => (emitted.push(`${source} ${type}`), event), listen: (source, type, run) => void (listened.push(`${source} ${type}`), heard.push(run)) };
	const actors: Actors = { ids: [], ofKind: () => [], has: () => false, mayAct: () => true, shared: () => undefined, spec: () => undefined, state: () => ({}), restore: never, portFor: () => ({ ids: [], ofKind: () => [], has: () => false, mayAct: () => true, shared: () => undefined, suspend: never, resume: never }) };
	const access: Access = { granted: () => false, grantsOf: () => [], isLocked: () => false, setProbe: never, state: () => ({}), restore: never, portFor: () => ({ lock: never, unlock: never, isLocked: () => false, isOpen: () => false, open: () => [] }) };
	const clock: Clock = { tick: 3, advance: never, take: () => [], state: () => [], restore: never, at: (owner, tick, job) => void jobs.push(`${owner} ${String(tick)} ${job}`) };
	return { loaded: loadPlugins(definition, { log, actors, access, clock, services: createServices(log) }), listened, emitted, jobs, hear: () => { for (const run of heard) run(event); } };
}

const cycle = { runStarted: [{ run: () => undefined, after: ["a"] }] };
const listener = (source: string, schema = SCHEMA, after?: readonly string[]) => ({ source, type: "done", schema, run: () => undefined, ...(after === undefined ? {} : { after }) });
const declares = { events: { done: SCHEMA } };

describe("loadPlugins: each check of 3.2, raised by a hand-written plugin", () => {
	it.each<[string, string, () => unknown]>([
		["a `requires` without a loaded provider", "SWT-R002", () => load([plugin("a", { requires: ["store"] })])],
		["a service with two providers", "SWT-R002", () => load([plugin("a", { provides: ["store"] }, { services: [service("store")] }), plugin("b", { provides: ["store"] }, { services: [service("store")] })])],
		["a declared service the body does not provide", "SWT-R002", () => load([plugin("a", { provides: ["store"] })])],
		["a plugin's event with a kernel event type", "SWT-R002", () => load([plugin("a", { events: { tool_called: SCHEMA } })])],
		["two plugins that declare one event type", "SWT-R002", () => load([plugin("a", declares), plugin("b", declares)])],
		["a plugin's event with an event type of the scheduler", "SWT-R002", () => load([plugin("a", { events: { lap_started: SCHEMA } })])],
		["a granted tool that does not exist", "SWT-R002", () => load([plugin("a", {}, { tools: [tool("look")] })], { grants: { all: ["pkg/a/look", "pkg/a/lok"] } })],
		["a named tool that does not exist", "SWT-R002", () => load([plugin("a")], { names: { "pkg/a/look": "see" } })],
		["a start-locked tool that does not exist", "SWT-R002", () => load([plugin("a")], { startLocks: { all: ["pkg/a/look"] } })],
		["one plugin with two tools of one name", "SWT-R002", () => load([plugin("a", {}, { tools: [tool("look"), tool("look")] })])],
		["a plugin id listed twice", "SWT-R002", () => load([plugin("a"), plugin("a")])],
		["a listener with a schema object of its own", "SWT-R002", () => load([plugin("a", declares), plugin("b", {}, { listeners: [listener("a", Type.Object({}))] })])],
		["a listener of an event its plugin does not declare", "SWT-R002", () => load([plugin("a"), plugin("b", {}, { listeners: [listener("a")] })])],
		["two `toAct` hooks", "SWT-R013", () => load([plugin("a", {}, { hooks: { toAct: () => [] } }), plugin("b", {}, { hooks: { toAct: () => [] } })])],
		["a cycle of `after` among the hooks", "SWT-R016", () => load([plugin("a", {}, { hooks: { runStarted: [{ run: () => undefined, after: ["b"] }] } }), plugin("b", {}, { hooks: cycle })])],
		["a cycle of `after` among the listeners of one event", "SWT-R016", () => load([plugin("a", declares, { listeners: [listener("a", SCHEMA, ["b"])] }), plugin("b", {}, { listeners: [listener("a", SCHEMA, ["a"])] })])],
		["a `create` that throws", "SWT-R003", () => load([plugin("a", {}, never)])],
	])("%s is %s", (_name, code, run) => {
		expect(failure(run).code).toBe(code);
	});

	it("says which plugin threw and which tool was meant", () => {
		expect(failure(() => load([plugin("a", {}, never)])).summary).toBe("a: not used by the loader");
		expect(failure(() => load([plugin("a", {}, { tools: [tool("look")] })], { grants: { all: ["pkg/a/lok"] } })).fix).toBe('Did you mean "pkg/a/look"?');
	});
});

describe("loadPlugins: a listener of a plugin that is not loaded (decision 10)", () => {
	it("is left out, and the plugin loads alone; its other listeners stay", () => {
		expect(load([plugin("b", {}, { listeners: [listener("absent")] })]).listened).toEqual([]);
		expect(load([plugin("a", declares), plugin("b", {}, { listeners: [listener("absent"), listener("a")] })]).listened).toEqual(["pkg/a done"]);
		expect(failure(() => load([plugin("a"), plugin("b", {}, { listeners: [listener("absent"), listener("a")] })])).code).toBe("SWT-R002");
	});
});

describe("loadPlugins: what it gives", () => {
	const order: string[] = [];
	const note = (text: string) => () => void order.push(text);
	const early: boolean[] = [];
	const a = plugin("a", { provides: ["store"], ...declares }, (port) => ({
		limits: [{ id: "won", summary: String(early.push(port.has("late"), port.has("shop"))), check: () => undefined }],
		tools: [tool("look")], services: [service("store")], listeners: [{ ...listener("a", SCHEMA, ["b"]), run: note("a hears") }], jobs: { wake: () => undefined },
		hooks: { runStarted: [{ run: note("a1"), after: ["b"] }, { run: note("a2") }], tickEnded: [["wake", "sleep"].map((job) => ({ run: () => { port.schedule.at(5, job); } })), ["done", "gone"].map((type) => ({ run: () => { port.emit(type, {}); } }))].flat() },
		stages: { lock: () => (order.push("a lock"), undefined) },
	}));
	const b = plugin("b", { requires: ["store"], provides: ["late"] }, (port) => ({
		tools: [tool("look")], services: [service("late")], listeners: [{ ...listener("a"), run: note("b hears") }], stages: { lock: () => (order.push("b lock"), undefined), after: never },
		hooks: { runStarted: [{ run: note(`b ${port.source} ${String(port.tick())} ${String(port.maxTicks)} ${String(port.rng("x").next() === rngFor(7, "x").next())}`) }] },
	}));
	const { loaded, listened, emitted, jobs, hear } = load([a, b], { names: { "pkg/a/look": "see", "pkg/b/look": "see" } });

	it("has the tools under canonical and shown names, the limits, and the stage handlers in load order", () => {
		expect(loaded.order).toEqual(["a", "b"]);
		expect([...loaded.tools.keys()]).toEqual(["pkg/a/look", "pkg/b/look"]);
		expect(loaded.byShownName.get("see")?.map((entry) => entry.owner)).toEqual(["a", "b"]);
		expect(loaded.limits.map((limit) => limit.id)).toEqual(["a.won"]);
		for (const lock of loaded.stages("lock")) lock(CALL);
		expect(order).toEqual(["a lock", "b lock"]);
		expect(loaded.stages("rule")).toHaveLength(0);
		expect(failure(() => loaded.stages("after")[0]?.(CALL, { ok: true, reply: "" })).code).toBe("SWT-R003");
	});

	it("places the hooks and the listeners by load order plus `after`, and a port that knows the services from the start", () => {
		order.length = 0;
		for (const hook of loaded.hooks("runStarted")) hook.run();
		expect(order).toEqual(["a2", "b pkg/b 3 9 true", "a1"]);
		expect(early).toEqual([true, false]);
		expect(loaded.hooks("runStarted").map((hook) => hook.plugin)).toEqual(["a", "b", "a"]);
		expect(listened).toEqual(["pkg/a done", "pkg/a done"]);
		order.length = 0;
		hear();
		expect(order).toEqual(["b hears", "a hears"]);
	});

	it("gives a port that refuses an undeclared event and a job the plugin does not have, as SWT-R003 of the plugin", () => {
		const [wake, sleep, done, gone] = loaded.hooks("tickEnded").map((hook) => hook.run);
		wake?.();
		done?.();
		expect([jobs, emitted]).toEqual([["a 5 wake"], ["pkg/a done"]]);
		expect(failure(() => sleep?.())).toMatchObject({ code: "SWT-R003", summary: 'a: "a" schedules the job "sleep", which it does not have' });
		expect(failure(() => gone?.())).toMatchObject({ code: "SWT-R003", summary: 'a: the event "gone" is not declared by "a"' });
	});
});
