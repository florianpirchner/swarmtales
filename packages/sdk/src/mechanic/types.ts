// SPDX-License-Identifier: Apache-2.0
/**
 * The mechanic types: what `defineHead(head)` and `defineMechanic(head, body)` take and what they return. The head
 * declares everything that is data: id, package, services, options, the state schema, events, prompts and the tools
 * (description, parameters, grants). The body holds handlers only, keyed by the names the head declared. The type of
 * a mechanic follows from its head alone, so a helper outside the body takes `CtxOf<typeof head>`.
 */
import type { Static, TObject, TSchema } from "typebox";
import type { ActorId, CanonicalTool, Envelope, EventSchemas, EventsDefinition, InputLine, Listener, JsonValue, Ordered, PromptLookup, RandomSource, Refusal, ResolvedPlugin, ServiceDefinition, ToolOutcome } from "@swarmtales/contracts";
import type { MechanicUse } from "../game/types.ts";
import type { FactView, MechanicContext, MechanicShape, PromptKeys, ServiceImplementation, Setup, Shape, StateSetup, ToolContext } from "./context-types.ts";

/**
 * The empty set of a keyed part (events, prompts, tools) that a head leaves out: a record without a string key. It is
 * written with a symbol index and not as `{}`, because every value fits `{}`.
 *
 * @public
 */
export type None = Readonly<Record<symbol, never>>;

/**
 * The options schema of a head that declares none.
 *
 * @public
 */
export type NoOptions = TObject<None>;

/**
 * The parameter schemas of the tools a head declares, by tool name.
 *
 * @public
 */
export type ToolParams = Readonly<Record<string, TSchema>>;

/**
 * The state a mechanic holds: its custom state `C` when the head's `snapshot` gives one, else the value of the state schema.
 *
 * @public
 */
export type StateOf<Snap extends TSchema, C> = [C] extends [never] ? Static<Snap> : C;

/**
 * A tool as the head declares it: data only. Its bare name is its key in the head's `tools`.
 *
 * @public
 */
export interface ToolDeclaration<Params extends TSchema = TSchema> {
	/** A prompt id when it equals a key of the head's `prompts` (a prompt without variables), else the text itself. */
	readonly description: string;
	/** The schema of the arguments. */
	readonly params: Params;
	/** The grant names that get the tool when the game lists no grants: `["resident"]`. */
	readonly for?: readonly string[];
	/** True for a read-only look: no step is counted and its answer wakes nobody. */
	readonly free?: boolean;
}

/**
 * How a state that is not plain JSON (maps, sets, classes) is saved into its slice and loaded from it.
 *
 * @public
 */
export interface SnapshotSpec<S, Data, O> {
	/** Turns the state into the data of the state schema. */
	save(state: S): Data;
	/** Builds the state from saved data. */
	load(data: Data, setup: Setup<O>): S;
}

/**
 * The static part of a mechanic: plain data plus the pure functions `start` and `snapshot`.
 *
 * @public
 */
export interface MechanicHead<
	Id extends string,
	O extends TSchema,
	Snap extends TSchema,
	C,
	E extends EventSchemas,
	P extends PromptKeys,
	R extends readonly ServiceDefinition[],
	Pv extends readonly ServiceDefinition[],
	U extends readonly ServiceDefinition[],
	TP extends ToolParams,
> {
	/** The id of the mechanic, unique in a game: `grid-game`. */
	readonly id: Id;
	/** The npm name of the package that holds the mechanic; conformance checks it against `package.json`. */
	readonly package: string;
	/** What the mechanic does, in one line. */
	readonly summary: string;
	/** The schema of the options; every property carries a `description`. Left out: no options. */
	readonly options?: O;
	/** The schema of the state and of its snapshot slice. Left out: no state. */
	readonly state?: Snap;
	/**
	 * Only for a state that is not plain JSON: how it is saved and loaded. Left out: the state is its own slice. The
	 * type of the custom state is read from the parameter of `save`, so write it there: `save: (state: GateState) => ...`.
	 * A return type on `load` or `start` alone does not name it. It needs `state` (the schema of the saved form) and
	 * `start` beside it; a head without them is refused when the mechanic is defined (SWT-M014).
	 */
	readonly snapshot?: SnapshotSpec<C, Static<Snap>, Static<O>>;
	/** The version of the slice; 1 when left out. */
	readonly version?: number;
	/** `migrations[v]` turns a slice of version `v` into version `v + 1`. */
	readonly migrations?: Readonly<Record<number, (data: unknown) => unknown>>;
	/** Builds the state of a fresh run. Required when the head has `state` (SWT-M014); the types cannot say so. */
	start?(setup: StateSetup<O>): NoInfer<StateOf<Snap, C>>;
	/** Event type to payload schema. */
	readonly events?: E;
	/** Event type to the grant names that may read it; absent: everyone. */
	readonly audiences?: Partial<Readonly<Record<keyof E & string, readonly string[]>>>;
	/** Prompt id to the names of its variables. */
	readonly prompts?: P;
	/** The services it calls; it loads after their providers, and a game without one does not load. */
	readonly requires?: R;
	/** The services it implements (the body's `services`). */
	readonly provides?: Pv;
	/** The services it calls when a loaded mechanic provides them (`ctx.has`, `ctx.tryCall`). */
	readonly uses?: U;
	/** The tools, by bare name, in the order a caller sees them; the body's `tools` holds their handlers. */
	readonly tools?: { readonly [K in keyof TP]: ToolDeclaration<TP[K]> };
}

/**
 * Any head: the bound of a type parameter that takes `typeof head`.
 *
 * @public
 */
export type AnyHead = MechanicHead<string, TSchema, TSchema, unknown, EventSchemas, PromptKeys, readonly ServiceDefinition[], readonly ServiceDefinition[], readonly ServiceDefinition[], ToolParams>;

/**
 * The shape of the mechanic with head `H`: its schemas turned into values once.
 *
 * @public
 */
export type ShapeOf<H> = H extends MechanicHead<string, infer O, infer Snap, infer C, infer E, infer P, infer R, infer Pv, infer U, ToolParams> ? Shape<Static<O>, StateOf<Snap, C>, E, P, R, Pv, U> : never;

/**
 * The parameter schemas of the tools the head `H` declares, by tool name.
 *
 * @public
 */
export type ToolsOf<H> = H extends MechanicHead<string, TSchema, TSchema, unknown, EventSchemas, PromptKeys, readonly ServiceDefinition[], readonly ServiceDefinition[], readonly ServiceDefinition[], infer TP> ? TP : never;

/**
 * The context of hooks, listeners, jobs, services and pipeline handlers of the mechanic with head `H`.
 *
 * @public
 */
export type CtxOf<H> = MechanicContext<ShapeOf<H>>;

/**
 * The context of the tools of the mechanic with head `H`.
 *
 * @public
 */
export type ToolCtxOf<H> = ToolContext<ShapeOf<H>>;

/**
 * The read-only view of the facts and run limits of the mechanic with head `H`.
 *
 * @public
 */
export type ViewOf<H> = FactView<ShapeOf<H>>;

/**
 * What can be read of a declared tool without running the mechanic.
 *
 * @public
 */
export interface DeclaredTool {
	/** The bare name. */
	readonly name: string;
	/** The description as the author wrote it: a prompt id or the text itself. */
	readonly description: string;
	/** The schema of the arguments. */
	readonly parameters: TSchema;
	/** The grant names that get the tool when the game lists no grants. */
	readonly for: readonly string[];
	/** True for a read-only look. */
	readonly free: boolean;
	/** Whether the body gives the tool a `sample`, so the fake driver can call it. `defineMechanic` sets it; a head alone does not say. */
	readonly sampled?: boolean;
}

/**
 * The static part of a plugin with every type erased: JSON data, no function. It is read without running a handler.
 *
 * @public
 */
export interface PluginHead {
	/** The id of the plugin. */
	readonly id: string;
	/** The npm name of its package. */
	readonly package: string;
	/** What it does, in one line. */
	readonly summary: string;
	/** The schema of the options. */
	readonly options: TSchema;
	/** The schema of the state and of its slice; undefined: no state. */
	readonly state: TSchema | undefined;
	/** The version of the slice. */
	readonly version: number;
	/** Event type to payload schema. */
	readonly events: EventSchemas;
	/** Event type to the grant names that may read it. */
	readonly audiences: Readonly<Record<string, readonly string[]>>;
	/** Prompt id to the names of its variables. */
	readonly prompts: PromptKeys;
	/** The services it needs. */
	readonly requires: readonly ServiceDefinition[];
	/** The services it provides. */
	readonly provides: readonly ServiceDefinition[];
	/** The services it calls when a loaded plugin provides them. */
	readonly uses: readonly ServiceDefinition[];
	/** The tools, in the order a caller sees them. */
	readonly tools: readonly DeclaredTool[];
}

/**
 * The handlers of one declared tool.
 *
 * @public
 */
export interface ToolHandlers<M extends MechanicShape, Params extends TSchema> {
	/** The tool's own rule (stage `rule`), checked before `run`; undefined: the call may run. */
	check?(params: Static<Params>, ctx: ToolContext<M>): Refusal | undefined;
	/** A legal call now, for the fake driver; undefined: none. It must not change state. */
	sample?(ctx: ToolContext<M>, random: RandomSource): (Static<Params> & JsonValue) | undefined;
	/** Runs the call (stage `execute`): emits events and returns the reply, or a refusal. */
	run(params: Static<Params>, ctx: ToolContext<M>): ToolOutcome;
}

/**
 * A hook as a body gives it: a function, one registration with its place, or a list of both.
 *
 * @public
 */
export type HookSlot<F> = F | Ordered<F> | readonly (F | Ordered<F>)[];

/**
 * The lifecycle hooks of a mechanic.
 *
 * @public
 */
export interface MechanicHooks<M extends MechanicShape> {
	/** Runs once, after `run_started`. */
	readonly runStarted?: HookSlot<(ctx: MechanicContext<M>) => void>;
	/** Runs at the start of a tick, after the tick's due jobs. */
	readonly tickStarted?: HookSlot<(ctx: MechanicContext<M>) => void>;
	/** Gives the lines a resident is shown when it is activated: plain, or with a kind the scheduler orders by. */
	readonly turnInputs?: HookSlot<(resident: string, ctx: MechanicContext<M>) => readonly InputLine[]>;
	/** Runs at the end of a tick. */
	readonly tickEnded?: HookSlot<(ctx: MechanicContext<M>) => void>;
	/** Says whether the resident has something new; any mechanic saying yes counts. It must not change state. */
	readonly news?: (resident: string, ctx: MechanicContext<M>) => boolean;
	/** Names the residents that are to act now; at most one loaded mechanic has it (SWT-R013). */
	readonly toAct?: (ctx: MechanicContext<M>) => readonly string[];
}

/**
 * One tool call as a pipeline handler of a mechanic sees it; `params` is raw at `lock` and checked from `rule` on.
 *
 * @public
 */
export interface StageCall {
	/** The bare name of the tool, as its mechanic declared it: `playMove`. */
	readonly tool: string;
	/** The canonical name of the tool. */
	readonly canonical: CanonicalTool;
	/** The id of the mechanic that owns the tool. */
	readonly owner: string;
	/** Who calls. */
	readonly actor: ActorId;
	/** The bare id of the resident that calls; undefined when the caller is no resident. */
	readonly resident: string | undefined;
	/** The arguments. */
	readonly params: unknown;
	/** The seq of the call's `tool_called` event. */
	readonly seq: number;
}

/**
 * The handlers a mechanic adds to the stages of every tool call, its own and other mechanics'.
 *
 * @public
 */
export interface MechanicPipeline<M extends MechanicShape> {
	/** Refuses a call before its arguments are checked. It must not emit. */
	lock?(call: StageCall, ctx: MechanicContext<M>): Refusal | undefined;
	/** Refuses a call whose arguments are checked. */
	rule?(call: StageCall, ctx: MechanicContext<M>): Refusal | undefined;
	/** Sees the result of a call, also when `run` refused. */
	after?(call: StageCall, outcome: ToolOutcome, ctx: MechanicContext<M>): void;
}

/**
 * A job of a mechanic: `ctx.schedule.at` names it, and it gets the data it was scheduled with.
 *
 * @public
 */
export type MechanicJob<M extends MechanicShape> = (ctx: MechanicContext<M>, data: JsonValue | undefined) => void;

/**
 * One fact in the body's `facts`: a pure value over state, for readers outside the run.
 *
 * @public
 */
export interface FactSpec<M extends MechanicShape, F extends TSchema> {
	/** The schema of the value. */
	readonly output: F;
	/** Computes the value. */
	compute(view: FactView<M>): Static<F>;
}

/**
 * One run limit in the body's `limits`; its key is its id, `<mechanic id>.<key>` in the log.
 *
 * @public
 */
export interface LimitSpec<M extends MechanicShape> {
	/** What the limit is, in one line. */
	readonly summary: string;
	/** The reason when the run must end, else undefined. */
	breached(view: FactView<M>): string | undefined;
}

/**
 * Where a listener runs among the listeners of the same event.
 *
 * @public
 */
export interface ListenOptions {
	/** The ids of the mechanics whose listeners run first; an id that is not loaded is ignored. */
	readonly after?: readonly string[];
}

/**
 * The typed constructor the body's `listeners` receives.
 *
 * @public
 */
export interface ListenKit<M extends MechanicShape> {
	/** Reacts to an event of a mechanic (its definition or its `defineEvents`); silent when that mechanic is not loaded. */
	listen<D extends EventsDefinition, K extends keyof D["events"] & string>(
		source: D,
		type: K,
		handler: (payload: Static<D["events"][K]>, ctx: MechanicContext<M>, event: Envelope<K, Static<D["events"][K]>>) => void,
		options?: ListenOptions,
	): Listener;
}

/**
 * The implementations of the services a mechanic provides, keyed by the name of each service.
 *
 * @public
 */
export type ServicesOf<M extends MechanicShape> = {
	readonly [N in M["provides"][number]["name"]]: ServiceImplementation<Extract<M["provides"][number], { readonly name: N }>, MechanicContext<M>>;
};

/**
 * The parts of a body that every mechanic may leave out.
 *
 * @public
 */
export interface BodyParts<M extends MechanicShape, F extends Readonly<Record<string, TSchema>>> {
	/** The listeners on other mechanics' events, built with the kit. */
	readonly listeners?: (kit: ListenKit<M>) => readonly Listener[];
	/** The facts by name; the key in the game is `<mechanic id>.<name>`. */
	readonly facts?: { readonly [K in keyof F]: FactSpec<M, F[K]> };
	/** The run limits by id. */
	readonly limits?: Readonly<Record<string, LimitSpec<M>>>;
	/** The jobs by name. */
	readonly jobs?: Readonly<Record<string, MechanicJob<M>>>;
	/** The lifecycle hooks. */
	readonly hooks?: MechanicHooks<M>;
	/** The handlers for the stages of every tool call. */
	readonly pipeline?: MechanicPipeline<M>;
}

/**
 * `Part` when the head declared something under `Keys`, else nothing: what makes `tools` and `services` required.
 *
 * @public
 */
export type Needs<Keys, Part> = [Keys] extends [never] ? unknown : Part;

/**
 * The body of a mechanic: handlers only. `tools` is required when the head declares tools and holds one entry per
 * tool; `services` is required when the head provides services and holds one entry per service name.
 *
 * @public
 */
export type MechanicBody<M extends MechanicShape, TP extends ToolParams, F extends Readonly<Record<string, TSchema>>> = BodyParts<M, F> &
	Needs<keyof TP & string, { readonly tools: { readonly [K in keyof TP & string]: ToolHandlers<M, TP[K]> } }> &
	Needs<M["provides"][number]["name"], { readonly services: ServicesOf<M> }>;

/**
 * The options a game passes to a mechanic: every option may be left out and is filled from its default at load.
 *
 * @public
 */
export type OptionsInput<O extends TSchema> = Partial<Static<O>>;

/**
 * A finished mechanic. Calling it gives the use for a game's `mechanics` list: `gridGame({ size: 4 })`.
 *
 * @public
 */
export interface MechanicDefinition<Id extends string = string, O extends TSchema = TSchema, E extends EventSchemas = EventSchemas, Tools extends string = string> {
	/** The mechanic with options, for a game's `mechanics` list. */
	(options?: OptionsInput<O>): MechanicUse<MechanicDefinition<Id, O, E, Tools>>;
	/** The id of the mechanic. */
	readonly id: Id;
	/** The npm name of its package. */
	readonly package: string;
	/** The envelope source of its events: `<package>/<id>`. */
	readonly source: string;
	/** The schema of the options. */
	readonly options: O;
	/** The events it declares; with `id` this makes the definition a source for `listen`. */
	readonly events: E;
	/** The erased head: everything that can be read without running a handler, the tools included. */
	readonly head: PluginHead;
	/** Phantom, never set: the bare names of the mechanic's tools. */
	readonly toolNames?: Tools;
	/** Fills defaults and checks the options; throws an `SwtError` (SWT-G020) on a bad value. */
	parseOptions(raw: unknown): Static<O>;
	/** Binds parsed options and the texts and returns the plugin the kernel loads. */
	resolve(options: Static<O>, texts: PromptLookup, version: string): ResolvedPlugin;
}

/**
 * The definition `defineMechanic` returns for the head `H`.
 *
 * @public
 */
export type DefinitionOf<H> =
	H extends MechanicHead<infer Id, infer O, TSchema, unknown, infer E, PromptKeys, readonly ServiceDefinition[], readonly ServiceDefinition[], readonly ServiceDefinition[], infer TP>
		? MechanicDefinition<Id, O, E, keyof TP & string>
		: never;
