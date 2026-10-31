/**
 * The mechanic API: what `defineMechanic(head, build)` takes and what it returns. The head is plain
 * data (id, requires, options, state, events, prompts); `build(kit)` runs once per run and returns
 * the body (tools, services, listeners, facts, hooks, pipeline handlers, limits, jobs, snapshot).
 * Everything the host holds is the erased form below; the generics live only in the author's code.
 */
import type { Static, TSchema } from "typebox";
import type { ApiDefinition, ApiImplementation, ProvidedApi } from "./api.ts";
import type { FactView, MechanicContext, MechanicPort, MechanicShape, StateSetup, ToolContext } from "./context.ts";
import type { CORE_EVENTS, EventEnvelope, EventSchemas } from "./events.ts";
import type { Refusal, ToolCall, ToolLimit, ToolOutcome, ToolSuccess } from "./tools.ts";
import type { Actor, GrantRole, JsonValue, PromptKeys, ResidentId } from "./values.ts";

/** Prompt ids without variables (what a tool description must be). */
export type PlainPromptId<P extends PromptKeys> = { [K in keyof P]: P[K] extends readonly [] ? K : never }[keyof P] & string;

/** The static part of a mechanic. */
export interface MechanicHead<
	Id extends string,
	O extends TSchema,
	S,
	E extends EventSchemas,
	P extends PromptKeys,
	R extends readonly ApiDefinition[],
	Pv extends readonly ApiDefinition[],
> {
	readonly id: Id;
	/** One line for `swt module show`. */
	readonly summary: string;
	/** APIs this mechanic calls; it loads after their providers. */
	readonly requires?: R;
	/** APIs this mechanic implements (`kit.provide` in the body). */
	readonly provides?: Pv;
	/** Typebox schema of the options (`Type.Object({})` for none); every property carries a `description` (conformance). */
	readonly options: O;
	/** The initial state of a fresh run; a mechanic without state returns `undefined`. */
	readonly state: (setup: StateSetup<O>) => S;
	/** Event type to payload schema (`{}` for none). */
	readonly events: E;
	readonly prompts?: P;
}

/** A tool as its author writes it. */
export interface ToolDefinition<M extends MechanicShape, N extends string, P extends TSchema> {
	readonly name: N;
	/** A prompt id of this mechanic, without variables. */
	readonly description: PlainPromptId<M["prompts"]>;
	readonly parameters: P;
	/** The mechanic's own limit (stage `limit`); a story can add a tighter one. */
	readonly limit?: ToolLimit;
	/** The roles the mechanic suggests; only the story's `grants` decide. */
	readonly suggest?: readonly GrantRole[];
	/** The tool's own program-checkable rule (stage `rule`). */
	rule?(params: Static<P>, ctx: ToolContext<M>): Refusal | undefined;
	/** The text a story guard checks (stage `guard`); without it a guard does not apply. */
	guardText?(params: Static<P>): string | undefined;
	/** Synchronous; emits events and returns the reply. A refusal here is reported at stage `execute`. */
	execute(params: Static<P>, ctx: ToolContext<M>): ToolOutcome;
}

/** A tool after its arguments were checked, bound to one call. */
export interface PreparedCall {
	readonly params: unknown;
	rule(): Refusal | undefined;
	guardText(): string | undefined;
	execute(): ToolOutcome;
}

/** A tool with its types erased, as the host holds it. */
export interface MechanicTool<N extends string = string> {
	readonly name: N;
	readonly description: string;
	readonly parameters: TSchema;
	readonly limit: ToolLimit | undefined;
	readonly suggest: readonly GrantRole[];
	/** Undefined when the arguments do not match the schema. */
	prepare(raw: unknown, actor: Actor, resident: ResidentId | undefined): PreparedCall | undefined;
}

export interface EventListener {
	readonly source: string;
	readonly type: string;
	handle(event: EventEnvelope): void;
}

/** A pure function over state and log, for the gamemaker's situation report and the watch role. */
export interface MechanicFact {
	readonly output: TSchema;
	compute(): unknown;
}

/** A limit the mechanic registers with the referee; `check` returns the reason when it is breached. */
export interface RunLimit {
	readonly id: string;
	readonly summary: string;
	check(): string | undefined;
}

/** A mechanic's slice of the snapshot, with a version and migrations from older versions. */
export interface SnapshotDefinition<M extends MechanicShape, Snap extends TSchema> {
	readonly version: number;
	readonly schema: Snap;
	save(state: M["state"]): Static<Snap>;
	load(data: Static<Snap>, setup: StateSetup<M["options"]>): M["state"];
	/** `migrations[v]` turns a version-`v` slice into version `v + 1`. */
	readonly migrations?: Readonly<Record<number, (data: unknown) => unknown>>;
}

export interface SnapshotSlice {
	readonly version: number;
	save(): unknown;
	/** Migrates from `version`, checks the schema and replaces the state. */
	load(data: unknown, version: number): void;
}

type ListenerOf<M extends MechanicShape, D extends MechanicDefinition, K extends keyof D["events"] & string> = (
	payload: Static<D["events"][K]>,
	ctx: MechanicContext<M>,
	event: EventEnvelope<K, Static<D["events"][K]>>,
) => void;

/** Typed constructors, bound to one instance. */
export interface MechanicKit<M extends MechanicShape> {
	tool<const N extends string, P extends TSchema>(definition: ToolDefinition<M, N, P>): MechanicTool<N>;
	provide<A extends M["provides"][number]>(api: A, implementation: ApiImplementation<A, MechanicContext<M>>): ProvidedApi;
	/** Reacts to one of the mechanic's own events. */
	on<K extends keyof M["events"] & string>(
		type: K,
		handler: (payload: Static<M["events"][K]>, ctx: MechanicContext<M>, event: EventEnvelope<K, Static<M["events"][K]>>) => void,
	): EventListener;
	/** Reacts to another mechanic's event without requiring it; silent when that mechanic is not loaded. */
	listen<D extends MechanicDefinition, K extends keyof D["events"] & string>(source: D, type: K, handler: ListenerOf<M, D, K>): EventListener;
	/** Reacts to an event the core writes (`run_started`, `tool_refused`, ...). */
	core<K extends keyof CoreEventSchemas>(type: K, handler: (payload: Static<CoreEventSchemas[K]>, ctx: MechanicContext<M>, event: EventEnvelope) => void): EventListener;
	fact<F extends TSchema>(output: F, compute: (view: FactView<M>) => Static<F>): MechanicFact;
	limit(id: string, summary: string, breached: (view: FactView<M>) => string | undefined): RunLimit;
	snapshot<Snap extends TSchema>(definition: SnapshotDefinition<M, Snap>): SnapshotSlice;
}

type CoreEventSchemas = typeof CORE_EVENTS;

/** Lifecycle hooks, called in load order. */
export interface MechanicHooks<M extends MechanicShape> {
	runStarted?(ctx: MechanicContext<M>): void;
	minuteStarted?(ctx: MechanicContext<M>): void;
	/** Lines for the resident's next turn (notices, inbox). */
	turnInputs?(resident: ResidentId, ctx: MechanicContext<M>): readonly string[];
	turnEnded?(resident: ResidentId, ctx: MechanicContext<M>): void;
	minuteEnded?(ctx: MechanicContext<M>): void;
	runEnded?(reason: string, ctx: MechanicContext<M>): void;
}

/** Handlers a mechanic adds to stages of every tool call (a cost module uses `afford` and `settle`). */
export interface PipelineHandlers<M extends MechanicShape> {
	lock?(call: ToolCall, ctx: MechanicContext<M>): Refusal | undefined;
	afford?(call: ToolCall, ctx: MechanicContext<M>): Refusal | undefined;
	rule?(call: ToolCall, ctx: MechanicContext<M>): Refusal | undefined;
	/** Only after a successful `execute`: charge here. */
	settle?(call: ToolCall, outcome: ToolSuccess, ctx: MechanicContext<M>): void;
	/** After `execute`, also when it refused. */
	after?(call: ToolCall, outcome: ToolOutcome, ctx: MechanicContext<M>): void;
}

export type MechanicJob<M extends MechanicShape> = (ctx: MechanicContext<M>, data: JsonValue | undefined) => void;

/** What `build(kit)` returns. */
export interface MechanicBody<M extends MechanicShape, T extends readonly MechanicTool[]> {
	readonly tools?: T;
	readonly services?: readonly ProvidedApi[];
	readonly listeners?: readonly EventListener[];
	readonly facts?: Readonly<Record<string, MechanicFact>>;
	readonly hooks?: MechanicHooks<M>;
	readonly pipeline?: PipelineHandlers<M>;
	readonly limits?: readonly RunLimit[];
	readonly jobs?: Readonly<Record<string, MechanicJob<M>>>;
	/** Required when the initial state is not `undefined`. */
	readonly snapshot?: SnapshotSlice;
}

/** Hooks and handlers of one instance, bound to its context. */
export interface InstanceHooks {
	runStarted(): void;
	minuteStarted(): void;
	turnInputs(resident: ResidentId): readonly string[];
	turnEnded(resident: ResidentId): void;
	minuteEnded(): void;
	runEnded(reason: string): void;
	lock(call: ToolCall): Refusal | undefined;
	afford(call: ToolCall): Refusal | undefined;
	rule(call: ToolCall): Refusal | undefined;
	settle(call: ToolCall, outcome: ToolSuccess): void;
	after(call: ToolCall, outcome: ToolOutcome): void;
}

/** One mechanic in one run, with every type erased. */
export interface MechanicInstance {
	readonly tools: readonly MechanicTool[];
	readonly services: readonly ProvidedApi[];
	readonly listeners: readonly EventListener[];
	readonly facts: Readonly<Record<string, MechanicFact>>;
	readonly hooks: InstanceHooks;
	readonly limits: readonly RunLimit[];
	readonly jobs: readonly string[];
	runJob(job: string, data: JsonValue | undefined): void;
	readonly stateful: boolean;
	readonly snapshot: SnapshotSlice | undefined;
}

/** The input type of `with()`: every option of the outer object may be left out and is filled from its default at load. */
export type OptionsInput<O extends TSchema> = Partial<Static<O>>;

/** A finished mechanic. `Tools` and `O` exist for typing stories; the host uses the erased members. */
export interface MechanicDefinition<Id extends string = string, O extends TSchema = TSchema, E extends EventSchemas = EventSchemas, Tools extends string = string> {
	readonly id: Id;
	readonly summary: string;
	readonly requires: readonly ApiDefinition[];
	readonly provides: readonly ApiDefinition[];
	readonly options: O;
	readonly events: E;
	readonly prompts: PromptKeys;
	/** Phantom, never set: the names of the mechanic's tools. */
	readonly toolNames?: Tools;
	/** Fills defaults and checks the options; throws with the mechanic's id on a bad value. */
	parseOptions(raw: unknown): Static<O>;
	instantiate(port: MechanicPort, options: unknown): MechanicInstance;
	/** The mechanic with options, for a story's `mechanics` list. */
	with(options?: OptionsInput<O>): MechanicUse<this>;
}

export interface MechanicUse<D extends MechanicDefinition = MechanicDefinition> {
	readonly mechanic: D;
	readonly options: unknown;
}
