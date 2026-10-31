/**
 * What a mechanic's code sees. The host hands every mechanic instance a `MechanicPort` of untyped
 * primitives; `defineMechanic` wraps it into the typed contexts below. A mechanic never sees the
 * host, another mechanic's state or any Node API: only its own state, these ports and the events.
 */
import type { Static, TSchema } from "typebox";
import type { ApiDefinition, ApiInput, ApiMethodName, ApiOutput, QueryMethodName } from "./api.ts";
import type { EventLogView, EventSchemas } from "./events.ts";
import type { ToolRef } from "./tools.ts";
import type { Actor, JsonValue, PromptKeys, PromptVariables, RandomLabel, RandomSource, ResidentId } from "./values.ts";

/** Options of `ctx.stage`. */
export interface StageOptions {
	/** A job of the staging mechanic that runs with the outcome (`StagedOutcome`) as its data. */
	readonly then?: string;
}

/** The outcome of a staged call, as the `then` job receives it. */
export type StagedOutcome = { readonly ok: true; readonly reply: string } | { readonly ok: false; readonly code: string; readonly detail?: string };

/** Read access to the residents. */
export interface ResidentsView {
	/** Every resident of the run, in the story's order. */
	readonly ids: readonly ResidentId[];
	has(id: string): boolean;
	/** False while any mechanic holds a suspension (a ban, a sleep, a stay away). */
	mayAct(id: ResidentId): boolean;
	/** An attribute from the calling mechanic's own bag; another mechanic's attributes are read through its API. */
	attribute(id: ResidentId, key: string): JsonValue | undefined;
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
	/**
	 * Whether the resident could call the tool now as far as the `lock` stage goes: granted to
	 * residents, not locked, and no mechanic's `lock` handler refuses it (round 2, R2-D13). A lock
	 * handler asked this way must not emit; the host refuses a handler that does.
	 */
	isOpen(resident: ResidentId, tool: string): boolean;
	/**
	 * The tools granted to residents that are open for this resident (`isOpen`), in the story's
	 * grant order: what the old `enabledTools` listed (the access locks and every mechanic's
	 * `lock` handler, so a phase tool closed by a handler is left out).
	 */
	open(resident: ResidentId): readonly string[];
}

/** Which model-backed roles the run has (the host's `roles`), so a tool can answer "absent" first. */
export interface RolesView {
	has(role: string): boolean;
}

/** The untyped primitives the host gives one mechanic instance. */
export interface MechanicPort {
	/** The mechanic's id. */
	readonly id: string;
	readonly seed: number;
	/** The minutes the story plays (`story.minutes`). */
	readonly minutes: number;
	minute(): number;
	/** Appends an event of this mechanic; the host checks the payload against the declared schema. */
	emit(type: string, payload: unknown): void;
	/** Calls a method of a required API, or of a used API that is loaded (throws otherwise). */
	call(api: string, method: string, input: unknown): unknown;
	/** Whether a loaded mechanic provides the API (known for the whole story from the start). */
	has(api: string): boolean;
	render(id: string, variables: Readonly<Record<string, string | number>>, declared: readonly string[]): string;
	/** A fresh stream derived from the seed, this mechanic and the position in the log. */
	random(): RandomSource;
	/** The labelled stream of the run seed: `rng("deal", 3)` draws what `rngFor(seed, "deal", 3)` draws, wherever it is called. */
	rng(...labels: readonly RandomLabel[]): RandomSource;
	/** Queues a call by the script; it runs through the pipeline once the current code has finished. */
	stage(tool: ToolRef, params: unknown, options?: StageOptions): void;
	readonly residents: ResidentsPort;
	readonly schedule: SchedulePort;
	readonly access: AccessPort;
	readonly roles: RolesView;
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
	readonly uses: readonly ApiDefinition[];
}

export interface Shape<
	O extends TSchema,
	S,
	E extends EventSchemas,
	P extends PromptKeys,
	R extends readonly ApiDefinition[],
	Pv extends readonly ApiDefinition[],
	U extends readonly ApiDefinition[] = [],
> extends MechanicShape {
	readonly options: O;
	readonly state: S;
	readonly events: E;
	readonly prompts: P;
	readonly requires: R;
	readonly provides: Pv;
	readonly uses: U;
}

/** Read-only view for facts and referee limits: no emit, no commands. */
export interface FactView<M extends MechanicShape> {
	readonly options: Static<M["options"]>;
	/** Must not be changed: facts are pure. */
	readonly state: Readonly<M["state"]>;
	readonly minute: number;
	readonly residents: ResidentsView;
	readonly log: EventLogView;
	/** A `query` of a required API (round 2, R2-D4): live data of other mechanics, never a command. */
	call<A extends M["requires"][number], K extends QueryMethodName<A>>(api: A, method: K, input: ApiInput<A, K>): ApiOutput<A, K>;
	/** A `query` of a used API, `undefined` when no loaded mechanic provides it. */
	tryCall<A extends M["uses"][number], K extends QueryMethodName<A>>(api: A, method: K, input: ApiInput<A, K>): ApiOutput<A, K> | undefined;
}

/** The context of hooks, listeners, jobs, services and pipeline handlers. */
export interface MechanicContext<M extends MechanicShape> {
	readonly mechanic: string;
	/** The run's seed. */
	readonly seed: number;
	readonly options: Static<M["options"]>;
	readonly state: M["state"];
	readonly minute: number;
	/** The minutes the story plays: the last minute is `minutes - 1` (wave 3.5, T4 request R7). */
	readonly minutes: number;
	readonly residents: ResidentsPort;
	readonly schedule: SchedulePort;
	readonly access: AccessPort;
	/** The model-backed roles of the run (round 2, R2-D3): `ctx.roles.has("judge")`. */
	readonly roles: RolesView;
	readonly log: EventLogView;
	/** Only declared events, with the payload of their schema. */
	emit<K extends keyof M["events"] & string>(type: K, payload: Static<M["events"][K]>): void;
	/** A method of a required API (or of a used one that is loaded); the output is checked against the method's schema. */
	call<A extends M["requires"][number], K extends ApiMethodName<A>>(api: A, method: K, input: ApiInput<A, K>): ApiOutput<A, K>;
	/** Whether a loaded mechanic provides `api` (always true for a required one). */
	has(api: M["requires"][number] | M["uses"][number]): boolean;
	/** A method of an API the mechanic `uses`: its output when a loaded mechanic provides it, `undefined` otherwise. */
	tryCall<A extends M["uses"][number], K extends ApiMethodName<A>>(api: A, method: K, input: ApiInput<A, K>): ApiOutput<A, K> | undefined;
	/** One of the mechanic's own prompts. */
	prompt<K extends keyof M["prompts"] & string>(id: K, variables: PromptVariables<M["prompts"][K]>): string;
	random(): RandomSource;
	/**
	 * The labelled stream `labels` of the run seed, the same numbers as the old engine's
	 * `rngFor(seed, ...labels)`; unlike `random()` it does not move when other events are logged.
	 */
	rng(...labels: readonly RandomLabel[]): RandomSource;
	/**
	 * Stages a call by the script (actor `script`): it runs through the whole pipeline after the
	 * code that staged it (a job, a hook, a listener, a tool call) has finished, before anything
	 * else happens. `then` names a job of this mechanic that gets the outcome as its data. Calls
	 * staged while a staged call (or its `then` job) runs go first, depth first, so a chain of
	 * one-at-a-time actions finishes before the next queued call. `tool` is a `ToolRef`
	 * (`defineTool`, or the tool itself), so the parameters are typed.
	 */
	stage<P extends TSchema>(tool: ToolRef<string, P>, params: Static<P>, options?: StageOptions): void;
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
	readonly seed: number;
	random(): RandomSource;
	/** A labelled stream of the run seed, as `ctx.rng`. */
	rng(...labels: readonly RandomLabel[]): RandomSource;
}
