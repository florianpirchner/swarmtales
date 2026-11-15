// SPDX-License-Identifier: Apache-2.0
/**
 * The real parts wired by hand, as the assembly will wire them, with two small plugins and a scheduler written
 * here. Every part was built against fakes of its neighbours; this file holds what they do together.
 */
import { Type } from "typebox";
import { Check } from "typebox/value";
import { describe, expect, it } from "vitest";
import { EnvelopeSchema, envelopeLogIssues, KERNEL_EVENTS, KernelSnapshotSchema, SwtError } from "@swarmtales/contracts";
import type { ActorDriver, ActorId, Envelope, EventSink, KernelDefinition, KernelSnapshot, PluginInstance, ResolvedPlugin, RunEnd, SchedulerDefinition, SchedulerPort, SnapshotSlice, ToolOutcome } from "@swarmtales/contracts";
import { createAccess } from "../src/access.ts";
import { createActors } from "../src/actors.ts";
import { createClock } from "../src/clock.ts";
import { createDispatch } from "../src/dispatch.ts";
import { createLifecycle } from "../src/lifecycle.ts";
import { loadPlugins } from "../src/loader.ts";
import { createLog } from "../src/log.ts";
import type { Dispatch, Lifecycle, Loaded, Log, SliceParts } from "../src/parts.ts";
import { createSchedulerPort } from "../src/ports.ts";
import { createServices } from "../src/services.ts";
import { restoreKernel, saveKernel } from "../src/slices.ts";
import { createSteps } from "../src/steps.ts";

const A: ActorId = "worker:A";
const B: ActorId = "worker:B";
const PUT = "@t/alpha/alpha/put";
const PEEK = "@t/alpha/alpha/peek";

const PutDone = Type.Object({ by: Type.String(), n: Type.Number() });
const Empty = Type.Object({});
const Echoed = Type.Object({ of: Type.Number(), sum: Type.Number() });
const Seen = Type.Object({ ok: Type.Boolean() });
const PutParams = Type.Object({ n: Type.Number() });
const Count = Type.Object({ count: Type.Number() });
const TALLY = { name: "tally", summary: "counts", methods: { add: { kind: "command", input: Type.Number(), output: Type.Number(), summary: "adds" }, read: { kind: "query", input: Type.Null(), output: Type.Number(), summary: "reads" } } } as const;

/** What a test may make a plugin do wrong. */
interface Faults {
	/** `put` throws in `execute` for this number. */
	readonly throwAt?: number;
	/** The `inputs` hook of alpha throws for this actor. */
	readonly badInputs?: ActorId;
}

function sliceOf(read: () => number, write: (count: number) => void): SnapshotSlice {
	return {
		version: 1,
		save: () => ({ count: read() }),
		load(data) {
			if (!Check(Count, data)) throw new TypeError("no count");
			write(data.count);
		},
	};
}

// Alpha owns a number: the tool `put` adds to it and ends the activation, `peek` is a free look, the service
// `tally` lets others add, a job fires at tick 1, and the run ends once the number reaches 20.
function alpha(faults: Faults): ResolvedPlugin {
	return {
		id: "alpha",
		package: "@t/alpha",
		version: "1.0.0",
		requires: [],
		provides: ["tally"],
		events: { put_done: PutDone, woken: Empty },
		audiences: { woken: ["worker"] },
		options: null,
		create(port): PluginInstance {
			let count = 0;
			return {
				tools: [
					{
						name: "put",
						description: "adds",
						parameters: PutParams,
						free: false,
						prepare: (raw, actor) => {
							if (!Check(PutParams, raw)) return undefined;
							return {
								params: raw,
								rule: () => (raw.n > 0 ? undefined : { ok: false, code: "NOT_POSITIVE" }),
								execute: (): ToolOutcome => {
									if (raw.n === faults.throwAt) throw new TypeError("alpha broke");
									if (raw.n > 9) return { ok: false, code: "TOO_BIG", detail: "at most 9" };
									count += raw.n;
									port.emit("put_done", { by: actor, n: raw.n });
									return { ok: true, reply: `put ${String(raw.n)}`, endsTurn: true };
								},
							};
						},
					},
					{ name: "peek", description: "reads", parameters: Empty, free: true, prepare: () => ({ params: {}, rule: () => undefined, execute: () => ({ ok: true, reply: `count ${String(count)}` }) }) },
				],
				services: [{ service: TALLY, call: (method, input) => (method === "add" && typeof input === "number" ? (count += input) : count) }],
				listeners: [],
				hooks: {
					runStarted: [{ run: () => { port.schedule.at(1, "wake", { x: 1 }); } }],
					inputs: [
						{
							run: (actor) => {
								if (actor === faults.badInputs) throw new TypeError("no lines");
								return [`count ${String(count)}`, { kind: "state", text: "a line with a sort key", order: 2 }];
							},
						},
					],
					news: () => true,
				},
				stages: {},
				jobs: { wake: () => { port.emit("woken", {}); } },
				limits: [{ id: "full", summary: "the number reached 20", check: () => (count >= 20 ? `count ${String(count)}` : undefined) }],
				facts: {},
				slice: sliceOf(() => count, (value) => (count = value)),
			};
		},
	};
}

// Beta reacts: it echoes every `put_done` through a command of alpha, suspends who put 3 (until the next tick),
// locks `put` for B when somebody put 4 (until the end of that tick), and sees every outcome.
function beta(): ResolvedPlugin {
	return {
		id: "beta",
		package: "@t/beta",
		version: "1.0.0",
		requires: ["tally"],
		provides: [],
		events: { echoed: Echoed, after_seen: Seen },
		audiences: {},
		options: null,
		create(port): PluginInstance {
			let echoes = 0;
			return {
				tools: [],
				services: [],
				listeners: [
					{
						source: "alpha",
						type: "put_done",
						schema: PutDone,
						run: (event) => {
							if (!Check(PutDone, event.payload)) throw new TypeError("no put");
							echoes += 1;
							const sum = port.call("tally", "add", 1);
							port.emit("echoed", { of: event.seq, sum: typeof sum === "number" ? sum : -1 });
							if (event.payload.n === 3) port.actors.suspend(event.actor, "three");
							if (event.payload.n === 4) port.access.lock(B, PUT);
						},
					},
				],
				hooks: {
					tickStarted: [{ run: () => { port.actors.ids.forEach((id) => { port.actors.resume(id); }); } }],
					tickEnded: [{ run: () => { port.access.unlock(B, PUT); } }],
				},
				stages: { after: (_call, outcome) => { port.emit("after_seen", { ok: outcome.ok }); } },
				jobs: {},
				limits: [],
				facts: {},
				slice: sliceOf(() => echoes, (value) => (echoes = value)),
			};
		},
	};
}

// One activation: the driver plays, then the activation closes. The first failure is the one to report: closing
// an activation of a failed run throws as well.
async function activate(port: SchedulerPort, actor: ActorId, driver: ActorDriver): Promise<void> {
	const open = port.open(actor, port.inputsFor(actor), { lap: port.tick });
	const failed = await Promise.resolve(driver(open)).then(
		() => undefined,
		(error: unknown) => ({ error }),
	);
	try {
		open.close(failed !== undefined);
	} catch (error) {
		throw failed === undefined ? error : failed.error;
	}
	if (failed !== undefined) throw failed.error;
}

// One activation per actor and tick, in the order of the definition.
const scheduler: SchedulerDefinition = {
	id: "@t/laps",
	revision: 1,
	determinism: "seeded",
	options: Empty,
	events: { lap_started: Empty },
	create: () => ({
		async run(port: SchedulerPort, drivers, until): Promise<RunEnd | undefined> {
			for (let ticks = 0; until === undefined || ticks < until.ticks; ticks++) {
				await port.beginTick();
				let played = 0;
				port.emit("lap_started", {});
				for (const actor of port.actors.ids) {
					if (port.halted) break;
					const driver = drivers[actor];
					if (driver === undefined || !port.actors.mayAct(actor) || !port.hasNews(actor)) continue;
					played += 1;
					await activate(port, actor, driver);
				}
				const end = await port.endTick(played === 0);
				if (end !== undefined) return end;
			}
			return undefined;
		},
	}),
};

function definitionOf(faults: Faults = {}): KernelDefinition {
	return {
		game: { id: "parts", hash: "0".repeat(64) },
		seed: 7,
		actors: [A, B].map((id) => ({ id, kind: "worker", grant: "worker", shared: {} })),
		plugins: [alpha(faults), beta()],
		scheduler: { definition: scheduler, options: {} },
		grants: { worker: [PUT, PEEK] },
		names: { [PUT]: "put", [PEEK]: "peek" },
		startLocks: {},
		replies: { TOOL_LOCKED: "locked now", STEP_LIMIT: "too many calls" },
		limits: { maxTicks: 5, maxCallsPerTick: 4 },
	};
}

interface World {
	readonly log: Log;
	readonly life: Lifecycle;
	readonly dispatch: Dispatch;
	readonly loaded: Loaded;
	readonly written: Envelope[];
	readonly closed: RunEnd[];
	run(drivers: Readonly<Record<string, ActorDriver>>, ticks?: number): Promise<RunEnd | undefined>;
	snapshot(): KernelSnapshot;
}

// What the assembly does, in its order: the log and the sinks, the parts, the plugins, dispatch, the scheduler.
function wire(definition: KernelDefinition, resume?: { readonly snapshot: KernelSnapshot; readonly log: readonly Envelope[] }, sink?: EventSink): World {
	const written: Envelope[] = [];
	const closed: RunEnd[] = [];
	const sinks: EventSink[] = [{ write: (event) => void written.push(event), close: (end) => void closed.push(end) }, ...(sink === undefined ? [] : [sink])];
	const clock = createClock();
	const audiences = new Map(definition.plugins.map((plugin) => [`${plugin.package}/${plugin.id}`, plugin.audiences]));
	const log = createLog(() => clock.tick, (source, type) => audiences.get(source)?.[type], resume?.log);
	for (const each of sinks) log.addSink(each);
	const actors = createActors(definition.actors, log);
	const access = createAccess(definition, actors, log);
	const loaded = loadPlugins(definition, { log, actors, access, services: createServices(log), clock, staged: [] });
	const steps = createSteps(definition.limits.maxCallsPerTick, actors.ids);
	const life = createLifecycle({ definition, log, clock, steps, loaded, sinks, settle: () => undefined });
	const dispatch = createDispatch({ definition, log, actors, access, steps, loaded, fail: (error) => { life.fail(error); }, staged: [] });
	const instance = definition.scheduler.definition.create(definition.scheduler.options);
	const toolSpecs = (grant: string) => access.grantsOf(grant).flatMap((tool) => (loaded.tools.get(tool) === undefined ? [] : [{ name: definition.names[tool] ?? tool, description: "", parameters: Empty }]));
	const port = createSchedulerPort({ definition, log, actors, clock, loaded, dispatch, toolSpecs }, life);
	const slices: SliceParts = { definition, log, actors, access, clock, loaded, scheduler: instance.slice };
	if (resume === undefined) life.start();
	else restoreKernel(slices, resume.snapshot);
	return { log, life, dispatch, loaded, written, closed, run: (drivers, ticks) => instance.run(port, drivers, ticks === undefined ? undefined : { ticks }), snapshot: () => saveKernel(slices, clock.tick, undefined) };
}

type Step = readonly [as: string, params?: unknown];

// A driver that makes the calls its script lists for the tick, one after the other.
function scripted(script: Readonly<Record<number, readonly Step[]>>, answers: string[]): ActorDriver {
	return async (activation) => {
		for (const [as, params] of script[activation.tick] ?? []) {
			const outcome = await activation.call(as, params);
			answers.push(`${activation.actor} ${as} ${outcome.ok ? outcome.reply : `${outcome.code}${outcome.detail === undefined ? "" : ` (${outcome.detail})`}`}`);
		}
	};
}

function players(answers: string[] = []): Readonly<Record<string, ActorDriver>> {
	return {
		[A]: scripted({ 0: [["put", { n: 1 }]], 1: [["put", { n: 10 }], ["put", { n: 4 }]], 2: [["put", { n: 5 }]], 3: [["put", { n: 9 }]] }, answers),
		[B]: scripted({ 0: [["peek"], ["put", { n: 0 }], ["put", {}], ["nope"], ["put", { n: 3 }], ["put", { n: 1 }]], 1: [["put", { n: 1 }]], 2: [["put", { n: 2 }]] }, answers),
	};
}

// One event as a line: seq, tick, source/type, actor, what caused it, the tool of its call, its basis.
function line(event: Envelope): string {
	const short = event.source.replace("@t/", "");
	const fields = [String(event.seq), `t${String(event.tick)}`, `${short}.${event.type}`, event.actor];
	if (event.causedBy !== undefined) fields.push(`<${String(event.causedBy)}`);
	if (event.tool !== undefined) fields.push(event.tool.replace("@t/alpha/alpha/", "#"));
	if (event.basis !== undefined) fields.push(`^${String(event.basis)}`);
	if (event.audience !== undefined) fields.push(`@${event.audience.join(",")}`);
	return fields.join(" ");
}

const TICK_0 = [
	"1 t0 kernel.run_started kernel",
	"2 t0 kernel.tick_started kernel",
	"3 t0 laps.lap_started kernel",
	"4 t0 kernel.activation_opened worker:A ^3",
	"5 t0 kernel.tool_called worker:A <4 #put ^3",
	"6 t0 alpha/alpha.put_done worker:A <5 #put",
	// The listener of beta runs when `execute` has returned: its command, its own event. Both keep the tool of the call.
	"7 t0 kernel.service_called worker:A <6 #put",
	"8 t0 beta/beta.echoed worker:A <6 #put",
	"9 t0 beta/beta.after_seen worker:A <5 #put",
	"10 t0 kernel.tool_result worker:A <5 #put",
	"11 t0 kernel.activation_closed worker:A <4",
	"12 t0 kernel.activation_opened worker:B ^11",
	"13 t0 kernel.tool_called worker:B <12 #peek ^11",
	"14 t0 beta/beta.after_seen worker:B <13 #peek",
	"15 t0 kernel.tool_result worker:B <13 #peek",
	// A later call has the answer to the call before it as its basis.
	"16 t0 kernel.tool_called worker:B <12 #put ^15",
	"17 t0 kernel.tool_refused worker:B <16 #put",
	"18 t0 kernel.tool_called worker:B <12 #put ^17",
	"19 t0 kernel.tool_refused worker:B <18 #put",
	// A name that stands for no tool: the envelope has no `tool` (erratum E3).
	"20 t0 kernel.tool_called worker:B <12 ^19",
	"21 t0 kernel.tool_refused worker:B <20",
	"22 t0 kernel.tool_called worker:B <12 #put ^21",
	"23 t0 alpha/alpha.put_done worker:B <22 #put",
	"24 t0 kernel.service_called worker:B <23 #put",
	"25 t0 beta/beta.echoed worker:B <23 #put",
	"26 t0 kernel.actor_suspended worker:B <23 #put",
	"27 t0 beta/beta.after_seen worker:B <22 #put",
	"28 t0 kernel.tool_result worker:B <22 #put",
	"29 t0 kernel.tool_called worker:B <12 #put ^28",
	"30 t0 kernel.tool_refused worker:B <29 #put",
	"31 t0 kernel.activation_closed worker:B <12",
	"32 t0 kernel.tick_ended kernel",
];

describe("the kernel parts together", () => {
	it("plays a tick with the frames, the order and the answers of the old kernel", async () => {
		const answers: string[] = [];
		const world = wire(definitionOf());
		expect(await world.run(players(answers), 1)).toBeUndefined();
		expect(world.log.all().map(line)).toEqual(TICK_0);
		expect(answers).toEqual([
			"worker:A put put 1",
			"worker:B peek count 2",
			"worker:B put NOT_POSITIVE",
			"worker:B put INVALID_ARGUMENTS",
			"worker:B nope TOOL_UNKNOWN",
			"worker:B put put 3",
			// The fifth counted call of the tick: the step limit answers before the suspension is looked at.
			"worker:B put STEP_LIMIT (too many calls)",
		]);
		const refusals = world.log.ofType("kernel", "tool_refused").map((event) => event.payload);
		expect(refusals).toEqual([
			{ as: "put", stage: "rule", code: "NOT_POSITIVE" },
			{ as: "put", stage: "parse", code: "INVALID_ARGUMENTS" },
			{ as: "nope", stage: "lock", code: "TOOL_UNKNOWN" },
			{ as: "put", stage: "limit", code: "STEP_LIMIT", detail: "too many calls" },
		]);
		expect(world.dispatch.quietEnd(A)).toBe(true);
		expect(world.dispatch.quietEnd(B)).toBe(false);
	});

	it("plays to the limit: a job, a lifted suspension, a lock, a refused execute, the end", async () => {
		const answers: string[] = [];
		const world = wire(definitionOf());
		expect(await world.run(players(answers))).toEqual({ reason: "limit", tick: 3, limit: "alpha.full" });
		const lines = world.log.all().map(line);
		expect(lines.slice(32, 38)).toEqual([
			"33 t1 kernel.tick_started kernel",
			"34 t1 kernel.job_ran kernel",
			"35 t1 alpha/alpha.woken kernel <34 @worker",
			"36 t1 kernel.actor_resumed kernel",
			"37 t1 laps.lap_started kernel",
			"38 t1 kernel.activation_opened worker:A ^37",
		]);
		expect(answers.slice(7)).toEqual(["worker:A put TOO_BIG (at most 9)", "worker:A put put 4", "worker:B put TOOL_LOCKED (locked now)", "worker:A put put 5", "worker:B put put 2"]);
		// A refused execute: `tool_refused`, then the `after` handlers, and no `tool_result`.
		const refused = world.log.all().findIndex((event) => event.type === "tool_refused" && Check(KERNEL_EVENTS.tool_refused, event.payload) && event.payload.stage === "execute");
		expect(lines.slice(refused, refused + 3).map((text) => text.split(" ")[2])).toEqual(["kernel.tool_refused", "beta/beta.after_seen", "kernel.tool_called"]);
		expect(lines.slice(-5).map((text) => text.split(" ").slice(1, 4).join(" "))).toEqual(["t2 kernel.tool_result worker:B", "t2 kernel.activation_closed worker:B", "t2 kernel.tick_ended kernel", "t3 kernel.limit_reached kernel", "t3 kernel.run_ended kernel"]);
		expect(world.closed).toEqual([{ reason: "limit", tick: 3, limit: "alpha.full" }]);
	});

	it("writes a sound log: every envelope and kernel payload fits its schema, the sinks get it in order", async () => {
		const world = wire(definitionOf());
		await world.run(players());
		const events = world.log.all();
		expect(envelopeLogIssues(events)).toEqual([]);
		expect(world.written).toEqual(events);
		expect(JSON.parse(JSON.stringify(events))).toEqual(events);
		for (const event of events) {
			expect(Check(EnvelopeSchema, event), line(event)).toBe(true);
			const schema = event.source === "kernel" && Object.hasOwn(KERNEL_EVENTS, event.type) ? Object.entries(KERNEL_EVENTS).find(([type]) => type === event.type)?.[1] : undefined;
			if (event.source === "kernel") expect(schema !== undefined && Check(schema, event.payload), line(event)).toBe(true);
		}
		expect(events.at(-1)?.type).toBe("run_ended");
	});

	it("resumes from a snapshot between two ticks and writes what the straight run wrote", async () => {
		const straight = wire(definitionOf());
		const straightEnd = await straight.run(players());
		for (const cut of [1, 2]) {
			const first = wire(definitionOf());
			await first.run(players(), cut);
			const snapshot: unknown = JSON.parse(JSON.stringify(first.snapshot()));
			if (!Check(KernelSnapshotSchema, snapshot)) throw new TypeError("the snapshot does not fit its schema");
			expect(snapshot.jobs.map((job) => job.job)).toEqual(cut === 1 ? ["wake"] : []);
			const second = wire(definitionOf(), { snapshot, log: first.log.all() });
			expect(await second.run(players())).toEqual(straightEnd);
			expect(second.log.all()).toEqual(straight.log.all());
			// The sinks of the resumed kernel get the new events only.
			expect(second.written).toEqual(straight.log.all().slice(first.log.length));
		}
	});
});

describe("the kernel parts together, when something breaks", () => {
	it("a throw in a tool ends the run: `run_ended` is the last event and nothing is taken after it", async () => {
		const world = wire(definitionOf({ throwAt: 5 }));
		const failure = await world.run(players()).catch((error: unknown) => error);
		expect(failure).toBeInstanceOf(SwtError);
		expect(failure instanceof SwtError ? [failure.code, failure.issues[0]?.summary] : []).toEqual(["SWT-R003", "alpha: alpha broke"]);
		const events = world.log.all();
		expect(events.at(-1)).toMatchObject({ type: "run_ended", payload: { reason: "error", detail: "SWT-R003: alpha: alpha broke" } });
		expect(events.filter((event) => event.type === "run_ended")).toHaveLength(1);
		expect(envelopeLogIssues(events)).toEqual([]);
		expect(world.written).toEqual(events);
		expect(world.closed).toEqual([{ reason: "error", tick: 2 }]);
		const length = events.length;
		const later = await world.dispatch.submit({ actor: A, as: "peek", params: {} }).catch((error: unknown) => error);
		expect(later instanceof SwtError ? [later.code, later.cause] : []).toEqual(["SWT-R001", failure]);
		await expect(world.life.beginTick()).rejects.toMatchObject({ code: "SWT-R001", cause: failure });
		expect(world.life.halted).toBe(true);
		expect(world.log.length).toBe(length);
	});

	it("a throw of plugin code that the scheduler's port called ends the run too", async () => {
		const world = wire(definitionOf({ badInputs: B }));
		const failure = await world.run(players()).catch((error: unknown) => error);
		expect(failure instanceof SwtError ? failure.code : failure).toBe("SWT-R003");
		expect(world.log.all().at(-1)).toMatchObject({ type: "run_ended", payload: { reason: "error" } });
		expect(world.life.halted).toBe(true);
		expect(world.closed).toEqual([{ reason: "error", tick: 0 }]);
	});

	it("a sink that throws ends the run with one `run_ended`, also when it throws at the last event", async () => {
		for (const at of ["tool_result", "run_ended"]) {
			const seen: string[] = [];
			const sink: EventSink = {
				write(event) {
					if (event.type === at) throw new TypeError("disk full");
					seen.push(event.type);
				},
			};
			const world = wire(definitionOf(), undefined, sink);
			const failure = await world.run(players()).catch((error: unknown) => error);
			expect(failure instanceof SwtError ? failure.code : failure, at).toBe("SWT-R020");
			expect(world.log.all().filter((event) => event.type === "run_ended"), at).toHaveLength(1);
			expect(world.log.all().at(-1)?.type, at).toBe("run_ended");
			// The sound sink has every event; the broken one got none after its throw.
			expect(world.written, at).toEqual(world.log.all());
			expect(seen, at).not.toContain("run_ended");
			expect(world.closed, at).toHaveLength(1);
		}
	});

	it("takes a name of the object prototype as an unknown name, never as a tool, a job or a method", async () => {
		const world = wire(definitionOf());
		for (const as of ["__proto__", "constructor", "toString", "hasOwnProperty"]) {
			expect(await world.dispatch.submit({ actor: A, as, params: {} })).toEqual({ ok: false, code: "TOOL_UNKNOWN" });
		}
		expect(await world.dispatch.submit({ actor: "kernel", as: "put", params: { n: 1 } })).toEqual({ ok: false, code: "TOOL_NOT_GRANTED" });
		expect(world.life.halted).toBe(false);
		expect(world.log.all().at(-1)?.type).toBe("tool_refused");
	});
});
