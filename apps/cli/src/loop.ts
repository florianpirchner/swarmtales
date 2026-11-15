// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The run loop (specification of M3, section 6.3): it plays a run one tick at a time, and at every tick boundary
 * it applies the lines of the Human Hand, holds the run while the fact `humanHand.paused` is true, and writes the
 * snapshots that were asked for. The kernel knows no pause: the loop plays no tick while the fact is true.
 */
import type { DriverTable, Kernel, RunEnd, ToolOutcome } from "@swarmtales/contracts";

const HUMAN = "human";
const HAND = "humanHand";

/**
 * One line of the Human Hand: a tool call of the actor `human`, or the command to write a snapshot.
 *
 * @public
 */
export interface HandLine {
	/** The boundary the line belongs to: the number of finished ticks. */
	readonly at: number;
	/** The shown name of a tool of the grant `human`. */
	readonly tool?: string;
	/** The params of the call; `{}` when left out. */
	readonly params?: unknown;
	/** Write a snapshot at this boundary. */
	readonly command?: "snapshot";
}

/**
 * Where the lines of the Human Hand come from.
 *
 * @public
 */
export interface HandSource {
	/**
	 * The next line to apply at the boundary after `tick` finished ticks. While the run is paused it is the next
	 * line whatever its `at`, and the source waits for one; undefined then means that the input has ended.
	 */
	next(tick: number, paused: boolean): Promise<HandLine | undefined>;
	/** Lets go of the input (standard input); the loop does not call it. */
	close?(): void;
}

/**
 * One tool line of the Human Hand as the loop applied it.
 *
 * @public
 */
export interface HandCall {
	/** The boundary the call was made at: the number of finished ticks. */
	readonly tick: number;
	/** The shown name of the tool. */
	readonly tool: string;
	/** What the kernel answered: the reply, or the refusal with its code. */
	readonly outcome: ToolOutcome;
}

/**
 * What the run loop plays.
 *
 * @public
 */
export interface LoopInput {
	/** The kernel; the loop starts it when it is not started. */
	readonly kernel: Kernel;
	/** The drivers by actor id or kind. */
	readonly drivers: DriverTable;
	/** The loop stops at the boundary after this many finished ticks, when the run has not ended before. */
	readonly ticks: number;
	/** The Human Hand; none when absent. */
	readonly hand?: HandSource;
	/** The numbers of finished ticks after which a snapshot is written. */
	readonly snapshotAt: readonly number[];
	/** Writes the snapshot of the kernel at the boundary after `tick` finished ticks. */
	readonly writeSnapshot: (tick: number) => Promise<void>;
	/** Told of every tool line of the Human Hand, right after its call; nobody when absent. */
	readonly called?: (call: HandCall) => void;
}

/**
 * A loop that stopped with the run still open: `paused` when the run is paused and the Human Hand has ended (a
 * snapshot was written), `ticks` when `LoopInput.ticks` ticks are finished.
 *
 * @public
 */
export interface LoopStop {
	/** Why the loop stopped. */
	readonly stopped: "paused" | "ticks";
	/** The number of finished ticks. */
	readonly tick: number;
}

// One tool line: the call as the actor `human`, and what the kernel answered to whoever watches.
async function called(input: LoopInput, tool: string, params: unknown, tick: number): Promise<void> {
	const outcome = await input.kernel.submit({ actor: HUMAN, as: tool, params });
	input.called?.({ tick, tool, outcome });
}

// One tick boundary; true when the run is paused and no line is left that could resume it.
async function boundary(input: LoopInput, tick: number): Promise<boolean> {
	const { kernel } = input;
	const paused = (): boolean => kernel.plugins.includes(HAND) && kernel.fact(`${HAND}.paused`) === true;
	for (let line = await input.hand?.next(tick, paused()); line !== undefined; line = await input.hand?.next(tick, paused())) {
		if (line.command === "snapshot") await input.writeSnapshot(tick);
		else await called(input, line.tool ?? "", line.params ?? {}, tick);
	}
	if (paused()) {
		await input.writeSnapshot(tick);
		return true;
	}
	if (input.snapshotAt.includes(tick)) await input.writeSnapshot(tick);
	return false;
}

/**
 * Plays a run tick by tick. At every tick boundary (before the first tick and after each tick, as long as the run
 * has not ended), in this order: the lines of the Human Hand that are due (`at` at most the number of finished
 * ticks) are applied in their order, a tool line through `Kernel.submit` as the actor `human`, a `snapshot` line as
 * a snapshot; while the run is paused the next line is taken whatever its `at`, and when the input has ended the
 * loop writes a snapshot and stops; a snapshot is written when the boundary is in `snapshotAt`; one tick is played.
 * A snapshot writes no event, and a run without a Human Hand and without snapshots has the log of `Kernel.run`.
 *
 * @param input - The kernel, the drivers, the ticks to play, the Human Hand and the snapshots.
 * @returns The end of the run, or why the loop stopped with the run still open.
 * @throws What `Kernel.start`, `Kernel.run` and `Kernel.submit` throw, what the Human Hand throws (`SWT-X008` for
 * a line of standard input that cannot be read), and what `writeSnapshot` throws.
 * @example
 * ```ts
 * const end = await runLoop({ kernel, drivers, ticks: 12, snapshotAt: [6], writeSnapshot });
 * ```
 *
 * @public
 */
export async function runLoop(input: LoopInput): Promise<RunEnd | LoopStop> {
	const { kernel } = input;
	if (kernel.log.ofType("kernel", "run_started").length === 0) kernel.start();
	while (kernel.ended === undefined) {
		const { tick } = kernel;
		if (await boundary(input, tick)) return { stopped: "paused", tick };
		if (tick >= input.ticks) return { stopped: "ticks", tick };
		await kernel.run(input.drivers, { ticks: 1 });
	}
	return kernel.ended;
}
