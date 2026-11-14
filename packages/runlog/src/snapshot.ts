// SPDX-License-Identifier: Apache-2.0
/** The snapshot files of a run folder (`snapshots/t<tick>.json`): written between two ticks, read to resume. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ChainCheckpointSchema, canonicalJson, checkpointVerifies, jsonHash, snapshotStateHash } from "@swarmtales/chain";
import { type KernelSnapshot, KernelSnapshotSchema, SNAPSHOT_FILE_FORMAT, type SnapshotFile, SwtError } from "@swarmtales/contracts";
import { Type } from "typebox";
import { Check } from "typebox/value";
import { issue } from "./catalogue.ts";
import type { RunFolder } from "./folder.ts";

/** The folder of a run folder that holds its snapshot files. @public */
export const SNAPSHOTS_FOLDER = "snapshots";

const SnapshotFileSchema = Type.Object(
	{
		format: Type.Literal(SNAPSHOT_FILE_FORMAT, { description: "The version of the file format" }),
		runId: Type.String({ description: "The id of the run the snapshot was taken from" }),
		gameHash: Type.String({ description: "The game hash of the manifest the snapshot belongs to" }),
		tick: Type.Integer({ minimum: 0, description: "The last finished tick" }),
		snapshot: KernelSnapshotSchema,
		checkpoint: ChainCheckpointSchema,
	},
	{ additionalProperties: false, description: "A snapshot file: what a run resumes from" },
);

/** What the reader of a snapshot file expects of it; a field left out is not compared. @public */
export interface SnapshotExpectation {
	/** The id of the run that is resumed. */
	readonly runId?: string;
	/** The game hash of the manifest of the run that is resumed. */
	readonly gameHash?: string;
}

/**
 * Writes a snapshot of a run into its folder as `snapshots/t<tick>.json` (canonical JSON). The head of the chain
 * is signed together with the hash of the snapshot's state. No event is written: a run with and a run without a
 * snapshot have the same log.
 *
 * @param folder - The open run folder.
 * @param snapshot - The state of the kernel, taken between two ticks.
 * @param tick - The last finished tick.
 * @returns The path of the file and the hash of its content (`jsonHash`): the `resumedFrom.snapshotHash` of the
 * manifest of a run that resumes from it.
 * @throws CanonicalJsonError when the snapshot holds something that is no JSON value; nothing is signed then.
 * @example
 * ```ts
 * const { path, hash } = await writeSnapshotFile(folder, kernel.snapshot(), 6);
 * ```
 *
 * @public
 */
export async function writeSnapshotFile(folder: RunFolder, snapshot: KernelSnapshot, tick: number): Promise<{ readonly path: string; readonly hash: string }> {
	canonicalJson(snapshot);
	const checkpoint = folder.checkpoint(snapshotStateHash(snapshot));
	const file: SnapshotFile = { format: SNAPSHOT_FILE_FORMAT, runId: folder.manifest.run.id, gameHash: folder.manifest.game.hash, tick, snapshot, checkpoint };
	const path = join(folder.directory, SNAPSHOTS_FOLDER, `t${String(tick)}.json`);
	await mkdir(join(folder.directory, SNAPSHOTS_FOLDER), { recursive: true });
	await writeFile(path, `${canonicalJson(file)}\n`);
	return { path, hash: jsonHash(file) };
}

// Why a checked file is not the snapshot that was asked for, or undefined.
function fault(file: SnapshotFile, expected: SnapshotExpectation): string | undefined {
	if (!checkpointVerifies(file.checkpoint)) return "the signature of its checkpoint does not hold";
	if (file.checkpoint.state !== snapshotStateHash(file.snapshot)) return "its state is not the state its checkpoint signed";
	if (expected.runId !== undefined && expected.runId !== file.runId) return `it was taken from the run "${file.runId}", not from "${expected.runId}"`;
	if (expected.gameHash !== undefined && expected.gameHash !== file.gameHash) return "it was taken from a run of another game (the game hashes differ)";
	return undefined;
}

/**
 * Reads a snapshot file and checks it: its shape, the signature of its checkpoint, that the checkpoint signed
 * the state the file holds, and what the caller expects of it. That the checkpoint is a head of the run's chain is
 * what `verifyRun` with `previous` checks.
 *
 * @param path - The path of the file.
 * @param expected - The run and the game the snapshot must belong to.
 * @returns The snapshot file.
 * @throws SwtError `SWT-L008` when the file cannot be read, is no snapshot file, was changed after it was signed,
 * or belongs to another run or game.
 * @example
 * ```ts
 * const file = await readSnapshotFile("runs/hello-game-001/snapshots/t2.json", { gameHash: manifest.game.hash });
 * ```
 *
 * @public
 */
export async function readSnapshotFile(path: string, expected: SnapshotExpectation = {}): Promise<SnapshotFile> {
	const refuse = (reason: string): SwtError => new SwtError(issue("SWT-L008", `${path} is not a snapshot to resume from: ${reason}`, path));
	let value: unknown;
	try {
		value = JSON.parse(await readFile(path, "utf8"));
	} catch {
		throw refuse("it cannot be read as JSON");
	}
	if (!Check(SnapshotFileSchema, value)) throw refuse("it does not have the shape of a snapshot file");
	const reason = fault(value, expected);
	if (reason !== undefined) throw refuse(reason);
	return value;
}
