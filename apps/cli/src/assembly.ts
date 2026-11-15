// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * What a fake run and a live run assemble alike since M3: the manifest with the drivers of Directors and of the
 * human and the field `human`, and the part of the run loop that the flags `--hand` and `--snapshot-at` fill.
 */
import { SwtError, type Kernel, type Redact, type RunManifest } from "@swarmtales/contracts";
import { buildManifest, DIRECTOR_RECORDS, type ManifestRun } from "@swarmtales/engine";
import { writeSnapshotFile, type RunFolder, type SnapshotSessions } from "@swarmtales/runlog";
import { DIRECTOR_KIND, type ResolvedGame } from "@swarmtales/sdk";
import { badUsage } from "./errors.ts";
import type { PauseOn } from "./flags.ts";
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
export type LoopOptions = Pick<LoopInput, "ticks" | "hand" | "snapshotAt" | "writeSnapshot" | "pauseOn"> & {
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
 * Finds the event of `--pause-on` in the game: the envelope source of the mechanic and the type it declares.
 *
 * @param game - The resolved game.
 * @param pauseOn - The mechanic and the event as written.
 * @returns What the run loop compares the log with.
 * @throws SwtError `SWT-C003` when the game has no mechanic of that id, or the mechanic declares no event of that type.
 *
 * @public
 */
export function pauseEvent(game: ResolvedGame, pauseOn: PauseOn): NonNullable<LoopInput["pauseOn"]> {
	const plugin = game.definition.plugins.find((item) => item.id === pauseOn.mechanic);
	const name = `${pauseOn.mechanic}.${pauseOn.event}`;
	if (plugin === undefined || !Object.hasOwn(plugin.events, pauseOn.event)) throw new SwtError(badUsage({ problem: `\`--pause-on ${name}\` names no event of a mechanic of the game "${game.definition.game.id}"` }));
	return { source: `${plugin.package}/${plugin.id}`, type: pauseOn.event, name };
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
 * @param flags.pauseOn - The event of `--pause-on`, found by `pauseEvent`; no pause when absent.
 * @param flags.sessions - The conversations of a live run's model actors, saved into each snapshot (`save` of the model drivers); none when absent.
 * @param flags.redact - The run's redaction, which the saved sessions are checked with.
 * @returns The options for `played`.
 *
 * @public
 */
export function loopOf(game: ResolvedGame, kernel: Kernel, folder: () => RunFolder | undefined, flags: LoopFlags): LoopOptions {
	const writeSnapshot = async (tick: number): Promise<void> => {
		const open = folder();
		if (open === undefined) throw new RangeError("a snapshot was asked for before the run folder was open");
		await writeSnapshotFile(open, kernel.snapshot(), tick, flags.sessions === undefined ? {} : { sessions: flags.sessions(), ...(flags.redact === undefined ? {} : { redact: flags.redact }) });
	};
	const { hand, warn, pauseOn } = flags;
	return { ticks: game.definition.limits.maxTicks, ...(hand === undefined ? {} : { hand }), snapshotAt: flags.snapshotAt ?? [], writeSnapshot, ...(warn === undefined ? {} : { warn }), ...(pauseOn === undefined ? {} : { pauseOn }) };
}

interface LoopFlags {
	readonly hand?: HandSource | undefined;
	readonly snapshotAt?: readonly number[] | undefined;
	readonly warn?: (line: string) => void;
	readonly pauseOn?: LoopInput["pauseOn"] | undefined;
	readonly sessions?: () => SnapshotSessions;
	readonly redact?: Redact;
}
