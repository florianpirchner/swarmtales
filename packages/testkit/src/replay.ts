// SPDX-License-Identifier: Apache-2.0
/**
 * `replay`: plays a run again from its log alone and compares the new log with it, line by line. The inputs of a
 * replay are the tool calls and the events of the record sources; everything else is produced again. No model, no
 * asker and no script takes part.
 */
import { SwtError, type Activation, type ActorDriver, type Envelope, type GameData, type Kernel, type KernelPorts, type RecordSource, type ResumeInput, type SchedulerDefinition, type SwtIssue } from "@swarmtales/contracts";
import { turns } from "@swarmtales/engine";
import { createKernel } from "@swarmtales/kernel";
import { createPromptLookup } from "@swarmtales/prompts";
import { resolveGame, type Game, type ResolvedGame } from "@swarmtales/sdk";
import { Value } from "typebox/value";

/**
 * What a replay is made from.
 *
 * @public
 */
export interface ReplayInput {
	/** The game of the run: resolved, or in its builder or data form. An unresolved game is resolved with the seed of the log's `run_started`, the table `schedulers`, the prompts of the repository and `records`. */
	readonly game: ResolvedGame | Game | GameData;
	/** The log of the run, as the kernel wrote it or as `events.jsonl` holds it (the stamp `at` is ignored). */
	readonly log: readonly Envelope[];
	/** Record sources whose events are inputs, not results; default: every declared record source. */
	readonly records?: readonly RecordSource[];
	/** The schedulers by id that an unresolved game's `scheduler.id` may name; `{ turns }` when absent. */
	readonly schedulers?: Readonly<Record<string, SchedulerDefinition>>;
	/**
	 * A snapshot of the run and the lines of `log` up to it: the replay resumes a kernel there and plays only the
	 * rest of `log` again; the replayed log is the given lines followed by the lines the resumed kernel wrote.
	 */
	readonly resume?: ResumeInput;
	/**
	 * The run limits from outside the game and the sinks of the replayed kernel, as the run had them: a cost cap is
	 * repeated by a limit whose meter a sink feeds with the replayed answers (`swt replay` builds one from the
	 * manifest). Left out: none, and a log that ended at such a limit differs at its `limit_reached`.
	 */
	readonly ports?: Pick<KernelPorts, "limits" | "sinks">;
}

/**
 * The outcome of a replay.
 *
 * @public
 */
export interface ReplayResult {
	/** The log the replay wrote. */
	readonly log: readonly Envelope[];
	/** True when the replayed log equals the given one, line by line, without the stamp `at`. */
	readonly equal: boolean;
	/** The first line that differs, counted from 1; `expected` or `got` is undefined where that log has ended. */
	readonly firstDifference?: { readonly line: number; readonly expected: unknown; readonly got: unknown };
	/** `SWT-T003` with the first differing line, when the logs differ: `throw new SwtError(result.issue)`. */
	readonly issue?: SwtIssue;
}

// The inputs of one logged activation, in log order, whether its driver was pending at its end, and the line of
// its `activation_closed` (0 while it is open).
interface Turn {
	readonly steps: Envelope[];
	pending: boolean;
	closed: number;
}

// The inputs of a log: the activations of each actor, the inputs between the ticks (index: ticks ended before), the tick count.
interface Plan {
	readonly turns: Map<string, Turn[]>;
	readonly between: Envelope[][];
	ticks: number;
}

const WHERE = { package: "@swarmtales/testkit" };
const field = (value: unknown, key: string): unknown => (typeof value === "object" && value !== null ? Reflect.get(value, key) : undefined);

// An event without its stamp, as plain JSON.
function line(event: Envelope | undefined): unknown {
	if (event === undefined) return undefined;
	const copy: unknown = JSON.parse(JSON.stringify(event));
	if (typeof copy === "object" && copy !== null) Reflect.deleteProperty(copy, "at");
	return copy;
}

const outsideTurn = (event: Envelope): SwtError =>
	new SwtError({
		code: "SWT-T004",
		summary: `line ${String(event.seq)} of the log (${event.source} ${event.type} of ${event.actor}) is an input outside an activation inside tick ${String(event.tick)}`,
		where: WHERE,
		why: "A replay makes a call inside the activation it belongs to or between two ticks; an input from outside in the middle of a tick has no place it can be repeated at.",
		fix: "Replay a run whose calls from outside were made between ticks (the Human Hand, a script); input inside a tick is not replayable at M3.",
	});

const differs = (at: number, expected: Envelope | undefined, got: Envelope | undefined): SwtIssue => {
	const said = (event: Envelope | undefined): string => (event === undefined ? "nothing" : `${event.source} ${event.type} of ${event.actor}`);
	return {
		code: "SWT-T003",
		summary: `the replayed log differs at line ${String(at)}: the log has ${said(expected)}, the replay wrote ${said(got)}`,
		where: { ...WHERE, line: at },
		why: "A replay repeats the calls and the records of a log; with the same game and the same code every other line comes out the same.",
		fix: "Compare `firstDifference.expected` with `firstDifference.got`: the game, a mechanic or the kernel changed since the run, or the log was edited.",
	};
};

// `SWT-T005` for a log that stops inside a tick: it has no `run_ended`, and a tick started after the last one that ended.
function cutOff(log: readonly Envelope[]): SwtError | undefined {
	const last = (type: string): number => log.findLastIndex((event) => event.source === "kernel" && event.type === type);
	if (last("run_ended") >= 0 || last("tick_started") <= last("tick_ended")) return undefined;
	const tick = log[last("tick_started")]?.tick ?? 0;
	return new SwtError({
		code: "SWT-T005",
		summary: `the log ends at line ${String(log.length)} inside tick ${String(tick)}, without \`run_ended\``,
		where: { ...WHERE, line: log.length },
		why: "The run crashed or was cut off in the middle of a tick. A replay plays whole ticks, so the lines of the open tick cannot be compared; a run that stopped between two ticks (paused, or stopped by `--ticks`) is replayable.",
		fix: "Replay the run it was resumed from or a run that ended; `swt log verify` says whether the lines that are there hold.",
	});
}

// An activation opens: the actor's next turn. The reason `answer` says that the driver was pending after the turn before.
function opened(plan: Plan, open: Map<number, Turn>, event: Envelope): void {
	const turn: Turn = { steps: [], pending: false, closed: 0 };
	const earlier = plan.turns.get(event.actor) ?? [];
	const last = earlier.at(-1);
	if (last !== undefined && field(field(event.payload, "detail"), "reason") === "answer") last.pending = true;
	plan.turns.set(event.actor, [...earlier, turn]);
	open.set(event.seq, turn);
}

// One input: into the open activation that caused it, else to the boundary between two ticks.
function place(plan: Plan, turn: Turn | undefined, event: Envelope, inTick: boolean): void {
	if (turn !== undefined) turn.steps.push(event);
	else if (inTick) throw outsideTurn(event);
	else plan.between.at(-1)?.push(event);
}

// Sorts the inputs of a log by where they are made again.
function planOf(log: readonly Envelope[], sources: ReadonlySet<string>): Plan {
	const plan: Plan = { turns: new Map(), between: [[]], ticks: 0 };
	const open = new Map<number, Turn>();
	let inTick = false;
	const steps: Readonly<Record<string, (event: Envelope) => void>> = {
		tick_started: () => {
			plan.ticks += 1;
			inTick = true;
		},
		tick_ended: () => {
			plan.between.push([]);
			inTick = false;
		},
		activation_opened: (event) => { opened(plan, open, event); },
		activation_closed: (event) => {
			const turn = open.get(event.causedBy ?? 0);
			if (turn !== undefined) turn.closed = event.seq;
			open.delete(event.causedBy ?? 0);
		},
		tool_called: (event) => { place(plan, open.get(event.causedBy ?? 0), event, inTick); },
	};
	for (const event of log) {
		if (event.source === "kernel") steps[event.type]?.(event);
		else if (sources.has(event.source)) place(plan, open.get(event.causedBy ?? 0), event, inTick);
	}
	return plan;
}

// Waits until the replayed log is one line short of `seq`, so the input lands on its line. A driver starts before
// the members of its block before it have played, and a record is not held back by them. When a whole macrotask
// passes without a new line the replay has left the log: the input is made anyway and the comparison reports it.
async function reach(kernel: Kernel, seq: number): Promise<void> {
	while (kernel.log.length < seq - 1) {
		const before = kernel.log.length;
		await new Promise<void>((resolve) => {
			setImmediate(resolve);
		});
		if (kernel.log.length === before) return;
	}
}

// The driver of every actor: it makes the calls and writes the records of the actor's next logged activation,
// then returns when the replayed log is one line short of that activation's `activation_closed`. The close line is
// an input too: under a scheduler that does not wait for one actor before the next (`parallel` of the sample), the
// order of the closes decides when a scan runs. `played` holds the activations each actor had before the replay.
function driverOf(kernel: Kernel, plan: Plan, played: Map<string, number>): ActorDriver {
	return async (activation) => {
		const index = played.get(activation.actor) ?? 0;
		played.set(activation.actor, index + 1);
		const turn = plan.turns.get(activation.actor)?.[index];
		if (turn === undefined) return { pending: false };
		for (const event of turn.steps) await repeat(kernel, activation, event);
		if (kernel.log.length < turn.closed - 1) await reach(kernel, turn.closed);
		return { pending: turn.pending };
	};
}

// One input of an activation at its line: a call, or a record.
async function repeat(kernel: Kernel, activation: Activation, event: Envelope): Promise<void> {
	// No await when the line is due: what a driver wrote before its first await stays before the next member's opening.
	if (kernel.log.length < event.seq - 1) await reach(kernel, event.seq);
	if (event.source === "kernel") await activation.call(String(field(event.payload, "as")), field(event.payload, "params"));
	else activation.record(event.source, event.type, event.payload);
}

// One input between two ticks: a call through `submit`, a record through `Kernel.record`.
async function outside(kernel: Kernel, event: Envelope): Promise<void> {
	if (event.source !== "kernel") {
		kernel.record(event.source, event.actor, event.type, event.payload);
		return;
	}
	const links = { ...(event.basis === undefined ? {} : { basis: event.basis }), ...(event.causedBy === undefined ? {} : { causedBy: event.causedBy }) };
	await kernel.submit({ actor: event.actor, as: String(field(event.payload, "as")), params: field(event.payload, "params"), ...links });
}

// Where a replay starts: the lines already in the kernel, the ticks they ended and each actor's activations in them.
interface Start {
	readonly lines: number;
	readonly ticks: number;
	readonly played: Map<string, number>;
}

// The start after the first `lines` lines of the log; 0 lines is a replay from the beginning.
function startOf(log: readonly Envelope[], lines: number): Start {
	const played = new Map<string, number>();
	let ticks = 0;
	for (const event of log.slice(0, lines)) {
		if (event.source !== "kernel") continue;
		if (event.type === "tick_ended") ticks += 1;
		if (event.type === "activation_opened") played.set(event.actor, (played.get(event.actor) ?? 0) + 1);
	}
	return { lines, ticks, played };
}

// Plays tick by tick from the start, with the inputs of each boundary before the tick that follows it; an input
// already among the start's lines is not made again.
async function playAgain(kernel: Kernel, plan: Plan, actors: readonly string[], start: Start): Promise<void> {
	const driver = driverOf(kernel, plan, start.played);
	const drivers = Object.fromEntries(actors.map((id) => [id, driver]));
	if (start.lines === 0) kernel.start();
	for (let tick = start.ticks; ; tick++) {
		for (const event of plan.between[tick] ?? []) if (event.seq > start.lines) await outside(kernel, event);
		if (tick >= plan.ticks || kernel.ended !== undefined) return;
		await kernel.run(drivers, { ticks: 1 });
	}
}

// The resolved game: as given, or resolved like `play` does, with the seed the log started with.
function resolved(input: ReplayInput): ResolvedGame {
	const { game, log, records, schedulers } = input;
	if ("definition" in game) return game;
	const seed = field(log[0]?.payload, "seed");
	return resolveGame({ game, schedulers: schedulers ?? { turns }, prompts: createPromptLookup(), ...(typeof seed === "number" ? { seed } : {}), ...(records === undefined ? {} : { records }) });
}

/**
 * Plays a run again from its log and compares. Inputs are taken from the log: a `tool_called` inside an activation
 * is called again by a replay driver, in the order and at the line of the log; a `tool_called` between two ticks is
 * submitted at the same boundary; an event of a record source is recorded again at the same place. The line of each
 * `activation_closed` is an input too: a replay driver returns only when the replayed log has reached the line before
 * it, so the closes, and the scans a scheduler runs at them, come at the lines of the log under any scheduler. Every
 * other line (kernel, scheduler, mechanics) is a result. A resumed log is replayed as one log; with `resume` the
 * replay starts at a snapshot instead and plays only the rest.
 *
 * A failure of the replayed run (as of the run itself) ends its log with `run_ended`; it is not thrown, the
 * comparison shows it. Not repeated: a driver that failed (the outcome `error` of an activation), and a run limit
 * from outside the game (a cost cap) unless `ports.limits` gives it; such a log differs at that line.
 *
 * @param input - The game, the log and the record sources that are inputs.
 * @returns The replayed log, whether it is equal, and the first differing line with its `SWT-T003` issue.
 * @throws SwtError `SWT-T005` when the log has no `run_ended` and stops inside a tick (a crashed run), `SWT-T004`
 * when the log holds an input outside an activation inside a tick, and what game resolution or `createKernel` reports for a game that does not resolve.
 * @example
 * ```ts
 * const { events } = await play(game, { seed: 7, drivers });
 * const again = await replay({ game, log: events });
 * if (again.issue !== undefined) throw new SwtError(again.issue);
 * ```
 *
 * @public
 */
export async function replay(input: ReplayInput): Promise<ReplayResult> {
	const crashed = cutOff(input.log);
	if (crashed !== undefined) throw crashed;
	const { definition } = resolved(input);
	const sources = new Set((input.records ?? definition.records ?? []).map((source) => source.id));
	const plan = planOf(input.log, sources);
	const kernel = createKernel(definition, { ...input.ports, redact: (text) => text }, input.resume);
	const start = startOf(input.log, input.resume === undefined ? 0 : kernel.log.length);
	await playAgain(kernel, plan, definition.actors.map((actor) => actor.id), start).catch(() => undefined);
	const log = kernel.log.all();
	for (let index = 0; index < Math.max(log.length, input.log.length); index++) {
		const [expected, got] = [input.log[index], log[index]];
		if (Value.Equal(line(expected), line(got))) continue;
		return { log, equal: false, firstDifference: { line: index + 1, expected: line(expected), got: line(got) }, issue: differs(index + 1, expected, got) };
	}
	return { log, equal: true };
}
