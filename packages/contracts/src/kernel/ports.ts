// SPDX-License-Identifier: Apache-2.0
/** The ports of the kernel: scheduler, driver and sink. Internal interfaces, not plugin kinds. */
import type { TSchema } from "typebox";
import type { JsonValue, RandomLabel, RandomSource, RunEnd } from "../values.ts";
import type { ActorId } from "./actor.ts";
import type { Envelope, InputNote, OrderedNote } from "./envelope.ts";
import type { EventSchemas } from "./event-def.ts";
import type { ActorsView, SnapshotSlice } from "./plugin.ts";
import type { ToolOutcome, ToolSpec } from "./tool.ts";

/**
 * What a driver gets for one activation.
 *
 * @public
 */
export interface Activation {
	/** Who is activated. */
	readonly actor: ActorId;
	/** The tick of the activation. */
	readonly tick: number;
	/** The log length when its inputs were built. */
	readonly basis: number;
	/** The scheduler's own data about the activation. */
	readonly detail: Readonly<Record<string, JsonValue>>;
	/** The input lines, as shown. */
	readonly inputs: readonly InputNote[];
	/** Every granted tool, locked or not, under the shown names, in grant order. */
	readonly tools: readonly ToolSpec[];
	/** Calls a tool under the name the caller was shown. */
	call(as: string, params: unknown): Promise<ToolOutcome>;
}

/**
 * What a driver may say at the end of an activation.
 *
 * @public
 */
export interface DriverResult {
	/** True when the driver holds tool results its caller has not answered yet. */
	readonly pending: boolean;
}

/**
 * An agent: it plays one activation and returns.
 *
 * @public
 */
export type ActorDriver = (activation: Activation) => Promise<DriverResult | undefined> | Promise<void>;

/**
 * The drivers of a run, by actor id, else by kind. An activated actor without a driver ends the run (SWT-R011).
 *
 * @public
 */
export type DriverTable = Readonly<Record<string, ActorDriver>>;

/**
 * What the scheduler holds: the activation plus its end.
 *
 * @public
 */
export interface OpenActivation extends Activation {
	/** Ends the activation and writes `activation_closed`; the kernel counted the calls. */
	close(failed: boolean): void;
	/** True when its last call was a free look or a success that ended the activation. */
	readonly quietEnd: boolean;
}

/**
 * What the kernel gives the scheduler.
 *
 * @public
 */
export interface SchedulerPort {
	/** The seed of the run. */
	readonly seed: number;
	/** The current tick. */
	readonly tick: number;
	/** The actors of the run. */
	readonly actors: ActorsView;
	/** True when a run limit is reached or the run failed; a breach, once seen, stays for the tick. */
	readonly halted: boolean;
	/** A seeded random stream of the scheduler for the labels. */
	rng(...labels: readonly RandomLabel[]): RandomSource;
	/** Writes one of the scheduler's own declared events; the source is its id. */
	emit(type: string, payload: unknown): Envelope;
	/** Starts a tick: the due jobs, then the tick-start hooks. */
	beginTick(): Promise<void>;
	/** Ends a tick; `idle` says that nothing was played in it. It returns the end of the run, if this was it. */
	endTick(idle: boolean): Promise<RunEnd | undefined>;
	/** Says whether any plugin has something new for the actor. */
	hasNews(actor: ActorId): boolean;
	/** Who is to act now; undefined: no loaded plugin names one. */
	toAct(): readonly ActorId[] | undefined;
	/** The lines of every `inputs` hook, in hook order; it remembers the log length as the basis. */
	inputsFor(actor: ActorId): readonly OrderedNote[];
	/** Opens an activation and writes `activation_opened`. */
	open(actor: ActorId, inputs: readonly InputNote[], detail: Readonly<Record<string, JsonValue>>): OpenActivation;
}

/**
 * A scheduler as the kernel definition names it. An internal interface with one implementation: it has no
 * `define*` call and no manifest of its own.
 *
 * @public
 */
export interface SchedulerDefinition<O = unknown> {
	/** The id, for example `@swarmtales/engine/turns`; the source of its events. */
	readonly id: string;
	/** The revision of its behaviour. */
	readonly revision: number;
	/** Whether a run can be repeated from its seed, or only from its record. */
	readonly determinism: "seeded" | "recorded";
	/** The schema of its options. */
	readonly options: TSchema;
	/** The events it declares. */
	readonly events: EventSchemas;
	/** Creates the scheduler of one run. */
	create(options: O): SchedulerInstance;
}

/**
 * The scheduler of one run.
 *
 * @public
 */
export interface SchedulerInstance {
	/** Plays to the end, or `until.ticks` ticks; undefined when it stopped at `until` with the run still open. */
	run(port: SchedulerPort, drivers: DriverTable, until?: { readonly ticks: number }): Promise<RunEnd | undefined>;
	/** Its state, when it keeps some. */
	readonly slice?: SnapshotSlice;
}

/**
 * A reader of the log. It sees every event after the listeners, in log order. A sink that throws ends the run
 * (SWT-R020).
 *
 * @public
 */
export interface EventSink {
	/** Takes one event. */
	write(event: Envelope): void;
	/** Called once when the run has ended. */
	close?(end: RunEnd): void;
}
