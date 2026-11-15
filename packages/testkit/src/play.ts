// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `play` and `testKernel`: a game from its definition to a played run, in the four steps the command line takes too
 * (resolve the game, create the kernel, check the win fact, run). A port of the old `playStory` and of the old
 * host's test helpers.
 */
import { actorId } from "@swarmtales/contracts";
import type { ActorDriver, DriverTable, Envelope, EventSink, GameData, Kernel, KernelPorts, PromptLookup, RecordSource, Redact, ResumeInput, ReviewPort, RunEnd, RunLimit, SchedulerDefinition, ToolOutcome } from "@swarmtales/contracts";
import { turns } from "@swarmtales/engine";
import { createKernel } from "@swarmtales/kernel";
import { createPromptLookup } from "@swarmtales/prompts";
import { resolveGame, RESIDENT_KIND, type Game, type MechanicDefinition } from "@swarmtales/sdk";
import { idleDriver, scriptedDriver } from "./drivers.ts";

/**
 * How `play` and `testKernel` run a game.
 *
 * @public
 */
export interface PlayOptions {
	/** The seed; it wins over the game's own. */
	readonly seed?: number;
	/** The drivers by actor id or kind, or a function of the kernel (the fake driver needs it); every resident idles when absent. */
	readonly drivers?: DriverTable | ((kernel: Kernel) => DriverTable);
	/** Resident name to its calls, `[tool, params]`: the resident makes the next one at each of its activations, and none once the list is used up. It wins over `drivers` for that resident. */
	readonly script?: Readonly<Record<string, readonly (readonly [string, unknown])[]>>;
	/** Play at most this many ticks; to the end when absent. */
	readonly ticks?: number;
	/** The lookup that renders every text; the lookup over the repository's folders when absent. */
	readonly prompts?: PromptLookup;
	/** The snapshot and the log to resume from. */
	readonly resume?: ResumeInput;
	/** The sinks that read the log. */
	readonly sinks?: readonly EventSink[];
	/** For a game in its data form: mechanic id to definition. */
	readonly installed?: Readonly<Record<string, MechanicDefinition>>;
	/** The overrides of a game family's params, by name. */
	readonly params?: Readonly<Record<string, unknown>>;
	/** The record sources of the run (a driver's); without them a record is refused. */
	readonly records?: readonly RecordSource[];
	/** Limits given from outside the game, such as a cost meter's; checked before the game's own. */
	readonly limits?: readonly RunLimit[];
	/** The redaction of what the kernel writes; the pattern redaction when absent. */
	readonly redact?: Redact;
	/** The answerer port of the stage `review` (a scripted answerer in a mechanic's test); without it no answerer answers. */
	readonly review?: ReviewPort;
	/** The schedulers by id that the game's `scheduler.id` may name; `{ turns }` when absent. */
	readonly schedulers?: Readonly<Record<string, SchedulerDefinition>>;
}

/**
 * A played run.
 *
 * @public
 */
export interface Played {
	/** The kernel after the run. */
	readonly kernel: Kernel;
	/** The end of the run; undefined when it stopped at `ticks` with the run still open. */
	readonly end: RunEnd | undefined;
	/** Every event of the log. */
	readonly events: readonly Envelope[];
}

/**
 * A started kernel with the old host's test helpers, so a ported test changes names only.
 *
 * @public
 */
export interface TestKernel {
	/** The kernel. */
	readonly kernel: Kernel;
	/**
	 * Submits a call of a resident outside an activation.
	 *
	 * @param resident - The resident's name (`A01`).
	 * @param tool - The shown name of the tool.
	 * @param params - The params as the caller writes them.
	 * @returns The outcome.
	 */
	call(resident: string, tool: string, params: unknown): Promise<ToolOutcome>;
	/**
	 * Lists the tools a resident can call now.
	 *
	 * @param resident - The resident's name.
	 * @returns The shown names; empty while the resident may not act.
	 */
	openTools(resident: string): readonly string[];
	/**
	 * Computes a fact.
	 *
	 * @param key - `<plugin id>.<fact>`.
	 * @returns The value.
	 * @throws SwtError `SWT-R015` for an unknown key.
	 */
	fact(key: string): unknown;
	/**
	 * Plays ticks with one driver for every resident.
	 *
	 * @param driver - The driver of every resident.
	 * @param ticks - The number of ticks; fewer are played when the run ends earlier.
	 * @returns The end of the run, or undefined while it is open.
	 */
	playTicks(driver: ActorDriver, ticks: number): Promise<RunEnd | undefined>;
}

// The schedulers a game may name: the given table, else `turns` alone.
const schedulersOf = (options: PlayOptions): Readonly<Record<string, SchedulerDefinition>> => options.schedulers ?? { turns };

// The kernel's ports of a run: the sinks, and the limits, the redaction and the answerer port where given.
function portsOf(options: PlayOptions): KernelPorts {
	return { sinks: options.sinks ?? [], ...(options.limits === undefined ? {} : { limits: options.limits }), ...(options.redact === undefined ? {} : { redact: options.redact }), ...(options.review === undefined ? {} : { review: options.review }) };
}

// Steps one to three: resolve the game, create the kernel, check that the win fact exists.
function kernelOf(game: Game | GameData, options: PlayOptions): Kernel {
	const resolved = resolveGame({
		game,
		schedulers: schedulersOf(options),
		prompts: options.prompts ?? createPromptLookup(),
		...(options.installed === undefined ? {} : { installed: options.installed }),
		...(options.seed === undefined ? {} : { seed: options.seed }),
		...(options.params === undefined ? {} : { params: options.params }),
		...(options.records === undefined ? {} : { records: options.records }),
	});
	const kernel = createKernel(resolved.definition, portsOf(options), options.resume);
	if (resolved.win !== undefined) kernel.fact(resolved.win);
	return kernel;
}

// The driver table of a run: the given one, with a driver per scripted resident on top.
function driversOf(kernel: Kernel, options: PlayOptions): DriverTable {
	const given = typeof options.drivers === "function" ? options.drivers(kernel) : (options.drivers ?? { [RESIDENT_KIND]: idleDriver });
	const scripted = Object.entries(options.script ?? {}).map(([resident, calls]): [string, ActorDriver] => {
		let made = 0;
		return [
			actorId(RESIDENT_KIND, resident),
			scriptedDriver(() => {
				const next = calls[made++];
				return next === undefined ? [] : [{ tool: next[0], params: next[1] }];
			}),
		];
	});
	return { ...given, ...Object.fromEntries(scripted) };
}

/**
 * Resolves the game, creates a kernel, checks `win.fact`, and plays to the end or `ticks` ticks.
 *
 * @param game - The game, in its builder form or its data form.
 * @param options - The seed, the drivers, the tick count, the prompts, the resume input and the sinks.
 * @returns The kernel, the end and every event.
 * @throws SwtError What game resolution reports (`SWT-G...`, `SWT-M010`, `SWT-P...`), `SWT-R002` for a definition
 * or a resume input that does not fit, `SWT-R015` when `win.fact` names no fact (before `run_started` is written),
 * and whatever ends the run with a failure.
 * @example
 * ```ts
 * const { end, events } = await play(game, { seed: 7, script: { A01: [["guess", { value: 4 }]] } });
 * ```
 *
 * @public
 */
export async function play(game: Game | GameData, options: PlayOptions = {}): Promise<Played> {
	const kernel = kernelOf(game, options);
	const end = await kernel.run(driversOf(kernel, options), options.ticks === undefined ? undefined : { ticks: options.ticks });
	return { kernel, end, events: kernel.log.all() };
}

/**
 * Resolves the game and gives a started kernel with the old host's test helpers. `drivers`, `script` and `ticks`
 * of the options are not read: the test plays with `playTicks` or calls with `call`.
 *
 * @param game - The game, in its builder form or its data form.
 * @param options - The seed, the prompts, the resume input and the sinks.
 * @returns The started kernel with its helpers.
 * @throws SwtError As `play` before its run, and what the `runStarted` hooks throw (`SWT-R003`).
 * @example
 * ```ts
 * const test = testKernel(game);
 * const outcome = await test.call("A01", "guess", { value: 4 });
 * ```
 *
 * @public
 */
export function testKernel(game: Game | GameData, options: PlayOptions = {}): TestKernel {
	const kernel = kernelOf(game, options);
	if (options.resume === undefined) kernel.start();
	return {
		kernel,
		call: (resident, tool, params) => kernel.submit({ actor: actorId(RESIDENT_KIND, resident), as: tool, params }),
		openTools: (resident) => kernel.openTools(actorId(RESIDENT_KIND, resident)),
		fact: (key) => kernel.fact(key),
		playTicks: (driver, ticks) => kernel.run({ [RESIDENT_KIND]: driver }, { ticks }),
	};
}
