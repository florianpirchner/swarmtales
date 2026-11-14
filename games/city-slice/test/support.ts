// SPDX-License-Identifier: Apache-2.0
/** Shared by the tests of the city slice: the resolved game, the drivers of the scripted run, and the run itself, played one tick at a time. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { nameOf, type DriverTable, type Envelope, type Kernel, type KernelSnapshot, type RecordSource, type RunEnd, type ToolOutcome } from "@swarmtales/contracts";
import { createDirectorDrivers, DIRECTOR_RECORDS, turns } from "@swarmtales/engine";
import { scriptedAsker } from "@swarmtales/models";
import { resolveGame, type ResolvedGame } from "@swarmtales/sdk";
import { scriptedDriver, testKernel } from "@swarmtales/testkit";
import game from "../game.ts";
import { callsOf, WARDEN_ANSWERS, type HandLine } from "../src/scripts.ts";

/** The record sources of a run of the slice: the Director's driver writes `asked` and `answered`. */
export const RECORDS: readonly RecordSource[] = [DIRECTOR_RECORDS];

/** The ticks of the game. */
export const TICKS = 12;

/** A played run of the slice. */
export interface SliceRun {
	readonly kernel: Kernel;
	readonly end: RunEnd | undefined;
	readonly events: readonly Envelope[];
	/** The outcome of every tool line of the Human Hand, in order. */
	readonly hand: readonly ToolOutcome[];
	/** The snapshots the `snapshot` lines of the Human Hand took, in order. */
	readonly snapshots: readonly KernelSnapshot[];
}

/**
 * Resolves the slice for what reads no text: the Directors' drivers and the load order. Every text is rendered as
 * its id (the package has no dependency on the prompts), so never create a kernel or replay from this value; pass
 * the game itself (`../game.ts`) to `testKernel`, `play` and `replay`, with `RECORDS`.
 *
 * @param seed - The seed of the run.
 * @returns The resolved game, with the scheduler `turns` and the records of the Director's driver.
 */
export function resolved(seed: number): ResolvedGame {
	return resolveGame({ game, seed, schedulers: { turns }, prompts: { render: (_owner, id) => id }, records: RECORDS });
}

/**
 * The drivers of the scripted run: every resident makes the calls of the script for the tick, the warden asks a scripted model.
 *
 * @param seed - The seed of the run.
 * @returns The driver table, with a fresh asker.
 */
export function drivers(seed: number): DriverTable {
	return { resident: scriptedDriver((activation) => callsOf(activation.tick, nameOf(activation.actor))), ...createDirectorDrivers({ game: resolved(seed), ask: scriptedAsker(WARDEN_ANSWERS) }) };
}

/**
 * Plays the slice in process, one tick at a time; at each boundary the lines of the Human Hand for it are applied
 * in order: a tool line through `Kernel.submit`, a `snapshot` line through `Kernel.snapshot`.
 *
 * @param seed - The seed of the run.
 * @param hand - The lines of the Human Hand.
 * @returns The kernel, the end, the log, and what the Human Hand got.
 */
export async function playSlice(seed: number, hand: readonly HandLine[]): Promise<SliceRun> {
	const { kernel } = testKernel(game, { seed, records: RECORDS });
	const table = drivers(seed);
	const outcomes: ToolOutcome[] = [];
	const snapshots: KernelSnapshot[] = [];
	let end: RunEnd | undefined;
	for (let done = 0; done < TICKS && end === undefined; done++) {
		for (const line of hand.filter((entry) => entry.at === done)) {
			if (line.tool === undefined) snapshots.push(kernel.snapshot());
			else outcomes.push(await kernel.submit({ actor: "human", as: line.tool, params: line.params ?? {} }));
		}
		end = await kernel.run(table, { ticks: 1 });
	}
	return { kernel, end, events: kernel.log.all(), hand: outcomes, snapshots };
}

/**
 * Reads a committed timeline.
 *
 * @param name - The file name without its ending (`seed-7`).
 * @returns The lines of the file, parsed.
 */
export function timeline(name: string): readonly unknown[] {
	return readFileSync(join(import.meta.dirname, "timelines", `${name}.jsonl`), "utf8").trimEnd().split("\n").map((line): unknown => JSON.parse(line));
}

/** The events as plain JSON, as a timeline file holds them. */
export const plain = (events: readonly Envelope[]): readonly unknown[] => events.map((event): unknown => JSON.parse(JSON.stringify(event)));
