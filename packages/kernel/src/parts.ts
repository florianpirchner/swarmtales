// SPDX-License-Identifier: Apache-2.0
/**
 * The types between the kernel's files. A part is what its factory returns, so its type is derived from the
 * factory and documented there; a test fakes a neighbour against that type. What a factory gets of the other parts
 * is a choice of fields of `Parts`, the one bag that `kernel.ts` fills.
 *
 * Who turns a throw of plugin code into `SWT-R003` (`guarded` in `errors.ts`): the loader, for every function it
 * hands on without its owner (the hooks and stage handlers of `Loaded`, the listeners it gives the log, the
 * plugin's `create`); the caller, wherever it reaches into an instance or a tool itself and so knows the owner
 * (a tool's `prepare`, `rule` and `execute`, a job, `news`, `toAct`, a limit, a fact, a slice).
 */
import type { ActorId, CanonicalTool, EventSink, KernelDefinition, KernelTool, RunEnd, SnapshotSlice, ToolSpec } from "@swarmtales/contracts";
import type { createAccess } from "./access.ts";
import type { createActors } from "./actors.ts";
import type { createClock } from "./clock.ts";
import type { createDispatch } from "./dispatch.ts";
import type { loadPlugins } from "./loader.ts";
import type { createLog } from "./log.ts";
import type { createServices } from "./services.ts";
import type { createSteps } from "./steps.ts";

/** Who acts and what caused the code that runs. An event takes `actor`, `causedBy` and `tool` from the top frame. */
export interface Frame {
	readonly actor: ActorId;
	readonly causedBy?: number;
	readonly tool?: CanonicalTool;
}

/** Part 1: the append-only log with its frames, listeners and sinks (`log.ts`). */
export type Log = ReturnType<typeof createLog>;
/** Part 3: the actors of the run and their suspensions (`actors.ts`). */
export type Actors = ReturnType<typeof createActors>;
/** Part 4: grants and locks (`access.ts`). */
export type Access = ReturnType<typeof createAccess>;
/** Part 4: the step counter of one tick (`steps.ts`). */
export type Steps = ReturnType<typeof createSteps>;
/** Part 5: the providers of the services (`services.ts`). */
export type Services = ReturnType<typeof createServices>;
/** Part 6: the tick and the job queue (`clock.ts`). */
export type Clock = ReturnType<typeof createClock>;
/** Part 5: what loading the plugins gives (`loader.ts`). */
export type Loaded = ReturnType<typeof loadPlugins>;
/** Part 4: the lane and the pipeline of a tool call (`dispatch.ts`). */
export type Dispatch = ReturnType<typeof createDispatch>;

/** A tool as loaded: its canonical name, the id of the plugin that owns it, and the tool. */
export interface LoadedTool {
	readonly canonical: CanonicalTool;
	readonly owner: string;
	readonly tool: KernelTool;
}

/** The hooks that have an order across plugins. `news` and `toAct` are read from the instances, in load order. */
export type OrderedHook = "runStarted" | "tickStarted" | "inputs" | "activationOpened" | "activationClosed" | "tickEnded";

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

/** A registration that `ordered` places: its plugin and the plugin ids it runs after. */
export interface Placed {
	readonly plugin: string;
	readonly after?: readonly string[];
}

/** Everything the factories get of each other. `kernel.ts` fills it; a factory names the fields it takes. */
export interface Parts {
	readonly definition: KernelDefinition;
	readonly log: Log;
	readonly actors: Actors;
	readonly access: Access;
	readonly services: Services;
	readonly clock: Clock;
	readonly steps: Steps;
	readonly loaded: Loaded;
	readonly dispatch: Dispatch;
	/** The sinks, to close them at the end; they are added to the log by the assembly. */
	readonly sinks: readonly EventSink[];
	/** The slice of the scheduler's instance, when it keeps state. */
	readonly scheduler: SnapshotSlice | undefined;
	/** Whether the plugin's instance has the job; asked when a job is scheduled, so after `create` returned. */
	hasJob(pluginId: string, job: string): boolean;
	/** Told when code of a call throws; answers the first failure of the run, which is this one unless the run had failed before. */
	fail(error: unknown): unknown;
	/** Every granted tool of a grant, locked or not, under its shown name, in grant order (`Kernel.toolSpecs`). */
	toolSpecs(grant: string): readonly ToolSpec[];
}

/** What `loadPlugins` gets beside the definition. */
export type LoaderParts = Pick<Parts, "log" | "actors" | "access" | "services" | "clock">;
/** What `portFor` builds one plugin's port from. */
export type PluginPortParts = LoaderParts & Pick<Parts, "definition" | "hasJob">;
/** What `createDispatch` gets. The grant of an actor is `actors.spec(id)?.grant`. */
export type DispatchParts = Pick<Parts, "definition" | "log" | "actors" | "access" | "steps" | "loaded" | "fail">;
/** What `createLifecycle` gets. */
export type LifecycleParts = Pick<Parts, "definition" | "log" | "clock" | "steps" | "loaded" | "sinks">;
/** What `createSchedulerPort` gets beside the lifecycle. */
export type SchedulerPortParts = Pick<Parts, "definition" | "log" | "actors" | "clock" | "loaded" | "dispatch" | "toolSpecs">;
/** What `saveKernel` and `restoreKernel` read and restore. */
export type SliceParts = Pick<Parts, "definition" | "log" | "actors" | "access" | "clock" | "loaded" | "scheduler">;
