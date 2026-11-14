// SPDX-License-Identifier: Apache-2.0
/**
 * A kernel in miniature, written by hand against the kernel-facing contracts only (M1 specification 2.1 to 2.8).
 * It is the usability proof of the frozen interfaces: the dispatch pipeline (3.3), the tick sequence (3.5) and the
 * scheduler port (2.7) are built here without a cast and without a field the contracts do not have. It is no
 * reference for behaviour (the real kernel is `@swarmtales/kernel`); it leaves out locks, suspensions and snapshots.
 */
import { SwtError } from "../src/error.ts";
import {
	type ActorId,
	type ActorsPort,
	type CanonicalTool,
	type Envelope,
	type EventSink,
	type InputNote,
	INVALID_ARGUMENTS,
	type Job,
	type KernelDefinition,
	type KernelTool,
	type OpenActivation,
	type OrderedNote,
	type PluginInstance,
	type PluginPort,
	type Refusal,
	type ResolvedPlugin,
	type SchedulerPort,
	STEP_LIMIT,
	type Submission,
	TOOL_NOT_GRANTED,
	TOOL_UNKNOWN,
	type ToolCall,
	type ToolOutcome,
	type ToolSpec,
} from "../src/kernel/index.ts";
import type { JsonValue, RandomSource, RunEnd } from "../src/values.ts";

/** What an event takes from the code that is running: the frame of 3.1. */
interface Frame {
	readonly actor: ActorId;
	readonly causedBy?: number;
	readonly tool?: CanonicalTool;
}

/** A random source that always takes the first: enough for a test, and it fits `RandomSource`. */
export const first: RandomSource = {
	next: () => 0,
	int: (min) => min,
	pick: (items) => {
		const item = items[0];
		if (item === undefined) throw new SwtError({ code: "SWT-R003", summary: "pick from an empty list", why: "A pick needs one item.", fix: "Pass a list with an item." });
		return item;
	},
	shuffle: (items) => [...items],
};

/** The log with frames and outermost-frame delivery (3.2). */
function createLog(tick: () => number, sinks: readonly EventSink[]) {
	const events: Envelope[] = [];
	const frames: Frame[] = [];
	const queue: Envelope[] = [];
	const listeners = new Map<string, ((event: Envelope) => void)[]>();
	let delivering = false;
	const run = <T>(frame: Frame, code: () => T): T => {
		frames.push(frame);
		try {
			return code();
		} finally {
			frames.pop();
			deliver();
		}
	};
	function deliver(): void {
		if (frames.length > 0 || delivering) return;
		delivering = true;
		for (let event = queue.shift(); event !== undefined; event = queue.shift()) {
			const delivered = event;
			for (const listener of listeners.get(`${delivered.source} ${delivered.type}`) ?? []) run({ actor: delivered.actor, causedBy: delivered.seq }, () => {
				listener(delivered);
			});
			for (const sink of sinks) sink.write(delivered);
		}
		delivering = false;
	}
	const emit = (source: string, type: string, payload: unknown, extra: { readonly basis?: number; readonly audience?: readonly string[] } = {}): Envelope => {
		const frame = frames.at(-1) ?? { actor: "kernel" };
		const event: Envelope = {
			seq: events.length + 1,
			tick: tick(),
			source,
			type,
			actor: frame.actor,
			...(frame.causedBy === undefined ? {} : { causedBy: frame.causedBy }),
			...(extra.basis === undefined ? {} : { basis: extra.basis }),
			...(frame.tool === undefined ? {} : { tool: frame.tool }),
			...(extra.audience === undefined ? {} : { audience: extra.audience }),
			payload,
		};
		events.push(event);
		queue.push(event);
		deliver();
		return event;
	};
	const listen = (source: string, type: string, listener: (event: Envelope) => void): void => {
		listeners.set(`${source} ${type}`, [...(listeners.get(`${source} ${type}`) ?? []), listener]);
	};
	return { events, run, emit, listen };
}

type Log = ReturnType<typeof createLog>;

/** A tool as loaded: its canonical name, its owner and the erased tool. */
interface LoadedTool {
	readonly canonical: CanonicalTool;
	readonly owner: string;
	readonly tool: KernelTool;
}

/** Everything the parts of the miniature share. */
interface Parts {
	readonly definition: KernelDefinition;
	readonly log: Log;
	readonly instances: Map<string, PluginInstance>;
	readonly tools: Map<CanonicalTool, LoadedTool>;
	readonly jobs: Job[];
	readonly calls: Map<ActorId, number>;
	readonly last: Map<ActorId, { looked: boolean; ended: boolean }>;
	tick: number;
	ended: RunEnd | undefined;
}

const sourceOf = (plugin: ResolvedPlugin): string => `${plugin.package}/${plugin.id}`;

function actorsPort(parts: Parts): ActorsPort {
	const { actors } = parts.definition;
	return {
		ids: actors.map((actor) => actor.id),
		ofKind: (kind) => actors.filter((actor) => actor.kind === kind).map((actor) => actor.id),
		has: (id) => actors.some((actor) => actor.id === id),
		mayAct: () => true,
		shared: (id, key) => actors.find((actor) => actor.id === id)?.shared[key],
		suspend: () => undefined,
		resume: () => undefined,
	};
}

function portFor(plugin: ResolvedPlugin, parts: Parts): PluginPort {
	return {
		id: plugin.id,
		source: sourceOf(plugin),
		seed: parts.definition.seed,
		maxTicks: parts.definition.limits.maxTicks,
		tick: () => parts.tick,
		emit: (type, payload) => {
			const audience = plugin.audiences[type];
			parts.log.emit(sourceOf(plugin), type, payload, audience === undefined ? {} : { audience });
		},
		call: () => undefined,
		has: () => false,
		rng: () => first,
		actors: actorsPort(parts),
		schedule: {
			at: (tick, job, data) => {
				parts.jobs.push({ id: parts.jobs.length + 1, owner: plugin.id, job, next: tick, ...(data === undefined ? {} : { data }) });
			},
		},
		access: { lock: () => undefined, unlock: () => undefined, isLocked: () => false, isOpen: () => true, open: () => [] },
	};
}

/** Loads the plugins in the definition's order and registers tools and listeners (3.2). */
function load(parts: Parts): void {
	const { definition, log } = parts;
	const byId = new Map(definition.plugins.map((plugin) => [plugin.id, plugin]));
	for (const plugin of definition.plugins) {
		const instance = plugin.create(portFor(plugin, parts));
		parts.instances.set(plugin.id, instance);
		for (const tool of instance.tools) parts.tools.set(`${sourceOf(plugin)}/${tool.name}`, { canonical: `${sourceOf(plugin)}/${tool.name}`, owner: plugin.id, tool });
	}
	for (const instance of parts.instances.values()) {
		for (const listener of instance.listeners) {
			const declaring = byId.get(listener.source);
			if (declaring?.events[listener.type] !== listener.schema) continue;
			log.listen(sourceOf(declaring), listener.type, listener.run);
		}
	}
}

/** The tool a shown name stands for under the actor's grant, and whether any grant has the name. */
function resolve(parts: Parts, actor: ActorId, as: string): { readonly known: boolean; readonly loaded: LoadedTool | undefined } {
	const { definition } = parts;
	const known = Object.entries(definition.names).some(([, shown]) => shown === as);
	const grant = definition.actors.find((spec) => spec.id === actor)?.grant;
	const canonical = grant === undefined ? undefined : definition.grants[grant]?.find((tool) => definition.names[tool] === as);
	return { known, loaded: canonical === undefined ? undefined : parts.tools.get(canonical) };
}

/** A stage that refused, or the outcome of `execute`. */
interface Staged {
	readonly stage: string;
	readonly outcome: ToolOutcome;
}

/** Rows 1 and 2 of 3.3 up to the kernel's own refusals: the step counter, then unknown and not granted (no locks here). */
function gate(parts: Parts, call: Submission, known: boolean, loaded: LoadedTool | undefined): Staged | undefined {
	const { definition } = parts;
	const kernelRefusal = (stage: string, code: string): Staged => {
		const detail = definition.replies[code];
		return { stage, outcome: detail === undefined ? { ok: false, code } : { ok: false, code, detail } };
	};
	if (loaded?.tool.free !== true && definition.actors.some((spec) => spec.id === call.actor)) {
		const used = (parts.calls.get(call.actor) ?? 0) + 1;
		parts.calls.set(call.actor, used);
		if (used > (definition.limits.maxCallsPerTick ?? Infinity)) return kernelRefusal("limit", STEP_LIMIT);
	}
	if (!known) return kernelRefusal("lock", TOOL_UNKNOWN);
	return loaded === undefined ? kernelRefusal("lock", TOOL_NOT_GRANTED) : undefined;
}

/** The first refusal of a list of checks, each run in its own outermost frame. */
function firstRefusal(log: Log, frame: Frame, checks: readonly (() => Refusal | undefined)[]): Refusal | undefined {
	for (const check of checks) {
		const refusal = log.run(frame, check);
		if (refusal !== undefined) return refusal;
	}
	return undefined;
}

/** The lock handlers and rows 3 to 6 of 3.3 for a tool the caller holds. */
function stages(parts: Parts, call: Submission, seq: number, loaded: LoadedTool): Staged {
	const { log } = parts;
	const instances = [...parts.instances.values()];
	const frame: Frame = { actor: call.actor, causedBy: seq, tool: loaded.canonical };
	const view = (params: unknown): ToolCall => ({ tool: loaded.canonical, name: loaded.tool.name, as: call.as, owner: loaded.owner, actor: call.actor, params, seq });
	const locked = firstRefusal(
		log,
		frame,
		instances.map((instance) => () => instance.stages.lock?.(view(call.params))),
	);
	if (locked !== undefined) return { stage: "lock", outcome: locked };
	const prepared = log.run(frame, () => loaded.tool.prepare(call.params, call.actor));
	if (prepared === undefined) return { stage: "parse", outcome: { ok: false, code: INVALID_ARGUMENTS } };
	const checked = view(prepared.params);
	const ruled = firstRefusal(log, frame, [() => prepared.rule(), ...instances.map((instance) => () => instance.stages.rule?.(checked))]);
	if (ruled !== undefined) return { stage: "rule", outcome: ruled };
	const outcome = log.run(frame, () => prepared.execute());
	for (const instance of instances) log.run(frame, () => instance.stages.after?.(checked, outcome));
	return { stage: "execute", outcome };
}

/** One submission, rows 0 to 7 of 3.3. */
function dispatch(parts: Parts, call: Submission): ToolOutcome {
	const { log } = parts;
	const { known, loaded } = resolve(parts, call.actor, call.as);
	const outer: Frame = { actor: call.actor, ...(call.causedBy === undefined ? {} : { causedBy: call.causedBy }), ...(loaded === undefined ? {} : { tool: loaded.canonical }) };
	const called = log.run(outer, () => log.emit("kernel", "tool_called", { as: call.as, params: call.params }, { basis: call.basis ?? log.events.length }));
	const mark = { looked: loaded?.tool.free === true, ended: false };
	parts.last.set(call.actor, mark);
	const { stage, outcome } = gate(parts, call, known, loaded) ?? (loaded === undefined ? { stage: "lock", outcome: { ok: false, code: TOOL_NOT_GRANTED } } : stages(parts, call, called.seq, loaded));
	const frame: Frame = { ...outer, causedBy: called.seq };
	log.run(frame, () => {
		if (outcome.ok) {
			log.emit("kernel", "tool_result", { as: call.as, reply: outcome.reply, ...(outcome.endsTurn === true ? { endsTurn: true } : {}) });
			mark.ended = outcome.endsTurn === true;
		} else {
			log.emit("kernel", "tool_refused", { as: call.as, stage, code: outcome.code, ...(outcome.detail === undefined ? {} : { detail: outcome.detail }) });
		}
	});
	return outcome;
}

function toolSpecs(parts: Parts, grant: string): readonly ToolSpec[] {
	return (parts.definition.grants[grant] ?? []).flatMap((canonical) => {
		const loaded = parts.tools.get(canonical);
		const name = parts.definition.names[canonical];
		return loaded === undefined || name === undefined ? [] : [{ name, description: loaded.tool.description, parameters: loaded.tool.parameters }];
	});
}

function breach(parts: Parts): string | undefined {
	for (const [id, instance] of parts.instances) {
		for (const limit of instance.limits) if (limit.check() !== undefined) return `${id}.${limit.id}`;
	}
	return undefined;
}

/** The tick sequence of 3.5, without the held breach. */
function ticks(parts: Parts): Pick<SchedulerPort, "beginTick" | "endTick"> {
	const { log, definition } = parts;
	const hooks = (point: "tickStarted" | "tickEnded"): void => {
		for (const instance of parts.instances.values()) for (const hook of instance.hooks[point] ?? []) log.run({ actor: "kernel" }, hook.run);
	};
	return {
		beginTick: () => {
			parts.calls.clear();
			log.emit("kernel", "tick_started", {});
			for (const job of parts.jobs.splice(0).filter((entry) => entry.next <= parts.tick)) {
				const ran = log.emit("kernel", "job_ran", { owner: job.owner, job: job.job });
				log.run({ actor: "kernel", causedBy: ran.seq }, () => parts.instances.get(job.owner)?.jobs[job.job]?.(job.data));
			}
			hooks("tickStarted");
			return Promise.resolve();
		},
		endTick: () => {
			hooks("tickEnded");
			log.emit("kernel", "tick_ended", {});
			const limit = breach(parts);
			parts.tick += 1;
			if (limit !== undefined) parts.ended = { reason: "limit", tick: parts.tick, limit };
			else if (parts.tick >= definition.limits.maxTicks) parts.ended = { reason: "ticks", tick: parts.tick };
			if (parts.ended !== undefined) log.emit("kernel", "run_ended", { reason: parts.ended.reason });
			return Promise.resolve(parts.ended);
		},
	};
}

function open(parts: Parts, actor: ActorId, inputs: readonly InputNote[], detail: Readonly<Record<string, JsonValue>>, basis: number): OpenActivation {
	const { log, definition } = parts;
	const opened = log.emit("kernel", "activation_opened", { actor, inputs, detail }, { basis });
	const grant = definition.actors.find((spec) => spec.id === actor)?.grant;
	let count = 0;
	let seen = basis;
	return {
		actor,
		tick: parts.tick,
		basis,
		detail,
		inputs,
		tools: grant === undefined ? [] : toolSpecs(parts, grant),
		call: (as, params) => {
			count += 1;
			const outcome = dispatch(parts, { actor, as, params, basis: seen, causedBy: opened.seq });
			seen = log.events.length;
			return Promise.resolve(outcome);
		},
		record: (source, type, payload) => log.run({ actor, causedBy: opened.seq }, () => log.emit(source, type, payload, { audience: ["human"] })),
		close: (failed) => {
			const outcome = failed ? "error" : count > 0 ? "acted" : "no-call";
			log.run({ actor, causedBy: opened.seq }, () => log.emit("kernel", "activation_closed", { actor, calls: count, outcome }));
		},
		get quietEnd() {
			const mark = parts.last.get(actor);
			return mark !== undefined && (mark.looked || mark.ended);
		},
	};
}

/** The scheduler port of 2.7 over the parts. */
export function schedulerPort(parts: Parts): SchedulerPort {
	const { log, definition } = parts;
	const bases = new Map<ActorId, number>();
	const hooked = <T>(read: (instance: PluginInstance) => T | undefined): T[] => [...parts.instances.values()].flatMap((instance) => read(instance) ?? []);
	return {
		seed: definition.seed,
		get tick() {
			return parts.tick;
		},
		actors: actorsPort(parts),
		get halted() {
			return parts.ended !== undefined || breach(parts) !== undefined;
		},
		rng: () => first,
		emit: (type, payload) => log.emit(definition.scheduler.definition.id, type, payload),
		...ticks(parts),
		hasNews: (actor) => hooked((instance) => instance.hooks.news?.(actor)).includes(true),
		toAct: () => hooked((instance) => instance.hooks.toAct?.())[0],
		inputsFor: (actor) => {
			bases.set(actor, log.events.length);
			const notes: OrderedNote[] = [];
			for (const [source, instance] of parts.instances) {
				for (const hook of instance.hooks.inputs ?? []) {
					for (const line of log.run({ actor }, () => hook.run(actor))) notes.push(typeof line === "string" ? { source, text: line } : { source, ...line });
				}
			}
			return notes;
		},
		open: (actor, inputs, detail) => open(parts, actor, inputs, detail, bases.get(actor) ?? log.events.length),
	};
}

/**
 * Builds the miniature from a definition and its sinks.
 *
 * @param definition - The kernel definition.
 * @param sinks - The sinks that read the log.
 * @returns The parts, with the plugins loaded and `run_started` written.
 */
export function createMiniKernel(definition: KernelDefinition, sinks: readonly EventSink[]): Parts & { submit(call: Submission): Promise<ToolOutcome> } {
	const base = { definition, instances: new Map<string, PluginInstance>(), tools: new Map<CanonicalTool, LoadedTool>(), jobs: [], calls: new Map<ActorId, number>(), last: new Map<ActorId, { looked: boolean; ended: boolean }>() };
	const parts: Parts = { ...base, log: createLog(() => parts.tick, sinks), tick: 0, ended: undefined };
	load(parts);
	const { actors, plugins, limits, game, seed } = definition;
	parts.log.emit("kernel", "run_started", { game: game.id, seed, maxTicks: limits.maxTicks, actors: actors.map((actor) => actor.id), plugins: plugins.map((plugin) => plugin.id) });
	for (const instance of parts.instances.values()) for (const hook of instance.hooks.runStarted ?? []) parts.log.run({ actor: "kernel" }, hook.run);
	let lane: Promise<unknown> = Promise.resolve();
	const submit = (call: Submission): Promise<ToolOutcome> => {
		const result = lane.then(() => dispatch(parts, call));
		lane = result;
		return result;
	};
	return Object.assign(parts, { submit });
}
