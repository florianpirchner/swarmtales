// SPDX-License-Identifier: Apache-2.0
/**
 * The assembly: `createKernel` joins the parts to one kernel, keeps the end and the first failure of the run, and
 * resumes a run from a snapshot and its log. A port of what is left of the old `host.ts` beside the lifecycle.
 */
import { Clean, Clone, Parse } from "typebox/value";
import { EnvelopeSchema, envelopeLogIssues, KernelSnapshotSchema, SwtError } from "@swarmtales/contracts";
import type { Envelope, EventSink, Fact, Kernel, KernelDefinition, KernelPorts, KernelSnapshot, ResumeInput, RunEnd, SchedulerInstance, ToolSpec } from "@swarmtales/contracts";
import { createAccess } from "./access.ts";
import { createActors } from "./actors.ts";
import { createClock } from "./clock.ts";
import { createDispatch } from "./dispatch.ts";
import { guarded, kernelFailed, misfit, unknownFact } from "./errors.ts";
import { createLifecycle } from "./lifecycle.ts";
import { loadPlugins } from "./loader.ts";
import { createLog } from "./log.ts";
import type { Lifecycle, LoadedTool, SliceParts } from "./parts.ts";
import { createSchedulerPort } from "./ports.ts";
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

// `SWT-R001` with the first failure as its cause, once the run failed; with `open`, a run that ended is refused too.
function usable(run: Run, open?: string): void {
	if (run.failure !== undefined) throw new SwtError(kernelFailed(), { cause: run.failure.error });
	if (open !== undefined && run.ended !== undefined) throw new RangeError(`the run has ended, ${open} is refused`);
}

// The lifecycle the scheduler gets: it keeps the end and the first failure, and refuses a tick after the end.
function gateOf(life: Lifecycle, run: Run, tick: () => number) {
	const note = (error: unknown): unknown => {
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
function assemble(definition: KernelDefinition, sinks: readonly EventSink[], prefix: readonly Envelope[], run: Run) {
	const clock = createClock();
	const audiences = new Map(definition.plugins.map((plugin) => [`${plugin.package}/${plugin.id}`, plugin.audiences]));
	const audienceOf = (source: string, type: string): readonly string[] | undefined => {
		const own = audiences.get(source);
		return own !== undefined && Object.hasOwn(own, type) ? own[type] : undefined;
	};
	const log = createLog(() => clock.tick, audienceOf, prefix);
	for (const sink of sinks) log.addSink(sink);
	const actors = createActors(definition.actors, log);
	const access = createAccess(definition, actors, log);
	const loaded = loadPlugins(definition, { log, actors, access, services: createServices(log), clock });
	const counted = definition.actors.map((actor) => actor.id);
	const steps = createSteps(definition.limits.maxCallsPerTick, counted);
	const { gate, raise, note } = gateOf(createLifecycle({ definition, log, clock, steps, loaded, sinks }), run, () => clock.tick);
	const shown = (tool: LoadedTool): string => definition.names[tool.canonical] ?? tool.tool.name;
	const toolSpecs = (grant: string): readonly ToolSpec[] => access.grantsOf(grant).flatMap((name) => [loaded.tools.get(name)].flatMap((tool) => (tool === undefined ? [] : [{ name: shown(tool), description: tool.tool.description, parameters: tool.tool.parameters }])));
	const dispatch = createDispatch({ definition, log, actors, access, steps, loaded, fail: note });
	const scheduler: SchedulerInstance = definition.scheduler.definition.create(definition.scheduler.options);
	const port = createSchedulerPort({ definition, log, actors, clock, loaded, dispatch, toolSpecs }, gate);
	const slices: SliceParts = { definition, log, actors, access, clock, loaded, scheduler: scheduler.slice };
	return { log, clock, actors, access, loaded, dispatch, scheduler, port, slices, toolSpecs, shown, raise, gate };
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
			return parts.dispatch.submit(call);
		},
		snapshot() {
			usable(run);
			if (run.playing) throw new RangeError("a snapshot is taken between two ticks, not inside a run");
			return saveKernel(parts.slices, parts.clock.tick, run.ended);
		},
	};
}

/**
 * Creates the kernel of one run from its definition, or resumes one from a snapshot and the log up to it. A
 * resumed kernel is started already and writes none of the old events again.
 *
 * Once the run failed, `start`, `run`, `submit` and `snapshot` throw (or reject with) `SWT-R001` with the first
 * failure as the cause; the call that failed throws the failure itself. After a normal end `run` answers the end
 * again, and `start`, `submit` and a further tick are refused with a `RangeError`, as a second `start`, a `run`
 * inside a `run` and a `snapshot` inside a tick are.
 *
 * @param definition - The kernel definition, built by the sdk.
 * @param ports - The sinks that read the log.
 * @param resume - The snapshot and the log to resume from, both unchecked.
 * @returns The kernel.
 * @throws SwtError `SWT-R002` when the definition and what it loads do not fit or the resume input does not fit
 * the definition, `SWT-R003` when a plugin throws at load, `SWT-R013` for two `toAct` hooks, `SWT-R016` for a
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
	const parts = assemble(definition, ports.sinks ?? [], input?.log ?? [], run);
	if (input !== undefined) restoreKernel(parts.slices, input.snapshot);
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
	};
}
