// SPDX-License-Identifier: Apache-2.0
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { SwtError, type Envelope, type EventSink, type Job, type JsonValue, type KernelDefinition, type PluginInstance, type RunEnd, type RunLimit, type SchedulerDefinition } from "@swarmtales/contracts";
import { createLifecycle } from "../src/lifecycle.ts";
import type { Clock, Frame, Lifecycle, Loaded, Log, OrderedHook, Steps } from "../src/parts.ts";

/** A log without listeners: frames, the events in order, and the closing of `fail`. */
function fakeLog(tick: () => number): Log & { readonly lines: () => readonly string[] } {
	const events: Envelope[] = [];
	const frames: Frame[] = [];
	let closed = false;
	const log: Log & { readonly lines: () => readonly string[] } = {
		get length() {
			return events.length;
		},
		all: () => events,
		since: (seq) => events.filter((event) => event.seq > seq),
		ofType: (source, type) => events.filter((event) => event.source === source && event.type === type),
		emit(source, type, payload) {
			if (closed) throw new RangeError("the log is closed");
			const frame = log.frame();
			const event: Envelope = { seq: events.length + 1, tick: tick(), source, type, actor: frame.actor, ...(frame.causedBy === undefined ? {} : { causedBy: frame.causedBy }), payload };
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
		listen: () => undefined,
		addSink: () => undefined,
		fail(last) {
			last();
			closed = true;
		},
		lines: () => events.map((event) => `${String(event.tick)} ${event.source}/${event.type}${event.causedBy === undefined ? "" : ` <${String(event.causedBy)}`}`),
	};
	return log;
}

function fakeClock(due: readonly Job[]): Clock {
	let tick = 0;
	let jobs = [...due];
	return {
		get tick() {
			return tick;
		},
		advance() {
			tick += 1;
		},
		at: () => undefined,
		take(at) {
			const taken = jobs.filter((job) => job.next === at);
			jobs = jobs.filter((job) => job.next !== at);
			return taken;
		},
		state: () => jobs,
		restore: () => undefined,
	};
}

interface World {
	readonly life: Lifecycle;
	readonly log: ReturnType<typeof fakeLog>;
	readonly clock: Clock;
	readonly closedWith: RunEnd[];
	readonly resets: () => number;
}

interface Setup {
	readonly maxTicks?: number;
	readonly jobs?: readonly Job[];
	/** Hook name to the plugins' hook code, in the final order; each is given the log to emit into. */
	readonly hooks?: Partial<Record<OrderedHook, readonly ((log: Log, ...args: readonly unknown[]) => void)[]>>;
	readonly job?: (log: Log, data: JsonValue | undefined) => void;
	readonly limits?: readonly RunLimit[];
	readonly sinks?: readonly EventSink[];
}

function world(setup: Setup = {}): World {
	const clock = fakeClock(setup.jobs ?? []);
	const log = fakeLog(() => clock.tick);
	let resets = 0;
	const steps: Steps = { step: () => true, tickStarted: () => void (resets += 1) };
	const instance: PluginInstance = { tools: [], services: [], listeners: [], hooks: {}, stages: {}, jobs: { wake: (data) => setup.job?.(log, data) }, limits: [], facts: {}, slice: undefined };
	const loaded: Loaded = {
		order: ["grid", "tally"],
		instances: new Map([["grid", instance]]),
		tools: new Map(),
		byShownName: new Map(),
		hooks: (hook) => (hook === "inputs" ? [] : (setup.hooks?.[hook] ?? []).map((run, at) => ({ plugin: at === 0 ? "grid" : "tally", run: (...args: readonly unknown[]) => { run(log, ...args); } }))),
		stages: () => [],
		limits: (setup.limits ?? []).map((limit) => ({ id: `tally.${limit.id}`, limit })),
	};
	const scheduler: SchedulerDefinition = { id: "s", revision: 1, determinism: "seeded", options: Type.Null({ description: "No options" }), events: {}, create: () => ({ run: () => Promise.resolve(undefined) }) };
	const definition: KernelDefinition = { game: { id: "grid-game", hash: "h" }, seed: 11, actors: [{ id: "worker:A01", kind: "worker", grant: "worker", shared: {} }, { id: "worker:A02", kind: "worker", grant: "worker", shared: {} }], plugins: [], scheduler: { definition: scheduler, options: null }, grants: {}, names: {}, startLocks: {}, replies: {}, limits: { maxTicks: setup.maxTicks ?? 9 } };
	const closedWith: RunEnd[] = [];
	const sinks = setup.sinks ?? [{ write: () => undefined, close: (end: RunEnd) => void closedWith.push(end) }];
	return { life: createLifecycle({ definition, log, clock, steps, loaded, sinks }), log, clock, closedWith, resets: () => resets };
}

const says = (type: string) => (log: Log) => void log.emit("p/grid", type, {});

/** A limit that answers each given reason once, then nothing; it counts how often it was asked. */
function limit(...answers: (string | undefined)[]): RunLimit & { asked: number } {
	const self = { id: "budget", summary: "a budget", asked: 0, check: () => answers[self.asked++] };
	return self;
}

describe("createLifecycle", () => {
	it("start writes run_started, then runs the runStarted hooks in their order", () => {
		const { life, log } = world({ hooks: { runStarted: [says("first"), says("second")] } });
		life.start();
		expect(log.lines()).toEqual(["0 kernel/run_started", "0 p/grid/first", "0 p/grid/second"]);
		expect(log.all()[0]?.payload).toEqual({ game: "grid-game", seed: 11, maxTicks: 9, actors: ["worker:A01", "worker:A02"], plugins: ["grid", "tally"] });
	});

	it("plays one tick with a job and two hooks in the order of 3.5", async () => {
		const seen: (JsonValue | undefined)[] = [];
		const job = (log: Log, data: JsonValue | undefined): void => {
			seen.push(data);
			log.emit("p/grid", "woke", {});
		};
		const { life, log, clock, resets } = world({ jobs: [{ id: 0, owner: "grid", job: "wake", next: 0, data: { n: 1 } }, { id: 1, owner: "grid", job: "wake", next: 1 }], job, hooks: { tickStarted: [says("a"), says("b")], tickEnded: [says("z")] } });
		await life.beginTick();
		expect(resets()).toBe(1);
		expect(log.lines()).toEqual(["0 kernel/tick_started", "0 kernel/job_ran", "0 p/grid/woke <2", "0 p/grid/a", "0 p/grid/b"]);
		expect(log.all()[1]?.payload).toEqual({ owner: "grid", job: "wake" });
		expect(seen).toEqual([{ n: 1 }]);
		expect(await life.endTick(false)).toBeUndefined();
		expect(log.lines().slice(5)).toEqual(["0 p/grid/z", "0 kernel/tick_ended"]);
		expect(clock.tick).toBe(1);
		await life.beginTick();
		expect(log.lines().slice(7, 9)).toEqual(["1 kernel/tick_started", "1 kernel/job_ran"]);
	});

	it("keeps a breach seen in the tick, also when the limit no longer answers it", async () => {
		const budget = limit(undefined, "spent 5 of 4", undefined);
		const { life, log, clock, closedWith } = world({ limits: [budget] });
		await life.beginTick();
		expect(life.halted).toBe(false);
		expect(life.halted).toBe(true);
		expect(life.halted).toBe(true);
		expect(budget.asked).toBe(2);
		const end = await life.endTick(false);
		expect(budget.asked).toBe(2);
		expect(end).toEqual({ reason: "limit", tick: 1, limit: "tally.budget" });
		expect(log.lines()).toEqual(["0 kernel/tick_started", "0 kernel/tick_ended", "1 kernel/limit_reached", "1 kernel/run_ended"]);
		expect(log.all().slice(2).map((event) => event.payload)).toEqual([{ limit: "tally.budget", reason: "spent 5 of 4" }, { reason: "limit" }]);
		expect(clock.tick).toBe(1);
		expect(closedWith).toEqual([end]);
	});

	it("forgets the breach of the last tick after the tickStarted hooks, and checks before and after tick_ended", async () => {
		const budget = limit("early", undefined, undefined, "late");
		const { life, log } = world({ limits: [budget] });
		expect(life.halted).toBe(true);
		await life.beginTick();
		expect(life.halted).toBe(false);
		expect(budget.asked).toBe(2);
		expect((await life.endTick(false))?.reason).toBe("limit");
		expect(budget.asked).toBe(4);
		expect(log.all().at(-2)?.payload).toEqual({ limit: "tally.budget", reason: "late" });
	});

	it("does not advance the clock for an idle tick with a breach, and does for an idle tick without one", async () => {
		const still = world({ limits: [limit("over")] });
		await still.life.beginTick();
		expect(await still.life.endTick(true)).toEqual({ reason: "limit", tick: 0, limit: "tally.budget" });
		expect(still.clock.tick).toBe(0);
		expect(still.log.lines().at(-1)).toBe("0 kernel/run_ended");
		const moving = world();
		await moving.life.beginTick();
		expect(await moving.life.endTick(true)).toBeUndefined();
		expect(moving.clock.tick).toBe(1);
	});

	it("ends with `ticks` when the clock reaches maxTicks", async () => {
		const { life, log, closedWith } = world({ maxTicks: 2 });
		await life.beginTick();
		expect(await life.endTick(false)).toBeUndefined();
		expect(closedWith).toEqual([]);
		await life.beginTick();
		expect(await life.endTick(false)).toEqual({ reason: "ticks", tick: 2 });
		expect(log.all().at(-1)).toMatchObject({ tick: 2, type: "run_ended", payload: { reason: "ticks" } });
		expect(closedWith).toEqual([{ reason: "ticks", tick: 2 }]);
	});

	it("fails once: run_ended with the reason error is the last event, the sinks close, every later step is SWT-R001", async () => {
		const boom = new TypeError("cell is taken");
		const { life, log, closedWith } = world({ hooks: { tickStarted: [() => { throw boom; }] } });
		await expect(life.beginTick()).rejects.toBe(boom);
		expect(log.lines()).toEqual(["0 kernel/tick_started", "0 kernel/run_ended"]);
		expect(log.all().at(-1)?.payload).toEqual({ reason: "error", detail: "cell is taken" });
		expect(closedWith).toEqual([{ reason: "error", tick: 0 }]);
		life.fail(new Error("second"));
		expect(log.length).toBe(2);
		expect(closedWith).toHaveLength(1);
		expect(life.halted).toBe(true);
		const refused: unknown = await life.endTick(false).catch((error: unknown) => error);
		expect(refused instanceof SwtError && refused.issues[0]?.code).toBe("SWT-R001");
		expect(refused instanceof SwtError && refused.cause).toBe(boom);
		expect(() => { life.start(); }).toThrow("SWT-R001");
	});

	it("a limit that throws is SWT-R003 of its plugin and fails the run", () => {
		const { life, log } = world({ limits: [{ id: "budget", summary: "a budget", check: () => { throw new Error("no ledger"); } }] });
		expect(() => life.halted).toThrow("tally: no ledger");
		expect(log.all().at(-1)?.payload).toEqual({ reason: "error", detail: "SWT-R003: tally: no ledger" });
		expect(life.halted).toBe(true);
	});

	it("a sink that throws at close is SWT-R020; every sink is closed and run_ended is written once", async () => {
		const closed: string[] = [];
		const sinks: EventSink[] = [{ write: () => undefined, close: () => { throw new Error("disk full"); } }, { write: () => undefined, close: (end) => void closed.push(end.reason) }, { write: () => undefined }];
		const { life, log } = world({ maxTicks: 1, sinks });
		await life.beginTick();
		await expect(life.endTick(false)).rejects.toThrow("SWT-R020");
		expect(closed).toEqual(["ticks"]);
		expect(log.ofType("kernel", "run_ended")).toHaveLength(1);
		expect(life.halted).toBe(true);
	});

	it("runs the runEnded hooks once in their order with the end, after limit_reached and before run_ended", async () => {
		const ends: unknown[] = [];
		const ended = (type: string) => (log: Log, end: unknown) => {
			ends.push(end);
			log.emit("p/grid", type, {});
		};
		const { life, log, closedWith } = world({ maxTicks: 3, limits: [limit(undefined, undefined, "over")], hooks: { runEnded: [ended("first"), ended("second")] } });
		await life.beginTick();
		expect(await life.endTick(false)).toBeUndefined();
		expect(ends).toEqual([]);
		await life.beginTick();
		const end = await life.endTick(false);
		expect(log.lines().slice(-5)).toEqual(["1 kernel/tick_ended", "2 kernel/limit_reached", "2 p/grid/first", "2 p/grid/second", "2 kernel/run_ended"]);
		expect(ends).toEqual([end, end]);
		expect(closedWith).toEqual([{ reason: "limit", tick: 2, limit: "tally.budget" }]);
		const ticks = world({ maxTicks: 1, hooks: { runEnded: [ended("last")] } });
		await ticks.life.beginTick();
		await ticks.life.endTick(false);
		expect(ticks.log.lines().slice(-2)).toEqual(["1 p/grid/last", "1 kernel/run_ended"]);
		expect(ends.at(-1)).toEqual({ reason: "ticks", tick: 1 });
	});

	it("calls no runEnded hook in a run that fails, and a runEnded hook that throws ends the run with reason error", async () => {
		const failed = world({ hooks: { tickStarted: [() => { throw new Error("broken"); }], runEnded: [says("late")] } });
		await expect(failed.life.beginTick()).rejects.toThrow("broken");
		expect(failed.log.lines()).toEqual(["0 kernel/tick_started", "0 kernel/run_ended"]);
		const { life, log, closedWith } = world({ maxTicks: 1, hooks: { runEnded: [says("settled"), () => { throw new Error("no owner"); }] } });
		await life.beginTick();
		await expect(life.endTick(false)).rejects.toThrow("no owner");
		expect(log.lines().slice(-2)).toEqual(["1 p/grid/settled", "1 kernel/run_ended"]);
		expect(log.all().at(-1)?.payload).toEqual({ reason: "error", detail: "no owner" });
		expect(closedWith).toEqual([{ reason: "error", tick: 1 }]);
	});

	it("a due job that no loaded plugin has is SWT-R002", async () => {
		const { life } = world({ jobs: [{ id: 0, owner: "gone", job: "wake", next: 0 }] });
		await expect(life.beginTick()).rejects.toThrow("SWT-R002");
	});
});
