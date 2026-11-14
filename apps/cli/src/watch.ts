// SPDX-License-Identifier: Apache-2.0
/**
 * What a run says about its Human Hand and its snapshots beside the log: a refused line of `--hand` is printed as
 * it happens and counted for the result lines, and a `--snapshot-at` that wrote no snapshot gets a warning line.
 */
import type { RunEnd } from "@swarmtales/contracts";
import type { LoopOptions } from "./assembly.ts";
import type { HandCall, LoopStop } from "./loop.ts";

/**
 * The tool lines of the Human Hand that a run applied.
 *
 * @public
 */
export interface HandCount {
	/** The calls the loop made as the actor `human`. */
	readonly calls: number;
	/** How many of them the game refused. */
	readonly refused: number;
}

/**
 * Watches the loop of one run. The loop it gives back counts the calls of the Human Hand, prints each refused one
 * through `warn` right after the call, with the refusal code of the game, and notes the snapshots that were written.
 *
 * @param loop - The options of the loop (`loopOf`).
 * @returns `loop`: the options to play with. `close`: called once with the end or the stop of the run; it warns
 * about every boundary of `snapshotAt` that the run did not have (the run ended or stopped before it, or a resumed
 * run started after it) and gives the count of the Human Hand, `{}` for a run without one.
 *
 * @public
 */
export function watched(loop: LoopOptions): { readonly loop: LoopOptions & { readonly called: (call: HandCall) => void }; readonly close: (end: RunEnd | LoopStop) => { readonly hand?: HandCount } } {
	const warn = loop.warn ?? (() => undefined);
	const written = new Set<number>();
	const count = { calls: 0, refused: 0 };
	const called = ({ tick, tool, outcome }: HandCall): void => {
		count.calls += 1;
		if (outcome.ok) return;
		count.refused += 1;
		warn(`warning: the Human Hand's call of "${tool}" after ${String(tick)} ticks was refused with ${outcome.code}${outcome.detail === undefined ? "" : `: ${outcome.detail}`}`);
	};
	const writeSnapshot = async (tick: number): Promise<void> => {
		await loop.writeSnapshot(tick);
		written.add(tick);
	};
	return {
		loop: { ...loop, called, writeSnapshot },
		close(end) {
			const how = "stopped" in end ? "stopped" : "ended";
			for (const tick of loop.snapshotAt) if (!written.has(tick)) warn(`warning: \`--snapshot-at ${String(tick)}\` wrote no snapshot: the run ${how} after ${String(end.tick)} ticks and had no tick boundary after ${String(tick)}`);
			return loop.hand === undefined ? {} : { hand: { ...count } };
		},
	};
}

/**
 * The result line of the Human Hand: printed when the game refused a line.
 *
 * @param hand - The count of the run; absent for a run without a Human Hand.
 * @returns The line, or none when nothing was refused.
 *
 * @public
 */
export function handLine(hand: HandCount | undefined): readonly string[] {
	return hand === undefined || hand.refused === 0 ? [] : [`Human Hand: ${String(hand.refused)} of ${String(hand.calls)} calls refused`];
}
