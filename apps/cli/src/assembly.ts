// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * What a fake run and a live run assemble alike since M3: the manifest with the drivers of Directors and of the
 * human and the field `human`, and the part of the run loop that the flags `--hand` and `--snapshot-at` fill.
 */
import type { Kernel, RunManifest } from "@swarmtales/contracts";
import { buildManifest, DIRECTOR_RECORDS, type ManifestRun } from "@swarmtales/engine";
import { writeSnapshotFile, type RunFolder } from "@swarmtales/runlog";
import { DIRECTOR_KIND, type ResolvedGame } from "@swarmtales/sdk";
import type { HandSource, LoopInput } from "./loop.ts";

const HUMAN = "human";

/**
 * The driver id the manifest names for the actor `human`: the Human Hand of the command line.
 *
 * @public
 */
export const HAND_DRIVER = "@swarmtales/cli/hand";

/**
 * The part of `LoopInput` that a run adds to its kernel and its drivers, and where the warnings of the loop go.
 *
 * @public
 */
export type LoopOptions = Pick<LoopInput, "ticks" | "hand" | "snapshotAt" | "writeSnapshot"> & {
	/** Prints one warning line of the loop (`watched`): a refused line of the Human Hand, a `--snapshot-at` that wrote nothing. */
	readonly warn?: (line: string) => void;
};

/**
 * Builds the manifest of a run. A resident has the given driver id, a Director the id of the Director's driver
 * (`@swarmtales/engine/director`), the human `HAND_DRIVER`. `human: true` is set when the game has the actor
 * `human`, whether or not `--hand` was given.
 *
 * @param game - The resolved game.
 * @param run - The facts of the run, without the drivers.
 * @param resident - The driver id of the residents.
 * @returns The manifest.
 * @throws SwtError What `buildManifest` throws.
 *
 * @public
 */
export function runManifest(game: ResolvedGame, run: Omit<ManifestRun, "drivers">, resident: string): RunManifest {
	const { actors } = game.definition;
	const drivers = Object.fromEntries(actors.map((actor) => [actor.id, actor.kind === DIRECTOR_KIND ? DIRECTOR_RECORDS.id : actor.id === HUMAN ? HAND_DRIVER : resident]));
	const manifest = buildManifest(game, { ...run, drivers });
	return actors.some((actor) => actor.id === HUMAN) ? { ...manifest, human: true } : manifest;
}

/**
 * The loop part of a run: the ticks of the game, the Human Hand, and the snapshots, each written as
 * `<run>/snapshots/t<tick>.json` (`writeSnapshotFile` of the runlog) from `Kernel.snapshot`.
 *
 * @param game - The resolved game: its `maxTicks`.
 * @param kernel - The kernel of the run.
 * @param folder - The open run folder; undefined before the first event of a fake run.
 * @param flags - The Human Hand and the boundaries of `--snapshot-at`.
 * @param flags.hand - The Human Hand; none when absent.
 * @param flags.snapshotAt - The numbers of finished ticks after which a snapshot is written; none when absent.
 * @param flags.warn - Prints one warning line of the loop; nothing is printed when absent.
 * @returns The options for `played`.
 *
 * @public
 */
export function loopOf(game: ResolvedGame, kernel: Kernel, folder: () => RunFolder | undefined, flags: { readonly hand?: HandSource | undefined; readonly snapshotAt?: readonly number[] | undefined; readonly warn?: (line: string) => void }): LoopOptions {
	const writeSnapshot = async (tick: number): Promise<void> => {
		const open = folder();
		if (open === undefined) throw new RangeError("a snapshot was asked for before the run folder was open");
		await writeSnapshotFile(open, kernel.snapshot(), tick);
	};
	return { ticks: game.definition.limits.maxTicks, ...(flags.hand === undefined ? {} : { hand: flags.hand }), snapshotAt: flags.snapshotAt ?? [], writeSnapshot, ...(flags.warn === undefined ? {} : { warn: flags.warn }) };
}
