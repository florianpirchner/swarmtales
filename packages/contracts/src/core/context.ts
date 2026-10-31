/**
 * What a mechanic's code sees. The host hands every mechanic instance a `MechanicPort` of untyped
 * primitives; `defineMechanic` wraps it into the typed contexts below. A mechanic never sees the
 * host, another mechanic's state or any Node API: only its own state, these ports and the events.
 */
import type { Static, TSchema } from "typebox";
import type { ApiDefinition, ApiInput, ApiMethodName, ApiOutput } from "./api.ts";
import type { StageOptions } from "./consult.ts";
import type { EventLogView, EventSchemas } from "./events.ts";
import type { Actor, JsonValue, PromptKeys, PromptVariables, RandomSource, ResidentId } from "./values.ts";

/** Read access to the residents. */
export interface ResidentsView {
	/** Every resident of the run, in the story's order. */
	readonly ids: readonly ResidentId[];
	has(id: string): boolean;
	/** False while any mechanic holds a suspension (a ban, a sleep, a stay away). */
	mayAct(id: ResidentId): boolean;
	/** An attribute from the bag of `owner` (the calling mechanic when left out). */
	attribute(id: ResidentId, key: string, owner?: string): JsonValue | undefined;
}

/** Residents as a mechanic may change them: its own attributes and its own suspensions. */
export interface ResidentsPort extends ResidentsView {
	setAttribute(id: ResidentId, key: string, value: JsonValue): void;
	/** Writes `resident_suspended`; a resident may act again once every suspender resumed it. */
	suspend(id: ResidentId, reason: string): void;
	resume(id: ResidentId): void;
}

/** The virtual-minute scheduler. Jobs are named (declared in the mechanic's `jobs`), so they survive a snapshot. */
export interface SchedulePort {
	/** Runs `job` once at the start of `minute`. */
	at(minute: number, job: string, data?: JsonValue): void;
	/** Runs `job` every `interval` minutes, first at `start` (default: now + interval). */
	every(interval: number, job: string, options?: { readonly start?: number; readonly data?: JsonValue }): void;
}

/** Per-resident tool locks (the `lock` stage). Grants say what a role may use; locks close single tools for single residents. */
export interface AccessPort {
	lock(resident: ResidentId, tool: string): void;
	unlock(resident: ResidentId, tool: string): void;
	isLocked(resident: ResidentId, tool: string): boolean;
}

/** The untyped primitives the host gives one mechanic instance. */
export interface MechanicPort {
	/** The mechanic's id. */
	readonly id: string;
	readonly seed: number;
	minute(): number;
	/** Appends an event of this mechanic; the host checks the payload against the declared schema. */
	emit(type: string, payload: unknown): void;
	/** Calls a method of a required API. */
	call(api: string, method: string, input: unknown): unknown;
	render(id: string, variables: Readonly<Record<string, string | number>>, declared: readonly string[]): string;
	/** A fresh stream derived from the seed, this mechanic and the position in the log. */
	random(): RandomSource;
	/** Queues a call by the script; it runs through the pipeline once the current code has finished. */
	stage(tool: string, params: unknown, options?: StageOptions): void;
	readonly residents: ResidentsPort;
	readonly schedule: SchedulePort;
	readonly access: AccessPort;
	readonly log: EventLogView;
}

/** The type parameters of one mechanic, bundled so the contexts take one argument. */
export interface MechanicShape {
	readonly options: TSchema;
	readonly state: unknown;
	readonly events: EventSchemas;
	readonly prompts: PromptKeys;
	readonly requires: readonly ApiDefinition[];
	readonly provides: readonly ApiDefinition[];
}

export interface Shape<O extends TSchema, S, E extends EventSchemas, P extends PromptKeys, R extends readonly ApiDefinition[], Pv extends readonly ApiDefinition[]>
	extends MechanicShape {
	readonly options: O;
	readonly state: S;
	readonly events: E;
	readonly prompts: P;
	readonly requires: R;
	readonly provides: Pv;
}

/** Read-only view for facts and referee limits: no emit, no commands. */
export interface FactView<M extends MechanicShape> {
	readonly options: Static<M["options"]>;
	/** Must not be changed: facts are pure. */
	readonly state: Readonly<M["state"]>;
	readonly minute: number;
	readonly residents: ResidentsView;
	readonly log: EventLogView;
}

/** The context of hooks, listeners, jobs, services and pipeline handlers. */
export interface MechanicContext<M extends MechanicShape> {
	readonly mechanic: string;
	readonly options: Static<M["options"]>;
	readonly state: M["state"];
	readonly minute: number;
	readonly residents: ResidentsPort;
	readonly schedule: SchedulePort;
	readonly access: AccessPort;
	readonly log: EventLogView;
	/** Only declared events, with the payload of their schema. */
	emit<K extends keyof M["events"] & string>(type: K, payload: Static<M["events"][K]>): void;
	/** A method of a required API; the output is checked against the method's schema. */
	call<A extends M["requires"][number], K extends ApiMethodName<A>>(api: A, method: K, input: ApiInput<A, K>): ApiOutput<A, K>;
	/** One of the mechanic's own prompts. */
	prompt<K extends keyof M["prompts"] & string>(id: K, variables: PromptVariables<M["prompts"][K]>): string;
	random(): RandomSource;
	/**
	 * Stages a call by the script (actor `script`): it runs through the whole pipeline after the
	 * code that staged it (a job, a hook, a listener, a tool call) has finished, before anything
	 * else happens. `then` names a job of this mechanic that gets the outcome as its data.
	 */
	stage(tool: string, params: unknown, options?: StageOptions): void;
}

/** A tool's context: the mechanic context plus who calls. */
export interface ToolContext<M extends MechanicShape> extends MechanicContext<M> {
	readonly actor: Actor;
	/** Set when a resident calls. */
	readonly resident: ResidentId | undefined;
}

/** What a mechanic's initial state is built from (a fresh run; a resumed run loads its snapshot instead). */
export interface StateSetup<O extends TSchema> {
	readonly options: Static<O>;
	readonly residents: readonly ResidentId[];
	random(): RandomSource;
}
