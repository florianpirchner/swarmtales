// SPDX-License-Identifier: Apache-2.0
/**
 * The assembly: `createKernel` joins the parts to one kernel, keeps the end and the first failure of the run, and
 * resumes a run from a snapshot and its log. A port of what is left of the old `host.ts` beside the lifecycle.
 */
import { Clean, Clone, Parse } from "typebox/value";
import { EnvelopeSchema, envelopeLogIssues, KernelSnapshotSchema, SwtError } from "@swarmtales/contracts";
import type { Envelope, Fact, Kernel, KernelDefinition, KernelPorts, KernelSnapshot, ResumeInput, RunEnd, SchedulerInstance, Submission, ToolSpec } from "@swarmtales/contracts";
import { createAccess } from "./access.ts";
import { createActors } from "./actors.ts";
import { createClock } from "./clock.ts";
import { createDispatch } from "./dispatch.ts";
import { guarded, kernelFailed, misfit, noRecord, noResume, unknownFact } from "./errors.ts";
import { createLifecycle } from "./lifecycle.ts";
import { loadPlugins } from "./loader.ts";
import { createLog } from "./log.ts";
import type { Dispatch, Lifecycle, LoadedTool, SliceParts, Staged } from "./parts.ts";
import { createRecorder, createSchedulerPort } from "./ports.ts";
import { createServices } from "./services.ts";
import { restoreKernel, saveKernel } from "./slices.ts";
import { createSteps } from "./steps.ts";

const RESUME = "Resume with the snapshot and the log of one run, as they were written.";

// What the kernel keeps about its run beside the parts.
interface Run {
	started: boolean;
	playing: boolean;
	ended: RunEnd | undefined;
	failure: { readonly error: unknown } | undefined;
}

// The checked input of a resume; a line with the stamp of a sink is taken without it.
function parsed(resume: ResumeInput): { readonly snapshot: KernelSnapshot; readonly log: readonly Envelope[] } {
	const fault = envelopeLogIssues(resume.log)[0];
	if (fault !== undefined) throw new SwtError(misfit(`line ${String(fault.line)} of the log to resume from: ${fault.reason}`, RESUME));
	try {
		return { snapshot: Parse(KernelSnapshotSchema, resume.snapshot), log: resume.log.map((line) => Parse(EnvelopeSchema, Clean(EnvelopeSchema, Clone(line)))) };
	} catch (thrown) {
		throw new SwtError(misfit("the snapshot to resume from is no snapshot of a kernel", RESUME), { cause: thrown });
	}
}

// Restores the snapshot, then refuses (`SWT-R021`) one that is older than its log, or whose suspensions name a
// plugin that is not loaded, or whose locks name a tool that no loaded plugin has.
function restore(parts: SliceParts, snapshot: KernelSnapshot): void {
	restoreKernel(parts, snapshot);
	const last = parts.log.all().at(-1)?.tick ?? 0;
	if (snapshot.tick < last) throw new SwtError(noResume(`the snapshot continues with tick ${String(snapshot.tick)}, but the last event of the log is of tick ${String(last)}`));
	const plugin = Object.values(snapshot.suspensions).flat().find((id) => !parts.loaded.order.includes(id));
	if (plugin !== undefined) throw new SwtError(noResume(`the snapshot has a suspension held by the plugin "${plugin}", which is not loaded`));
	const tool = Object.values(snapshot.locks).flat().find((name) => !parts.loaded.tools.has(name));
	if (tool !== undefined) throw new SwtError(noResume(`the snapshot locks the tool "${tool}", which no loaded plugin has`));
}

// `SWT-R001` with the first failure as its cause, once the run failed; with `open`, a run that ended is refused too.
function usable(run: Run, open?: string): void {
	if (run.failure !== undefined) throw new SwtError(kernelFailed(), { cause: run.failure.error });
	if (open !== undefined && run.ended !== undefined) throw new RangeError(`the run has ended, ${open} is refused`);
}

// `causedBy` and `basis` of a call from outside are written as given, so they must name events the log has.
function inLog(call: Submission, length: number): void {
	const within = (seq: number | undefined, least: number): boolean => seq === undefined || (Number.isInteger(seq) && seq >= least && seq <= length);
	if (within(call.causedBy, 1) && within(call.basis, 0)) return;
	throw new RangeError(`a call with causedBy ${String(call.causedBy)} and basis ${String(call.basis)} is refused, the log has ${String(length)} events`);
}

// The lifecycle the scheduler gets: it keeps the end and the first failure, and refuses a tick after the end.
function gateOf(life: Lifecycle, run: Run, tick: () => number) {
	const note = (error: unknown): unknown => {
		// What is refused after a normal end is no failure: the run keeps its end.
		if (run.ended !== undefined && run.failure === undefined) return error;
		run.failure ??= { error };
		run.ended ??= { reason: "error", tick: tick() };
		life.fail(error);
		return run.failure.error;
	};
	const raise = (error: unknown): never => {
		throw note(error);
	};
	const gate: Lifecycle = {
		start: () => {
			life.start();
		},
		beginTick: async () => {
			usable(run, "a tick");
			await life.beginTick().catch(raise);
		},
		endTick: async (idle) => {
			usable(run, "a tick");
			run.ended = await life.endTick(idle).catch(raise);
			return run.ended;
		},
		get halted() {
			return life.halted;
		},
		fail: note,
	};
	return { gate, raise, note };
}

// Joins the parts.
function assemble(definition: KernelDefinition, ports: KernelPorts, prefix: readonly Envelope[], run: Run) {
	const clock = createClock();
	const sinks = ports.sinks ?? [];
	const audiences = new Map(definition.plugins.map((plugin) => [`${plugin.package}/${plugin.id}`, plugin.audiences]));
	const audienceOf = (source: string, type: string): readonly string[] | undefined => {
		const own = audiences.get(source);
		return own !== undefined && Object.hasOwn(own, type) ? own[type] : undefined;
	};
	const log = createLog(() => clock.tick, audienceOf, prefix);
	for (const sink of sinks) log.addSink(sink);
	const record = createRecorder(definition, log, ports.redact);
	const actors = createActors(definition.actors, log);
	const access = createAccess(definition, actors, log);
	const staged: Staged[] = [];
	const loaded = loadPlugins(definition, { log, actors, access, services: createServices(log), clock, staged });
	const counted = definition.actors.map((actor) => actor.id);
	const steps = createSteps(definition.limits.maxCallsPerTick, counted);
	const { gate, raise, note } = gateOf(createLifecycle({ definition, log, clock, steps, loaded, sinks, settle: () => { lane.settle(); } }, ports), run, () => clock.tick);
	const shown = (tool: LoadedTool): string => definition.names[tool.canonical] ?? tool.tool.name;
	const toolSpecs = (grant: string): readonly ToolSpec[] => access.grantsOf(grant).flatMap((name) => [loaded.tools.get(name)].flatMap((tool) => (tool === undefined ? [] : [{ name: shown(tool), description: tool.tool.description, parameters: tool.tool.parameters }])));
	const lane = createDispatch({ definition, log, actors, access, steps, loaded, fail: note, staged });
	// Every call, also the one of an activation whose driver is still running, is refused once the run failed or ended.
	const submit: Dispatch["submit"] = async (call) => {
		usable(run, "a call");
		return lane.submit(call);
	};
	const dispatch: Dispatch = { ...lane, submit };
	const scheduler: SchedulerInstance = definition.scheduler.definition.create(definition.scheduler.options);
	const port = createSchedulerPort({ definition, log, actors, clock, loaded, dispatch, toolSpecs }, gate, record);
	const slices: SliceParts = { definition, log, actors, access, clock, loaded, scheduler: scheduler.slice };
	return { log, clock, actors, access, loaded, dispatch, scheduler, port, slices, toolSpecs, shown, raise, gate, record, staged };
}

// The readers of a kernel: what it tells about its tools and facts without changing the run.
function readers(parts: ReturnType<typeof assemble>): Pick<Kernel, "toolSpecs" | "openTools" | "sample" | "fact"> {
	const { log, actors, access, loaded, shown } = parts;
	const facts = new Map<string, { readonly id: string; readonly fact: Fact }>(loaded.order.flatMap((id) => Object.entries(loaded.instances.get(id)?.facts ?? {}).map(([name, fact]) => [`${id}.${name}`, { id, fact }] as const)));
	const port = access.portFor("kernel");
	return {
		toolSpecs: parts.toolSpecs,
		openTools: (actor) => (actors.mayAct(actor) ? log.run({ actor: "kernel" }, () => port.open(actor)).flatMap((name) => [loaded.tools.get(name)].flatMap((tool) => (tool === undefined ? [] : [shown(tool)]))) : []),
		sample(actor, as, random) {
			const grant = actors.spec(actor)?.grant;
			const found = grant === undefined ? undefined : loaded.byShownName.get(as)?.find((entry) => access.granted(grant, entry.canonical));
			return found === undefined ? undefined : guarded(found.owner, () => found.tool.sample?.(actor, random));
		},
		fact(key) {
			const found = facts.get(key);
			if (found === undefined) throw new SwtError(unknownFact(key, [...facts.keys()]));
			return guarded(found.id, () => found.fact.compute());
		},
	};
}

// The steps of a kernel that change the run, each refused once the run failed.
function controls(parts: ReturnType<typeof assemble>, run: Run): Pick<Kernel, "start" | "run" | "submit" | "snapshot"> {
	const start = (): void => {
		usable(run, "a start");
		if (run.started) throw new RangeError("the run is started already");
		run.started = true;
		try {
			parts.gate.start();
		} catch (error) {
			parts.raise(error);
		}
	};
	return {
		start,
		async run(drivers, until) {
			usable(run);
			if (run.ended !== undefined) return run.ended;
			if (run.playing) throw new RangeError("the run is played already");
			if (!run.started) start();
			run.playing = true;
			try {
				await parts.scheduler.run(parts.port, drivers, until);
				return run.ended;
			} catch (error) {
				return parts.raise(error);
			} finally {
				run.playing = false;
			}
		},
		async submit(call) {
			usable(run, "a call");
			inLog(call, parts.log.length);
			return parts.dispatch.submit(call);
		},
		snapshot() {
			usable(run);
			if (run.playing) throw new RangeError("a snapshot is taken between two ticks, not inside a run");
			if (parts.staged.length > 0) throw new RangeError(`a snapshot is refused while ${String(parts.staged.length)} staged calls wait to run`);
			return saveKernel(parts.slices, parts.clock.tick, run.ended);
		},
	};
}

// A record outside an activation: only in a started run, between two ticks; a sink that throws at it ends the run.
function recordOf(parts: ReturnType<typeof assemble>, run: Run): Kernel["record"] {
	return (source, actor, type, payload) => {
		usable(run);
		if (!run.started || run.playing || run.ended !== undefined) throw new SwtError(noRecord(`"${source}" records the event "${type}" before the start, inside a tick or after the end`));
		return parts.record({ actor }, source, type, payload, (code) => {
			try {
				return code();
			} catch (error) {
				return parts.raise(error);
			}
		});
	};
}

/**
 * Creates the kernel of one run from its definition, or resumes one from a snapshot and the log up to it. A
 * resumed kernel is started already and writes none of the old events again.
 *
 * Once the run failed, `start`, `run`, `submit`, `snapshot` and `record` throw (or reject with) `SWT-R001` with the first
 * failure as the cause; the call that failed throws the failure itself. After a normal end `run` answers the end
 * again, and `start`, `submit` and a further tick are refused with a `RangeError`, as a second `start`, a `run`
 * inside a `run`, a `snapshot` inside a `run`, and a `submit` whose `causedBy` or `basis` names no event of the log
 * are. A call of an actor that is not in the definition (a reserved id, an unknown id) is a call as any other: it
 * is written and refused with `TOOL_NOT_GRANTED`. A refusal after a normal end is no failure: the run keeps its end.
 *
 * @param definition - The kernel definition, built by the sdk.
 * @param ports - The sinks that read the log, the run limits that are no plugin's, and the redaction.
 * @param resume - The snapshot and the log to resume from, both unchecked.
 * @returns The kernel.
 * @throws SwtError `SWT-R002` when the definition and what it loads do not fit or the resume input does not fit
 * the definition or a record source has the source of a plugin, `SWT-R021` when the snapshot is older than the log
 * or names a plugin (a suspension) or a tool (a lock) that is not loaded, `SWT-R003` when a plugin throws at load, `SWT-R013` for two `toAct` hooks, `SWT-R016` for a
 * cycle of `after`.
 *
 * @example
 * ```ts
 * const kernel = createKernel(definition, { sinks: [sink] });
 * const end = await kernel.run({ resident: driver });
 * ```
 *
 * @public
 */
export function createKernel(definition: KernelDefinition, ports: KernelPorts = {}, resume?: ResumeInput): Kernel {
	const input = resume === undefined ? undefined : parsed(resume);
	const run: Run = { started: false, playing: false, ended: undefined, failure: undefined };
	const parts = assemble(definition, ports, input?.log ?? [], run);
	if (input !== undefined) restore(parts.slices, input.snapshot);
	run.ended = input?.snapshot.ended;
	run.started = parts.log.ofType("kernel", "run_started").length > 0;
	return {
		log: parts.log,
		get tick() {
			return parts.clock.tick;
		},
		get ended() {
			return run.ended;
		},
		plugins: parts.loaded.order,
		...readers(parts),
		...controls(parts, run),
		record: recordOf(parts, run),
	};
}
