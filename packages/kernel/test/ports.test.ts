// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import type { ActorId, Envelope, KernelDefinition, PluginHooks, PluginInstance, Submission } from "@swarmtales/contracts";
import type { Actors, Clock, Dispatch, Frame, Lifecycle, Loaded, Log, SchedulerPortParts } from "../src/parts.ts";
import { createSchedulerPort } from "../src/ports.ts";
import { rngFor } from "../src/random.ts";

const unused = (): never => {
	throw new RangeError("not used in this test");
};
const A: ActorId = "resident:a";
const SCHEDULER = "@swarmtales/engine/sample";

function fakeLog(): Log {
	const events: Envelope[] = [];
	const frames: Frame[] = [];
	const log: Log = {
		get length() {
			return events.length;
		},
		all: () => events,
		since: (seq) => events.filter((event) => event.seq > seq),
		ofType: (source, type) => events.filter((event) => event.source === source && event.type === type),
		emit(source, type, payload, extra) {
			const { actor, causedBy } = log.frame();
			const event: Envelope = { seq: events.length + 1, tick: 4, source, type, actor, ...(causedBy === undefined ? {} : { causedBy }), ...(extra?.basis === undefined ? {} : { basis: extra.basis }), payload };
			events.push(event);
			return event;
		},
		run(frame, code) {
			frames.push(frame);
			try {
				return code();
			} finally {
				frames.pop();
			}
		},
		frame: () => frames.at(-1) ?? { actor: "kernel" },
		listen: unused,
		addSink: unused,
		fail: unused,
	};
	return log;
}

function fakeLoaded(plugins: Readonly<Record<string, PluginHooks>>): Loaded {
	const order = Object.keys(plugins);
	const instances = new Map<string, PluginInstance>(order.map((id) => [id, { tools: [], services: [], listeners: [], hooks: plugins[id] ?? {}, stages: {}, jobs: {}, limits: [], facts: {}, slice: undefined }]));
	return {
		order,
		instances,
		tools: new Map(),
		byShownName: new Map(),
		hooks: (hook) => order.flatMap((plugin) => (plugins[plugin]?.[hook] ?? []).map((entry) => ({ plugin, run: entry.run }))),
		stages: () => [],
		limits: [],
	};
}

// A world with the log, a dispatch that answers every call with a result, and the port over the given plugins.
function world(plugins: Readonly<Record<string, PluginHooks>> = {}) {
	const log = fakeLog();
	const submissions: Submission[] = [];
	const state = { answer: 1, quiet: false, halted: false, failures: 0 };
	const dispatch: Dispatch = {
		submit(call) {
			submissions.push(call);
			const called = log.run({ actor: call.actor, ...(call.causedBy === undefined ? {} : { causedBy: call.causedBy }) }, () => log.emit("kernel", "tool_called", { as: call.as, params: call.params }, call.basis === undefined ? {} : { basis: call.basis }));
			state.answer = log.run({ actor: call.actor, causedBy: called.seq }, () => log.emit("kernel", "tool_result", { as: call.as, reply: "ok" })).seq;
			return Promise.resolve({ ok: true, reply: "ok" });
		},
		quietEnd: () => state.quiet,
		answerSeq: () => state.answer,
		settle: () => undefined,
	};
	const actors: Actors = { ids: [A], ofKind: unused, has: unused, mayAct: () => true, shared: unused, spec: (id) => (id === A ? { id, kind: "resident", grant: "all", shared: {} } : undefined), portFor: unused, state: unused, restore: unused };
	const clock: Clock = { tick: 4, advance: unused, at: unused, take: unused, state: unused, restore: unused };
	const life: Lifecycle = {
		start: unused,
		beginTick: () => Promise.resolve(),
		endTick: (idle) => Promise.resolve(idle ? { reason: "ticks", tick: 5 } : undefined),
		get halted() {
			return state.halted;
		},
		fail: () => {
			state.failures += 1;
		},
	};
	const scheduler = { id: SCHEDULER, revision: 1, determinism: "seeded", options: Type.Object({}), events: { noted: Type.Object({}) }, create: unused } as const;
	const definition: KernelDefinition = { game: { id: "sample", hash: "h" }, seed: 11, actors: [], plugins: [], scheduler: { definition: scheduler, options: null }, grants: {}, names: {}, startLocks: {}, replies: {}, limits: { maxTicks: 9 } };
	const parts: SchedulerPortParts = { definition, log, actors, clock, loaded: fakeLoaded(plugins), dispatch, toolSpecs: (grant) => [{ name: `look-${grant}`, description: "Looks", parameters: Type.Object({}) }] };
	return { log, submissions, state, create: () => createSchedulerPort(parts, life) };
}

describe("the scheduler's port", () => {
	it("gives the first call the basis of the inputs and a later call the seq of the answer before it (2.2)", async () => {
		const { log, submissions, create } = world();
		const port = create();
		log.emit("kernel", "tick_started", {});
		log.emit("kernel", "job_ran", {});
		port.inputsFor(A);
		log.emit("kernel", "job_ran", {});
		const open = port.open(A, [{ source: "p", text: "hello" }], { reason: "always" });
		expect(log.all()[3]).toEqual({ seq: 4, tick: 4, source: "kernel", type: "activation_opened", actor: A, basis: 2, payload: { actor: A, inputs: [{ source: "p", text: "hello" }], detail: { reason: "always" } } });
		expect([open.basis, open.tick, open.tools.map((tool) => tool.name)]).toEqual([2, 4, ["look-all"]]);
		await open.call("look", { x: 1 });
		await open.call("look", undefined);
		expect(submissions).toEqual([
			{ actor: A, as: "look", params: { x: 1 }, basis: 2, causedBy: 4 },
			{ actor: A, as: "look", params: undefined, basis: 6, causedBy: 4 },
		]);
		// Without a new `inputsFor`, the basis is the log length at the opening.
		expect(port.open(A, [], {}).basis).toBe(8);
	});

	it("writes `activation_closed` once, with the count of the calls and the outcome", async () => {
		const { log, state, create } = world();
		const port = create();
		const acted = port.open(A, [], {});
		await acted.call("look", {});
		await acted.call("look", {});
		expect(acted.quietEnd).toBe(false);
		state.quiet = true;
		expect(acted.quietEnd).toBe(true);
		acted.close(false);
		acted.close(true);
		port.open(A, [], {}).close(false);
		const failed = port.open(A, [], {});
		await failed.call("look", {});
		failed.close(true);
		const closed = log.ofType("kernel", "activation_closed");
		expect(closed.map((event) => event.payload)).toEqual([
			{ actor: A, calls: 2, outcome: "acted" },
			{ actor: A, calls: 0, outcome: "no-call" },
			{ actor: A, calls: 1, outcome: "error" },
		]);
		expect(closed.map((event) => [event.actor, event.causedBy])).toEqual([[A, 1], [A, 7], [A, 9]]);
	});

	it("runs the activation hooks in hook order: after `activation_opened`, and before `activation_closed` (M4 4.9)", async () => {
		const seen: string[] = [];
		const note = (word: string) => [{ run: (actor: ActorId) => void seen.push(`${word} ${actor} ${JSON.stringify(log.frame())} at ${String(log.length)}`) }];
		const { log, state, create } = world({ first: { activationOpened: note("first opened"), activationClosed: note("first closed") }, second: { activationOpened: note("second opened") }, third: { activationClosed: note("third closed") } });
		const open = create().open(A, [], {});
		// Each hook has its own frame of the kernel, caused by the opening line.
		const frame = JSON.stringify({ actor: "kernel", causedBy: 1 });
		expect(seen).toEqual([`first opened ${A} ${frame} at 1`, `second opened ${A} ${frame} at 1`]);
		await open.call("look", {});
		open.close(false);
		open.close(false);
		expect(seen.slice(2)).toEqual([`first closed ${A} ${frame} at 3`, `third closed ${A} ${frame} at 3`]);
		expect(log.all().map((event) => event.type)).toEqual(["activation_opened", "tool_called", "tool_result", "activation_closed"]);
		expect(state.failures).toBe(0);
	});

	it("ends the run when an activation hook throws, before the throw reaches the scheduler", () => {
		const thrower = [{ run: () => unused() }];
		const opening = world({ bad: { activationOpened: thrower } });
		expect(() => opening.create().open(A, [], {})).toThrow(/not used/);
		expect(opening.state.failures).toBeGreaterThan(0);
		const closing = world({ bad: { activationClosed: thrower } });
		const open = closing.create().open(A, [], {});
		expect(() => { open.close(false); }).toThrow(/not used/);
		expect(closing.state.failures).toBe(1);
		// The closing line is not written after a hook failed, and a second `close` does nothing.
		open.close(false);
		expect(closing.log.ofType("kernel", "activation_closed")).toEqual([]);
	});

	it("collects the lines of every `inputs` hook in hook order and asks every plugin for news", () => {
		const { state, create } = world({
			first: { inputs: [{ run: (actor) => [`for ${actor}`, { kind: "state", text: "s", order: 2 }] }], news: () => false },
			second: { inputs: [{ run: () => [{ kind: "state", text: "t" }] }], news: (actor) => actor === A },
			third: { news: () => unused() },
		});
		const port = create();
		expect(port.inputsFor(A)).toEqual([
			{ source: "first", text: `for ${A}` },
			{ source: "first", kind: "state", text: "s", order: 2 },
			{ source: "second", kind: "state", text: "t" },
		]);
		expect(port.hasNews(A)).toBe(true);
		expect(state.failures).toBe(0);
		// A throw of plugin code ends the run before it reaches the scheduler.
		expect(() => port.hasNews("resident:b")).toThrow(/SWT-R003: third: not used/);
		expect(state.failures).toBe(1);
		expect(port.toAct()).toBeUndefined();
	});

	it("reads `toAct` from the one plugin that has it (the loader refuses a second one)", () => {
		expect(world({ first: {}, second: { toAct: () => [A] } }).create().toAct()).toEqual([A]);
	});

	it("passes seed, tick, halt, the random streams and the tick halves through, and writes only declared events", async () => {
		const { state, create } = world();
		const port = create();
		expect([port.seed, port.tick, port.halted, port.actors.ids]).toEqual([11, 4, false, [A]]);
		state.halted = true;
		expect(port.halted).toBe(true);
		expect(port.rng("turns", 0).shuffle(["A01", "A02", "A03", "A04", "A05", "A06"])).toEqual(rngFor(11, "turns", 0).shuffle(["A01", "A02", "A03", "A04", "A05", "A06"]));
		await port.beginTick();
		expect(await port.endTick(true)).toEqual({ reason: "ticks", tick: 5 });
		expect(port.emit("noted", {})).toMatchObject({ source: SCHEDULER, type: "noted", actor: "kernel" });
		expect(() => port.emit("other", {})).toThrow(/SWT-R002/);
	});
});
