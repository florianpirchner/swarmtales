// SPDX-License-Identifier: Apache-2.0
/** The plugin shape: what a plugin hands the kernel, and the untyped port the kernel hands a plugin. */
import type { TSchema } from "typebox";
import type { JsonValue, RandomLabel, RandomSource } from "../values.ts";
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
 * A listener on one event type of one plugin.
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
	/** Give the lines an actor is shown when it is activated. */
	readonly inputs?: readonly Ordered<(actor: ActorId) => readonly InputLine[]>[];
	/** Run at the end of a tick. */
	readonly tickEnded?: readonly Ordered<() => void>[];
	/** Says whether there is something new for the actor. It must not change state; any plugin saying yes counts. */
	news?(actor: ActorId): boolean;
	/** Says who is to act now; at most one loaded plugin has it (SWT-R013). */
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
 * A condition that ends the run.
 *
 * @public
 */
export interface RunLimit {
	/** The id, unique in its plugin. */
	readonly id: string;
	/** What the limit is, in one line. */
	readonly summary: string;
	/** The reason when the limit is reached, else undefined. */
	check(): string | undefined;
}

/**
 * A value a plugin computes from its state for readers outside the run.
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
 * The state of one plugin (or of the scheduler) in a snapshot.
 *
 * @public
 */
export interface SnapshotSlice {
	/** The version of the saved form. */
	readonly version: number;
	/** The state as JSON data. */
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
	/** Its state; required when the plugin keeps state. */
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
	/** The envelope source of its events: `<package>/<id>`. */
	readonly source: string;
	/** The seed of the run. */
	readonly seed: number;
	/** The tick limit of the run. */
	readonly maxTicks: number;
	/** The current tick. */
	tick(): number;
	/** Writes an event; the type must be declared, and the sdk has checked the payload. */
	emit(type: string, payload: unknown): void;
	/** Calls a service; it throws when no loaded plugin provides it. */
	call(service: string, method: string, input: unknown): unknown;
	/** Says whether a loaded plugin provides the service. */
	has(service: string): boolean;
	/** A seeded random stream of this plugin for the labels. */
	rng(...labels: readonly RandomLabel[]): RandomSource;
	/** The actors of the run. */
	readonly actors: ActorsPort;
	/** The clock's jobs. */
	readonly schedule: SchedulePort;
	/** Locks on tools. */
	readonly access: AccessPort;
}

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
	/** The open tools of the actor, in grant order. */
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
