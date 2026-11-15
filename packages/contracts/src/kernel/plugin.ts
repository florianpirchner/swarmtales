// SPDX-License-Identifier: Apache-2.0
/** The plugin shape: what a plugin hands the kernel, and the untyped port the kernel hands a plugin. */
import type { TSchema } from "typebox";
import type { JsonValue, RandomLabel, RandomSource, RunEnd } from "../values.ts";
import type { ActorId } from "./actor.ts";
import type { Envelope, InputLine } from "./envelope.ts";
import type { EventSchemas } from "./event-def.ts";
import type { ProvidedService } from "./service.ts";
import type { CanonicalTool, KernelTool, Refusal, ToolCall, ToolOutcome } from "./tool.ts";

/**
 * A registration with its place: it runs after the registrations of the same point of the named plugin ids.
 *
 * @public
 */
export interface Ordered<F> {
	/** The registered function. */
	readonly run: F;
	/** The plugin ids it runs after; an id of a plugin that is not loaded is ignored. */
	readonly after?: readonly string[];
}

/**
 * A listener on one event type of one plugin. It is called after the step that wrote the event has returned (never
 * in the middle of a tool's `execute`), in log order of the events, and what it emits is caused by that event.
 *
 * @public
 */
export interface Listener extends Ordered<(event: Envelope) => void> {
	/** The id of the plugin that declares the event (not the envelope's `source`). */
	readonly source: string;
	/** The event type. */
	readonly type: string;
	/** The payload schema; it must be the declaring plugin's schema object (checked at load). */
	readonly schema: TSchema;
}

/**
 * The fixed hook points of a run.
 *
 * @public
 */
export interface PluginHooks {
	/** Run once, after `run_started`. */
	readonly runStarted?: readonly Ordered<() => void>[];
	/** Run at the start of a tick, after the tick's due jobs. */
	readonly tickStarted?: readonly Ordered<() => void>[];
	/** Give the lines an actor is shown when it is activated; called once per activation, and it may note what it has told. */
	readonly inputs?: readonly Ordered<(actor: ActorId) => readonly InputLine[]>[];
	/** Run after `activation_opened` is written, before the driver starts; what one emits is caused by that event. */
	readonly activationOpened?: readonly Ordered<(actor: ActorId) => void>[];
	/** Run when the activation ends, before `activation_closed` is written; what one emits is caused by `activation_opened`. */
	readonly activationClosed?: readonly Ordered<(actor: ActorId) => void>[];
	/** Run at the end of a tick. */
	readonly tickEnded?: readonly Ordered<() => void>[];
	/**
	 * Run once when the run ends by the tick limit or a run limit: after the last tick has ended, before `run_ended`
	 * is written, so what one emits lands before `run_ended`. A run that fails calls none, and a run that pauses
	 * (`until`) has not ended.
	 */
	readonly runEnded?: readonly Ordered<(end: RunEnd) => void>[];
	/** Says whether there is something new for the actor. It must not change state; any plugin saying yes counts. */
	news?(actor: ActorId): boolean;
	/** Says who is to act now, for a scheduler that wakes only those (a game with a fixed order of play); at most one loaded plugin has it (SWT-R013). */
	toAct?(): readonly ActorId[];
}

/**
 * A plugin's handlers for the stages of every tool call.
 *
 * @public
 */
export interface StageHandlers {
	/** Refuses a call before its arguments are checked; `params` is raw here. */
	lock?(call: ToolCall): Refusal | undefined;
	/** Refuses a call whose arguments are checked. */
	rule?(call: ToolCall): Refusal | undefined;
	/** Sees the result of a call, also after a refused execute. */
	after?(call: ToolCall, outcome: ToolOutcome): void;
}

/**
 * A condition that ends the run, for example "the game is won". The kernel checks the limits of every plugin in load
 * order at the ends of a tick and whenever the scheduler asks whether the run is halted; the first reason ends the
 * run with `limit_reached { limit: "<plugin id>.<limit id>" }`.
 *
 * @remarks
 * A limit can also come from outside the plugins, through `KernelPorts.limits`: a cost cap. Such a limit is checked
 * before the plugins' limits, and its id is the whole name in the log, `<owner>.<limit>` (`models.budget`).
 *
 * What an implementer must do. `check` is called often and must be cheap, synchronous and free of side effects: it
 * reads a state its owner keeps (a board, a meter) and never changes it. It must not throw. Once it has returned a
 * reason it keeps returning one. The reason is written to the log (`limit_reached { limit, reason }`, then
 * `RunEnd { reason: "limit", limit }`), so it must hold no secret.
 *
 * @public
 */
export interface RunLimit {
	/** The id: unique in its plugin, or `<owner>.<limit>` for a limit of `KernelPorts.limits`, where the owner is never the id of a plugin. */
	readonly id: string;
	/** What the limit is, in one line. */
	readonly summary: string;
	/**
	 * Says whether the limit is reached.
	 *
	 * @returns The reason of the breach, as one sentence for the log, or `undefined` while the limit holds.
	 */
	check(): string | undefined;
}

/**
 * A value a plugin computes from its state for readers outside the run, read with `kernel.fact("<plugin id>.<fact>")`:
 * a result line, a score table. Computing it must not change state.
 *
 * @public
 */
export interface Fact {
	/** The schema of the value. */
	readonly output: TSchema;
	/** Computes the value. */
	compute(): unknown;
}

/**
 * The state of one plugin (or of the scheduler) in a snapshot. `save` is called between ticks; `load` is called on
 * a fresh instance before a resumed run goes on, and must leave it as the saved one was.
 *
 * @public
 */
export interface SnapshotSlice {
	/** The version of the saved form. */
	readonly version: number;
	/** The state as JSON data: it is written to a file and read back. */
	save(): unknown;
	/** Takes saved state back; `version` is the version it was saved with. */
	load(data: unknown, version: number): void;
}

/**
 * One plugin in one run. Every kind of plugin hands the kernel this one shape.
 *
 * @public
 */
export interface PluginInstance {
	/** The tools it owns. */
	readonly tools: readonly KernelTool[];
	/** The services it provides. */
	readonly services: readonly ProvidedService[];
	/** Its listeners on events. */
	readonly listeners: readonly Listener[];
	/** Its hooks. */
	readonly hooks: PluginHooks;
	/** Its stage handlers. */
	readonly stages: StageHandlers;
	/** Its jobs, by name; a job gets the data it was scheduled with. */
	readonly jobs: Readonly<Record<string, (data: JsonValue | undefined) => void>>;
	/** Its run limits. */
	readonly limits: readonly RunLimit[];
	/** Its facts, by name. */
	readonly facts: Readonly<Record<string, Fact>>;
	/** Its state; required when the plugin keeps state, `undefined` when it keeps none (a snapshot then holds no entry for it). */
	readonly slice: SnapshotSlice | undefined;
}

/**
 * A plugin as the kernel definition lists it: static data plus the factory.
 *
 * @public
 */
export interface ResolvedPlugin {
	/** The plugin id, unique in the game. */
	readonly id: string;
	/** The npm name of its package. */
	readonly package: string;
	/** The version of its package. */
	readonly version: string;
	/** The service names it needs. */
	readonly requires: readonly string[];
	/** The service names it provides. */
	readonly provides: readonly string[];
	/** The events it declares. */
	readonly events: EventSchemas;
	/** Event type to grant names: the default audience of that event. */
	readonly audiences: Readonly<Record<string, readonly string[]>>;
	/** Its options, parsed, with defaults filled. */
	readonly options: JsonValue;
	/** Creates the instance for one run. */
	create(port: PluginPort): PluginInstance;
}

/**
 * The untyped primitives the kernel gives one plugin instance. Every value crossing it is JSON or a schema.
 *
 * @public
 */
export interface PluginPort {
	/** The plugin id. */
	readonly id: string;
	/** The envelope source of its events: `<package>/<id>`; a tool's canonical name is this plus `/<tool>`. */
	readonly source: string;
	/** The seed of the run. */
	readonly seed: number;
	/** The tick limit of the run. */
	readonly maxTicks: number;
	/** The current tick. */
	tick(): number;
	/** Writes an event; the type must be declared, and the sdk has checked the payload. */
	emit(type: string, payload: unknown): void;
	/** Calls a method of a service another plugin provides; a command writes `service_called`. It throws when no loaded plugin provides the service. */
	call(service: string, method: string, input: unknown): unknown;
	/** Says whether a loaded plugin provides the service. */
	has(service: string): boolean;
	/**
	 * The seeded random stream of the labels. The labels are not prefixed with the plugin id: the same labels give
	 * the same stream in every plugin, so a plugin starts them with its own id or a word of its contract.
	 */
	rng(...labels: readonly RandomLabel[]): RandomSource;
	/** The actors of the run. */
	readonly actors: ActorsPort;
	/** The clock's jobs. */
	readonly schedule: SchedulePort;
	/** Locks on tools. */
	readonly access: AccessPort;
	/**
	 * Stages a tool call that the kernel makes as the actor `script` once the outermost step that staged it (a hook,
	 * a job, a tool call with the listeners of what it emitted) has returned: through the whole pipeline, in the
	 * order staged and depth first (what a staged call and its `then` job stage runs before the calls queued behind
	 * it). Its `tool_called` is caused by the event whose frame staged it. The definition lists the actor `script`
	 * with a grant; a tool outside it is refused as for any caller (`TOOL_NOT_GRANTED`).
	 *
	 * @param as - The name the call is made with, as the grant of `script` shows the tool.
	 * @param params - The raw arguments.
	 * @param options - `then`: a job of the same plugin that runs after the call, with {@link StagedOutcome} as data.
	 */
	stage(as: string, params: unknown, options?: StageOptions): void;
}

/**
 * The options of a staged call.
 *
 * @public
 */
export interface StageOptions {
	/** A job of the staging plugin that the kernel runs right after the call, with its outcome as data. */
	readonly then?: string;
}

/**
 * The outcome of a staged call as its `then` job gets it: JSON data, as every job's data.
 *
 * @public
 */
export type StagedOutcome = { readonly ok: true; readonly reply: string } | { readonly ok: false; readonly code: string; readonly detail?: string };

/**
 * A read-only view of the actors of a run.
 *
 * @public
 */
export interface ActorsView {
	/** Every actor of the run, in the definition's order. */
	readonly ids: readonly ActorId[];
	/** The actors of one kind, in the definition's order. */
	ofKind(kind: string): readonly ActorId[];
	/** Says whether the id is an actor of the run. */
	has(id: string): boolean;
	/** False while any plugin holds a suspension of the actor. */
	mayAct(id: ActorId): boolean;
	/** Reads the bag written at genesis (`ActorSpec.shared`). */
	shared(id: ActorId, key: string): JsonValue | undefined;
}

/**
 * The actors as one plugin sees them: the view plus its own suspensions.
 *
 * @public
 */
export interface ActorsPort extends ActorsView {
	/** Suspends the actor and writes `actor_suspended`; a second call of the same plugin does nothing. */
	suspend(id: ActorId, reason: string): void;
	/** Lifts the calling plugin's suspension only. */
	resume(id: ActorId): void;
}

/**
 * The clock as one plugin sees it.
 *
 * @public
 */
export interface SchedulePort {
	/** Schedules a job of the plugin; `tick` must not lie in the past, and the job runs at the start of that tick. */
	at(tick: number, job: string, data?: JsonValue): void;
}

/**
 * Locks on tools as one plugin sees them.
 *
 * @public
 */
export interface AccessPort {
	/** Locks the tool for the actor; writes `tool_locked` when it changes something. */
	lock(actor: ActorId, tool: CanonicalTool): void;
	/** Lifts the lock; writes `tool_unlocked` when it changes something. */
	unlock(actor: ActorId, tool: CanonicalTool): void;
	/** Says whether the tool is locked for the actor. */
	isLocked(actor: ActorId, tool: CanonicalTool): boolean;
	/** True when the tool is granted, not locked, and no lock handler refuses. */
	isOpen(actor: ActorId, tool: CanonicalTool): boolean;
	/** The tools the actor can call now (`isOpen`), in grant order. */
	open(actor: ActorId): readonly CanonicalTool[];
}

/**
 * A read-only view of the log.
 *
 * @public
 */
export interface LogView {
	/** The number of events. */
	readonly length: number;
	/** Every event, in log order. */
	all(): readonly Envelope[];
	/** The events after `seq`, in log order. */
	since(seq: number): readonly Envelope[];
	/** The events of one type; `source` as in the envelope. */
	ofType(source: string, type: string): readonly Envelope[];
}
