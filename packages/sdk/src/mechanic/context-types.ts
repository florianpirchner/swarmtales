// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * What a mechanic's code sees: its typed contexts. The kernel hands every instance an untyped `PluginPort`; the sdk
 * wraps it into the contexts below. An author sees resident ids (`A01`), never actor ids (`resident:A01`), and its
 * own tools under their bare names.
 */
import type { Static, TSchema } from "typebox";
import type { ActorId, ActorsView, EventSchemas, RandomLabel, RandomSource, SchedulePort, ServiceDefinition, ToolRef } from "@swarmtales/contracts";

/**
 * The prompts a mechanic declares: prompt id to the names of its variables.
 *
 * @public
 */
export type PromptKeys = Readonly<Record<string, readonly string[]>>;

/**
 * The values of the variables one prompt takes.
 *
 * @public
 */
export type PromptVariables<Names extends readonly string[]> = Readonly<Record<Names[number], string | number>>;

/**
 * The method names of a service.
 *
 * @public
 */
export type ServiceMethodName<A extends ServiceDefinition> = keyof A["methods"] & string;

/**
 * The names of a service's `query` methods: what a fact or a run limit may call.
 *
 * @public
 */
export type QueryMethodName<A extends ServiceDefinition> = { [K in ServiceMethodName<A>]: A["methods"][K]["kind"] extends "query" ? K : never }[ServiceMethodName<A>];

/**
 * The input of one method of a service.
 *
 * @public
 */
export type ServiceInput<A extends ServiceDefinition, K extends ServiceMethodName<A>> = Static<A["methods"][K]["input"]>;

/**
 * The output of one method of a service.
 *
 * @public
 */
export type ServiceOutput<A extends ServiceDefinition, K extends ServiceMethodName<A>> = Static<A["methods"][K]["output"]>;

/**
 * What a provider writes for one service: one function per method, given the provider's context and the id of the
 * calling plugin.
 *
 * @public
 */
export type ServiceImplementation<A extends ServiceDefinition, Ctx> = {
	readonly [K in ServiceMethodName<A>]: (input: ServiceInput<A, K>, ctx: Ctx, caller: string) => ServiceOutput<A, K>;
};

/**
 * The type parameters of one mechanic, bundled so the contexts take one argument.
 *
 * @public
 */
export interface MechanicShape {
	/** The options as the mechanic reads them: parsed, with defaults filled. */
	readonly options: unknown;
	/** The state of one run. */
	readonly state: unknown;
	/** The events the mechanic declares. */
	readonly events: EventSchemas;
	/** The prompts the mechanic declares. */
	readonly prompts: PromptKeys;
	/** The services it needs. */
	readonly requires: readonly ServiceDefinition[];
	/** The services it provides. */
	readonly provides: readonly ServiceDefinition[];
	/** The services it calls when a loaded mechanic provides them. */
	readonly uses: readonly ServiceDefinition[];
}

/**
 * A {@link MechanicShape} built from the parts of a head. `O` is the value of the options, not their schema: a head
 * turns its schemas into values once, so the contexts never do it for a schema that is still being inferred.
 *
 * @public
 */
export interface Shape<O, S, E extends EventSchemas, P extends PromptKeys, R extends readonly ServiceDefinition[], Pv extends readonly ServiceDefinition[], U extends readonly ServiceDefinition[] = []>
	extends MechanicShape {
	/** The options as the mechanic reads them: parsed, with defaults filled. */
	readonly options: O;
	/** The state of one run. */
	readonly state: S;
	/** The events the mechanic declares. */
	readonly events: E;
	/** The prompts the mechanic declares. */
	readonly prompts: P;
	/** The services it needs. */
	readonly requires: R;
	/** The services it provides. */
	readonly provides: Pv;
	/** The services it calls when a loaded mechanic provides them. */
	readonly uses: U;
}

/**
 * Read access to the residents: the actors of kind `resident`, under their bare ids.
 *
 * @public
 */
export interface ResidentsView {
	/** Every resident of the run, in the game's order. */
	readonly ids: readonly string[];
	/** Says whether the id is a resident of the run. */
	has(id: string): boolean;
	/** False while any mechanic holds a suspension of the resident. */
	mayAct(id: string): boolean;
}

/**
 * The residents as a mechanic may change them: its own suspensions.
 *
 * @public
 */
export interface ResidentsPort extends ResidentsView {
	/** Suspends the resident and writes `actor_suspended`; a second call of the same mechanic does nothing. */
	suspend(id: string, reason: string): void;
	/** Lifts this mechanic's suspension only. */
	resume(id: string): void;
}

/**
 * A tool as a mechanic names it for a lock: its own tool by the bare name, or a reference to a tool.
 *
 * @public
 */
export type ToolName = string | ToolRef;

/**
 * Locks on tools, per resident. Grants say what a resident may use; locks close single tools for single residents.
 *
 * @public
 */
export interface ResidentAccess {
	/** Locks the tool for the resident; writes `tool_locked` when it changes something. */
	lock(resident: string, tool: ToolName): void;
	/** Lifts the lock; writes `tool_unlocked` when it changes something. */
	unlock(resident: string, tool: ToolName): void;
	/** Says whether the tool is locked for the resident. */
	isLocked(resident: string, tool: ToolName): boolean;
	/** True when the tool is granted, not locked, and no lock handler refuses. */
	isOpen(resident: string, tool: ToolName): boolean;
}

/**
 * The read-only view for facts and run limits: no emit, no command.
 *
 * @public
 */
export interface FactView<M extends MechanicShape> {
	/** The options, parsed, with defaults filled. */
	readonly options: M["options"];
	/** The state; it must not be changed, because a fact is pure. */
	readonly state: Readonly<M["state"]>;
	/** The current tick. */
	readonly tick: number;
	/** The residents. */
	readonly residents: ResidentsView;
	/** Calls a `query` of a required service. */
	call<A extends M["requires"][number], K extends QueryMethodName<A>>(service: A, method: K, input: ServiceInput<A, K>): ServiceOutput<A, K>;
	/** Calls a `query` of a used service; undefined when no loaded mechanic provides it. */
	tryCall<A extends M["uses"][number], K extends QueryMethodName<A>>(service: A, method: K, input: ServiceInput<A, K>): ServiceOutput<A, K> | undefined;
}

/**
 * The context of hooks, listeners, jobs, services and pipeline handlers.
 *
 * @public
 */
export interface MechanicContext<M extends MechanicShape> {
	/** The id of the mechanic. */
	readonly mechanic: string;
	/** The seed of the run. */
	readonly seed: number;
	/** The options, parsed, with defaults filled. */
	readonly options: M["options"];
	/** The state of this run. */
	readonly state: M["state"];
	/** The current tick. */
	readonly tick: number;
	/** The ticks the game plays: the last tick is `ticks - 1`. */
	readonly ticks: number;
	/** The residents. */
	readonly residents: ResidentsPort;
	/** Every actor of the run under its actor id (`resident:A01`, `director:host`, `human`), read-only: who exists and who may act. */
	readonly actors: ActorsView;
	/** The clock: a job named in the body's `jobs` runs at the start of a tick. */
	readonly schedule: SchedulePort;
	/** Locks on tools. */
	readonly access: ResidentAccess;
	/** Writes one of the declared events; the payload is checked against its schema (SWT-M021). */
	emit<K extends keyof M["events"] & string>(type: K, payload: Static<M["events"][K]>): void;
	/** Calls a method of a required service; the output is checked against the method's schema (SWT-M022). */
	call<A extends M["requires"][number], K extends ServiceMethodName<A>>(service: A, method: K, input: ServiceInput<A, K>): ServiceOutput<A, K>;
	/** Says whether a loaded mechanic provides the service; always true for a required one. */
	has(service: M["requires"][number] | M["uses"][number]): boolean;
	/** Calls a method of a used service; undefined when no loaded mechanic provides it. */
	tryCall<A extends M["uses"][number], K extends ServiceMethodName<A>>(service: A, method: K, input: ServiceInput<A, K>): ServiceOutput<A, K> | undefined;
	/** Renders one of the mechanic's own prompts. */
	prompt<K extends keyof M["prompts"] & string>(id: K, variables: PromptVariables<M["prompts"][K]>): string;
	/** The seeded random stream of the labels: the same numbers wherever it is called. A property, so it can be destructured. */
	readonly rng: (...labels: readonly RandomLabel[]) => RandomSource;
}

/**
 * The context of a tool: the mechanic context plus who calls.
 *
 * @public
 */
export interface ToolContext<M extends MechanicShape> extends MechanicContext<M> {
	/** Who calls. */
	readonly actor: ActorId;
	/** The bare id of the resident that calls; undefined when the caller is no resident. */
	readonly resident: string | undefined;
}

/**
 * What the state of a fresh run is built from, over the value of the options; a resumed run loads its snapshot instead.
 *
 * @public
 */
export interface Setup<O> {
	/** The options, parsed, with defaults filled. */
	readonly options: O;
	/** Every resident of the run, in the game's order. */
	readonly residents: readonly string[];
	/** Every actor of the run under its actor id, in the definition's order: the residents, then the Directors, then the human. */
	readonly actors: readonly ActorId[];
	/** The seed of the run. */
	readonly seed: number;
	/** The seeded random stream of the labels, as `ctx.rng`. A property, so it can be destructured. */
	readonly rng: (...labels: readonly RandomLabel[]) => RandomSource;
}

/**
 * The {@link Setup} of a mechanic whose options have the schema `O`: what `start` and `snapshot.load` of a head get.
 *
 * @public
 */
export type StateSetup<O extends TSchema> = Setup<Static<O>>;
