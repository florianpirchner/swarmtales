// SPDX-License-Identifier: Apache-2.0
/**
 * The interfaces between the kernel's files, fixed first so that the files are built in parallel and tested
 * against hand-written fakes of their neighbours. Type-only: every factory checks itself against `PartFactories`,
 * and `kernel.ts` joins the factories.
 *
 * Who turns a throw of plugin code into `SWT-R003` (`guarded` in `errors.ts`): the loader, for every function it
 * hands on without its owner (the hooks and stage handlers of `Loaded`, the listeners it gives the log, the
 * plugin's `create`); the caller, wherever it reaches into an instance or a tool itself and so knows the owner
 * (a tool's `prepare`, `rule` and `execute`, a job, `news`, `toAct`, a limit, a fact, a slice).
 */
import type { AccessPort, ActorId, ActorSpec, ActorsPort, ActorsView, CanonicalTool, Envelope, EventSink, Job, JsonValue, KernelDefinition, KernelSnapshot, KernelTool, LogView, PluginHooks, PluginInstance, PluginPort, ProvidedService, ResolvedPlugin, RunEnd, RunLimit, SchedulerPort, SnapshotSlice, StageHandlers, Submission, ToolOutcome, ToolSpec } from "@swarmtales/contracts";

/** Who acts and what caused the code that runs. An event takes `actor`, `causedBy` and `tool` from the top frame. */
export interface Frame {
	readonly actor: ActorId;
	readonly causedBy?: number;
	readonly tool?: CanonicalTool;
}

/** Part 1: the append-only log with its frames, listeners and sinks. */
export interface Log extends LogView {
	/** Appends an event in the top frame. `audience` wins over the default of `audienceOf`; the field is written only when one is set. */
	emit(source: string, type: string, payload: unknown, extra?: { readonly basis?: number; readonly audience?: readonly string[] }): Envelope;
	/** Runs code in a frame. The events are delivered to the listeners, then to the sinks, when the outermost frame returns. */
	run<T>(frame: Frame, code: () => T): T;
	/** The top frame; `{ actor: "kernel" }` outside any. */
	frame(): Frame;
	/** Adds a listener; `source` as in the envelope. Listeners of one event run in the order they were added, so the loader adds them in the final order. */
	listen(source: string, type: string, run: (event: Envelope) => void): void;
	/** Adds a sink. A sink that throws is `SWT-R020`. */
	addSink(sink: EventSink): void;
	/** Ends the log after a failure: listeners off, the queue goes to the sinks, `last` writes the closing event, then every `emit` throws. */
	fail(last: () => void): void;
}

/** Part 3: the actors of the run and their suspensions. */
export interface Actors extends ActorsView {
	spec(id: ActorId): ActorSpec | undefined;
	/** The port of one plugin: its suspensions are held under its id. */
	portFor(pluginId: string): ActorsPort;
	/** The suspensions: actor id to plugin ids; an actor without one is left out. */
	state(): Readonly<Record<string, readonly string[]>>;
	restore(state: Readonly<Record<string, readonly string[]>>): void;
}

/** Part 4: grants and locks. */
export interface Access {
	granted(grant: string, tool: CanonicalTool): boolean;
	/** The tools of a grant, in the order a caller sees them; empty for an unknown grant. */
	grantsOf(grant: string): readonly CanonicalTool[];
	isLocked(actor: ActorId, tool: CanonicalTool): boolean;
	/** Sets the answer to "no lock handler refuses", given by dispatch; `isOpen` and `open` of the ports ask it. */
	setProbe(probe: (actor: ActorId, tool: CanonicalTool) => boolean): void;
	portFor(pluginId: string): AccessPort;
	/** The locks: actor id to canonical tools, sorted; an actor without one is left out. */
	state(): Readonly<Record<string, readonly string[]>>;
	restore(state: Readonly<Record<string, readonly string[]>>): void;
}

/** Part 4: the step counter of one tick. */
export interface Steps {
	/** Counts one step of the actor; false when it is over the limit. An actor that is not counted is never over. */
	step(actor: ActorId): boolean;
	/** Resets every counter. */
	tickStarted(): void;
}

/** Part 5: the providers of the services. */
export interface Services {
	provide(pluginId: string, service: ProvidedService): void;
	/** Whether a provider is registered now. `PluginPort.has` is known from the start and reads `ResolvedPlugin.provides`. */
	has(service: string): boolean;
	/** Calls a method for the plugin `caller`: a command writes `service_called` and runs in a nested frame, a query writes nothing. */
	call(caller: string, service: string, method: string, input: unknown): unknown;
}

/** Part 6: the tick and the job queue. */
export interface Clock {
	readonly tick: number;
	advance(): void;
	/** Queues a job of the plugin `owner`; a tick in the past is refused. */
	at(owner: string, tick: number, job: string, data?: JsonValue): void;
	/** Removes and returns the jobs due at `tick`, in the order they were scheduled. */
	take(tick: number): readonly Job[];
	state(): readonly Job[];
	restore(tick: number, jobs: readonly Job[]): void;
}

/** A tool as loaded: its canonical name, the id of the plugin that owns it, and the tool. */
export interface LoadedTool {
	readonly canonical: CanonicalTool;
	readonly owner: string;
	readonly tool: KernelTool;
}

/** The hooks that have an order across plugins. `news` and `toAct` are read from the instances, in load order. */
export type OrderedHook = "runStarted" | "tickStarted" | "inputs" | "tickEnded";

/** Part 5: what loading the plugins gives. */
export interface Loaded {
	/** The plugin ids in load order. */
	readonly order: readonly string[];
	readonly instances: ReadonlyMap<string, PluginInstance>;
	readonly tools: ReadonlyMap<CanonicalTool, LoadedTool>;
	/** One shown name may stand for tools of different grants. */
	readonly byShownName: ReadonlyMap<string, readonly LoadedTool[]>;
	/** The registrations of one hook, in the final order (load order plus `after`). */
	hooks<K extends OrderedHook>(hook: K): readonly { readonly plugin: string; readonly run: NonNullable<PluginHooks[K]>[number]["run"] }[];
	/** The handlers of one stage, in load order. */
	stages<K extends keyof StageHandlers>(stage: K): readonly NonNullable<StageHandlers[K]>[];
	/** The run limits in load order; `id` is `<plugin id>.<limit id>`. */
	readonly limits: readonly { readonly id: string; readonly limit: RunLimit }[];
}

/** Part 4: the lane and the pipeline of a tool call. */
export interface Dispatch {
	/** Runs one call after the calls before it. A throw breaks the lane, is told to `DispatchParts.fail` and rejects the promise. */
	submit(call: Submission): Promise<ToolOutcome>;
	/** Whether the actor's last call was a free look or a success that ended its activation. */
	quietEnd(actor: ActorId): boolean;
	/** The seq of the `tool_result` or `tool_refused` of the actor's last finished call: the `basis` of its next call in the same activation. */
	answerSeq(actor: ActorId): number | undefined;
	readonly broken: boolean;
}

/** The assembly: the start, the tick sequence, the end and the failure of a run. */
export interface Lifecycle {
	start(): void;
	beginTick(): Promise<void>;
	endTick(idle: boolean): Promise<RunEnd | undefined>;
	/** A run limit is reached or the run failed. Reading it checks the run limits; a breach, once seen, stays for the tick. */
	readonly halted: boolean;
	/** Writes `run_ended { reason: "error" }` as the last event and closes the sinks. Only the first call does anything. */
	fail(error: unknown): void;
}

/** What `loadPlugins` gets beside the definition. */
export interface LoaderParts {
	readonly log: Log;
	readonly actors: Actors;
	readonly access: Access;
	readonly services: Services;
	readonly clock: Clock;
}

/** What `portFor` builds one plugin's port from. */
export interface PluginPortParts extends LoaderParts {
	readonly definition: KernelDefinition;
	/** Whether the plugin's instance has the job; asked when a job is scheduled, so after `create` returned. */
	hasJob(pluginId: string, job: string): boolean;
}

/** What `createDispatch` gets. The grant of an actor is `actors.spec(id)?.grant`. */
export interface DispatchParts {
	readonly definition: KernelDefinition;
	readonly log: Log;
	readonly actors: Actors;
	readonly access: Access;
	readonly steps: Steps;
	readonly loaded: Loaded;
	/** Told once, when code of a call throws. */
	fail(error: unknown): void;
}

/** What `createLifecycle` gets. */
export interface LifecycleParts {
	readonly definition: KernelDefinition;
	readonly log: Log;
	readonly clock: Clock;
	readonly steps: Steps;
	readonly loaded: Loaded;
	/** The sinks, to close them at the end; they are added to the log by the assembly. */
	readonly sinks: readonly EventSink[];
}

/** What `createSchedulerPort` gets beside the lifecycle. */
export interface SchedulerPortParts {
	readonly definition: KernelDefinition;
	readonly log: Log;
	readonly actors: Actors;
	readonly clock: Clock;
	readonly loaded: Loaded;
	readonly dispatch: Dispatch;
	/** Every granted tool of a grant, locked or not, under its shown name, in grant order (`Kernel.toolSpecs`). */
	toolSpecs(grant: string): readonly ToolSpec[];
}

/** What `saveKernel` and `restoreKernel` read and restore. */
export interface SliceParts {
	readonly definition: KernelDefinition;
	readonly log: Log;
	readonly actors: Actors;
	readonly access: Access;
	readonly clock: Clock;
	readonly loaded: Loaded;
	/** The slice of the scheduler's instance, when it keeps state. */
	readonly scheduler: SnapshotSlice | undefined;
}

/** A registration that `ordered` places: its plugin and the plugin ids it runs after. */
export interface Placed {
	readonly plugin: string;
	readonly after?: readonly string[];
}

/** The factory of every file, with its exact signature. A file checks its export with `satisfies PartFactories["<name>"]`. */
export interface PartFactories {
	/** `log.ts`. `prefix` is the log of a resumed run; it is not delivered again. */
	createLog(tick: () => number, audienceOf: (source: string, type: string) => readonly string[] | undefined, prefix?: readonly Envelope[]): Log;
	/** `actors.ts`. */
	createActors(specs: readonly ActorSpec[], log: Log): Actors;
	/** `access.ts`. Reads `grants` and `startLocks`; writes no event for a start lock. */
	createAccess(definition: KernelDefinition, actors: Actors, log: Log): Access;
	/** `steps.ts`. `max` is `limits.maxCallsPerTick`; `counted` are the ids of `definition.actors`. */
	createSteps(max: number | undefined, counted: readonly ActorId[]): Steps;
	/** `services.ts`. */
	createServices(log: Log): Services;
	/** `clock.ts`. */
	createClock(): Clock;
	/** `dispatch.ts`. Gives `access` its probe. */
	createDispatch(parts: DispatchParts): Dispatch;
	/** `plugin-port.ts`. */
	portFor(plugin: ResolvedPlugin, parts: PluginPortParts): PluginPort;
	/** `loader.ts`. Creates the instances, registers services and listeners, and makes the checks of loading. */
	loadPlugins(definition: KernelDefinition, parts: LoaderParts): Loaded;
	/** `order.ts`. Load order plus `after`, stable; an `after` id without an entry is ignored; a cycle is `SWT-R016`. */
	ordered<T extends Placed>(entries: readonly T[]): readonly T[];
	/** `ports.ts`. */
	createSchedulerPort(parts: SchedulerPortParts, life: Lifecycle): SchedulerPort;
	/** `lifecycle.ts`. */
	createLifecycle(parts: LifecycleParts): Lifecycle;
	/** `slices.ts`. */
	saveKernel(parts: SliceParts, tick: number, ended: RunEnd | undefined): KernelSnapshot;
	/** `slices.ts`. The snapshot is parsed already; one that does not fit the definition or the log is `SWT-R002`. */
	restoreKernel(parts: SliceParts, snapshot: KernelSnapshot): void;
}
