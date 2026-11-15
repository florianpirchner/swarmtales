// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The kernel definition, the kernel itself and its snapshot, as types. The snapshot schema lives in `state.ts`. */
import type { JsonValue, RandomSource, RunEnd } from "../values.ts";
import type { ActorId, ActorSpec } from "./actor.ts";
import type { Envelope } from "./envelope.ts";
import type { EventSchemas } from "./event-def.ts";
import type { LogView, ResolvedPlugin, RunLimit } from "./plugin.ts";
import type { DriverTable, EventSink, ReviewPort, SchedulerDefinition } from "./ports.ts";
import type { CanonicalTool, ToolOutcome, ToolSpec } from "./tool.ts";

/**
 * The saved state of one plugin or of the scheduler.
 *
 * @public
 */
export interface SliceData {
	/** The version of the saved form. */
	readonly version: number;
	/** The state, as its owner saved it. */
	readonly data: unknown;
}

/**
 * A scheduled job of a plugin.
 *
 * @public
 */
export interface Job {
	/** The number of the job, in the order of scheduling. */
	readonly id: number;
	/** The id of the plugin that owns it. */
	readonly owner: string;
	/** The name of the job in its plugin. */
	readonly job: string;
	/** The tick it runs at. */
	readonly next: number;
	/** The data it was scheduled with. */
	readonly data?: JsonValue;
}

/**
 * The state of a kernel between two ticks. It holds no step counter and no open activation.
 *
 * @public
 */
export interface KernelSnapshot {
	/** The format name. */
	readonly format: "swarmtales.kernel";
	/** The format version. */
	readonly version: 1;
	/** The id of the game. */
	readonly game: string;
	/** The hash of the game. */
	readonly gameHash: string;
	/** The seed of the run. */
	readonly seed: number;
	/** The tick the run continues with. */
	readonly tick: number;
	/** The length of the log at the snapshot. */
	readonly seq: number;
	/** The end of the run, when it has ended. */
	readonly ended?: RunEnd;
	/** Actor id to the ids of the plugins that suspend it. */
	readonly suspensions: Readonly<Record<string, readonly string[]>>;
	/** Actor id to its locked canonical tools, sorted. */
	readonly locks: Readonly<Record<string, readonly string[]>>;
	/** The jobs that wait. */
	readonly jobs: readonly Job[];
	/** Plugin id to its saved state. */
	readonly plugins: Readonly<Record<string, SliceData>>;
	/** The saved state of the scheduler, when it keeps some. */
	readonly scheduler?: SliceData;
}

/**
 * The limits the kernel enforces itself.
 *
 * @public
 */
export interface KernelLimits {
	/** The run ends after this many ticks. */
	readonly maxTicks: number;
	/** The calls one counted actor may make in a tick; left out: no limit. */
	readonly maxCallsPerTick?: number;
}

/**
 * Events that are written by something outside the plugins: a driver. Declared like a plugin's events.
 *
 * @remarks
 * What an implementer must do. The one who declares a record source (the models package for its resident driver)
 * lists every event type it will ever write, each with a schema, and checks each payload against that schema
 * itself before it records it: the kernel checks only that the source and the type are declared (SWT-R017) and
 * redacts the payload. A recorded event has the audience `["human"]`, so no actor is ever shown it, and no plugin
 * can listen to it. The id must not equal the canonical source of a loaded plugin (SWT-R002).
 *
 * @public
 */
export interface RecordSource {
	/** The `source` of every envelope it writes, for example `@swarmtales/models/resident`. */
	readonly id: string;
	/** Event type to the schema of its payload; a type that is not listed here cannot be recorded. */
	readonly events: EventSchemas;
}

/**
 * Everything a kernel is assembled from: plain data plus plugin factories. The sdk builds it; nobody writes it by
 * hand.
 *
 * @public
 */
export interface KernelDefinition {
	/** The game: its id and the hash of its data form. */
	readonly game: { readonly id: string; readonly hash: string };
	/** The seed of the run. */
	readonly seed: number;
	/** The actors. */
	readonly actors: readonly ActorSpec[];
	/** The plugins, in load order. */
	readonly plugins: readonly ResolvedPlugin[];
	/** The scheduler and its options, already parsed with the scheduler's schema, defaults filled. */
	readonly scheduler: { readonly definition: SchedulerDefinition; readonly options: JsonValue };
	/** Grant name to its tools, in the order a caller sees them. */
	readonly grants: Readonly<Record<string, readonly CanonicalTool[]>>;
	/** Canonical tool name to the shown name. */
	readonly names: Readonly<Record<CanonicalTool, string>>;
	/** Grant name to the tools locked at the start for every actor of that grant. */
	readonly startLocks: Readonly<Record<string, readonly CanonicalTool[]>>;
	/** Kernel refusal code (`TOOL_UNKNOWN`, `TOOL_NOT_GRANTED`, `TOOL_LOCKED`, `STEP_LIMIT`) to the `detail` text of the refusal; a code without a text is refused without a detail. */
	readonly replies: Readonly<Record<string, string>>;
	/** The kernel's own limits. */
	readonly limits: KernelLimits;
	/** The record sources whose events may be recorded in this run; left out: none. The builder of the definition passes them through unchanged. */
	readonly records?: readonly RecordSource[];
}

/**
 * A tool call from outside an activation.
 *
 * @public
 */
export interface Submission {
	/** Who calls. */
	readonly actor: ActorId;
	/** The shown name of the tool. */
	readonly as: string;
	/** The arguments. */
	readonly params: unknown;
	/** The highest seq the caller had seen; the log length when left out. */
	readonly basis?: number;
	/** The seq the call is a consequence of, for example the event a script reacts to; left out: nothing in the log caused it. */
	readonly causedBy?: number;
}

/**
 * What a kernel is connected to from outside. Sinks are passed at creation; there is no way to add one later.
 *
 * @public
 */
export interface KernelPorts {
	/** The sinks that read the log. */
	readonly sinks?: readonly EventSink[];
	/**
	 * The run limits that are not a plugin's, for example a cost cap: checked before the plugins' limits, at the same
	 * moments, in this order; left out: none. The id of such a limit is `<owner>.<limit>` (`models.budget`) and is
	 * written to the log as it is; the part before the dot is never the id of a plugin.
	 */
	readonly limits?: readonly RunLimit[];
	/**
	 * Takes secrets out of a text before the kernel keeps it: the detail of a failed run and every string of a
	 * recorded payload. It must be pure, must not throw and must give the same text for the same input; left out:
	 * the pattern redaction `redactSecrets`. The type is the `Redact` of `redact.ts`.
	 */
	readonly redact?: (text: string) => string;
	/** The answerer port of the stage `review`; left out: no answerer answers, so every review is told no. */
	readonly review?: ReviewPort;
}

/**
 * A snapshot and the log up to it; both untrusted, parsed by the kernel (SWT-R002).
 *
 * @public
 */
export interface ResumeInput {
	/** The snapshot, as read. */
	readonly snapshot: unknown;
	/** The lines of the log up to the snapshot, as read. */
	readonly log: readonly unknown[];
}

/**
 * A kernel: the single writer of one run.
 *
 * @public
 */
export interface Kernel {
	/** The log. */
	readonly log: LogView;
	/** The current tick. */
	readonly tick: number;
	/** The end of the run, once it has ended. */
	readonly ended: RunEnd | undefined;
	/** The plugin ids, in load order. */
	readonly plugins: readonly string[];
	/** Writes `run_started` and runs the `runStarted` hooks; once. A resumed kernel is started already. */
	start(): void;
	/** Plays to the end, or `until.ticks` ticks; it starts the run when needed. */
	run(drivers: DriverTable, until?: { readonly ticks: number }): Promise<RunEnd | undefined>;
	/** Makes a call outside an activation (a test, a script, a person's hand) through the same pipeline; calls are served one after the other. */
	submit(call: Submission): Promise<ToolOutcome>;
	/** The tools of a grant, as a caller is shown them. */
	toolSpecs(grant: string): readonly ToolSpec[];
	/** The shown names of the actor's open tools; empty while the actor may not act. */
	openTools(actor: ActorId): readonly string[];
	/** A legal call of the tool now, from the tool's `sample`, for the fake driver. */
	sample(actor: ActorId, as: string, random: RandomSource): JsonValue | undefined;
	/** Reads a fact by `<plugin id>.<fact>`; an unknown key throws SWT-R015. */
	fact(key: string): unknown;
	/** The state of the kernel, to resume from later; only between ticks. */
	snapshot(): KernelSnapshot;
	/**
	 * Appends one declared event of a record source outside an activation: after `start()`, between ticks, before
	 * the end. The event has the given actor, the audience `["human"]` and a payload whose strings went through
	 * `KernelPorts.redact`; the payload is not checked against the schema. An undeclared source or type, or another
	 * moment, throws SWT-R017.
	 */
	record(source: string, actor: ActorId, type: string, payload: unknown): Envelope;
}
