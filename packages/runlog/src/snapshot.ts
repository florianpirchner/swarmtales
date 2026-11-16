// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The snapshot files of a run folder (`snapshots/t<tick>.json`): written between two ticks, read to resume. A file
 * of a live run also holds the section `sessions`, the conversations of its model actors (M5 spec 4.5): opaque to
 * this package, which signs it with the kernel's state and refuses a secret in it.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ChainCheckpointSchema, canonicalJson, checkpointVerifies, jsonHash, snapshotStateHash } from "@swarmtales/chain";
import { type KernelSnapshot, KernelSnapshotSchema, type Redact, redactSecrets, SNAPSHOT_FILE_FORMAT, type SnapshotFile, SwtError, type SwtIssue } from "@swarmtales/contracts";
import { Type } from "typebox";
import { Check } from "typebox/value";
import { issue } from "./catalogue.ts";
import { type RunFolder, secretAt } from "./folder.ts";

/** The folder of a run folder that holds its snapshot files. @public */
export const SNAPSHOTS_FOLDER = "snapshots";

const SnapshotFileSchema = Type.Object(
	{
		format: Type.Literal(SNAPSHOT_FILE_FORMAT, { description: "The version of the file format" }),
		runId: Type.String({ description: "The id of the run the snapshot was taken from" }),
		gameHash: Type.String({ description: "The game hash of the manifest the snapshot belongs to" }),
		tick: Type.Integer({ minimum: 0, description: "The last finished tick" }),
		snapshot: KernelSnapshotSchema,
		sessions: Type.Optional(
			Type.Record(Type.String({ description: "The actor id" }), Type.Unknown({ description: "Its saved session, read by the models package" }), {
				description: "The conversation of every model actor, as its session saved it; signed with the state. Left out: a run without model actors",
			}),
		),
		checkpoint: ChainCheckpointSchema,
	},
	{ additionalProperties: false, description: "A snapshot file: what a run resumes from" },
);

/** The section `sessions` of a snapshot file: actor id to its saved session (JSON). @public */
export type SnapshotSessions = Readonly<Record<string, unknown>>;

/** A snapshot file with the section `sessions` of a live run. @public */
export interface SessionSnapshotFile extends SnapshotFile {
	/** The saved sessions; left out: a run without model actors. */
	readonly sessions?: SnapshotSessions;
}

/** What a snapshot file holds beside the kernel's state. @public */
export interface SnapshotExtras {
	/** The saved sessions of the model actors (`save` of the model drivers); left out: none. */
	readonly sessions?: SnapshotSessions;
	/** The redaction of the run; a string of `sessions` it would change is refused. `redactSecrets` when left out. */
	readonly redact?: Redact;
}

/**
 * Gives the state a checkpoint signs for a snapshot file: the kernel's state alone, or with the sessions when the
 * file holds them, so that a changed conversation shows like a changed slice.
 *
 * @param snapshot - The kernel's state.
 * @param sessions - The section `sessions`; left out: none.
 * @returns The hash in hex (`snapshotStateHash`).
 *
 * @internal
 */
export function snapshotFileState(snapshot: KernelSnapshot, sessions?: SnapshotSessions): string {
	return sessions === undefined ? snapshotStateHash(snapshot) : snapshotStateHash({ sessions, snapshot });
}

// `SWT-L006` for a snapshot whose sessions would hold a secret; it names the place, never the value.
function holdsSecret(file: string, path: string, redact: Redact): SwtIssue {
	const place = redact(path);
	return {
		code: "SWT-L006",
		summary: `${file} would hold a secret at "${place}"; the snapshot is not written`,
		where: { file, path: place },
		why: "A snapshot file is signed and copied with the run's data; a secret in a saved conversation cannot be taken out later.",
		fix: "Save the sessions through the run's redaction (`save` of the model drivers); a key comes from the environment only.",
	};
}

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
 * @param extras - The saved sessions of a live run, and the redaction they are checked with.
 * @returns The path of the file and the hash of its content (`jsonHash`): the `resumedFrom.snapshotHash` of the
 * manifest of a run that resumes from it.
 * @throws CanonicalJsonError when the snapshot or the sessions hold something that is no JSON value; nothing is
 * signed then.
 * @throws SwtError `SWT-L006` when `redact` would change a string of the sessions; nothing is signed or written then.
 * @example
 * ```ts
 * const { path, hash } = await writeSnapshotFile(folder, kernel.snapshot(), 6);
 * ```
 *
 * @public
 */
export async function writeSnapshotFile(folder: RunFolder, snapshot: KernelSnapshot, tick: number, extras: SnapshotExtras = {}): Promise<{ readonly path: string; readonly hash: string }> {
	const { sessions } = extras;
	const name = `t${String(tick)}.json`;
	canonicalJson(snapshot);
	if (sessions !== undefined) {
		canonicalJson(sessions);
		const redact = extras.redact ?? redactSecrets;
		const secret = secretAt({ sessions }, redact, "");
		if (secret !== undefined) throw new SwtError(holdsSecret(`${SNAPSHOTS_FOLDER}/${name}`, secret, redact));
	}
	const checkpoint = folder.checkpoint(snapshotFileState(snapshot, sessions));
	const file: SessionSnapshotFile = { format: SNAPSHOT_FILE_FORMAT, runId: folder.manifest.run.id, gameHash: folder.manifest.game.hash, tick, snapshot, ...(sessions === undefined ? {} : { sessions }), checkpoint };
	const path = join(folder.directory, SNAPSHOTS_FOLDER, name);
	await mkdir(join(folder.directory, SNAPSHOTS_FOLDER), { recursive: true });
	await writeFile(path, `${canonicalJson(file)}\n`);
	return { path, hash: jsonHash(file) };
}

// Why a checked file is not the snapshot that was asked for, or undefined.
function fault(file: SessionSnapshotFile, expected: SnapshotExpectation): string | undefined {
	if (!checkpointVerifies(file.checkpoint)) return "the signature of its checkpoint does not hold";
	if (file.checkpoint.state !== snapshotFileState(file.snapshot, file.sessions)) return "its state is not the state its checkpoint signed";
	if (expected.runId !== undefined && expected.runId !== file.runId) return `it was taken from the run "${file.runId}", not from "${expected.runId}"`;
	if (expected.gameHash !== undefined && expected.gameHash !== file.gameHash) return "it was taken from a run of another game (the game hashes differ)";
	return undefined;
}

/**
 * Reads a snapshot file and checks it: its shape, the signature of its checkpoint, that the checkpoint signed
 * the state the file holds (with its sessions), and what the caller expects of it. That the checkpoint is a head of the run's chain is
 * what `verifyRun` with `previous` checks.
 *
 * @param path - The path of the file.
 * @param expected - The run and the game the snapshot must belong to.
 * @returns The snapshot file; its `sessions` are checked by the models package (`parseSavedSessions`).
 * @throws SwtError `SWT-L008` when the file cannot be read, is no snapshot file, was changed after it was signed,
 * or belongs to another run or game.
 * @example
 * ```ts
 * const file = await readSnapshotFile("runs/hello-game-001/snapshots/t2.json", { gameHash: manifest.game.hash });
 * ```
 *
 * @public
 */
export async function readSnapshotFile(path: string, expected: SnapshotExpectation = {}): Promise<SessionSnapshotFile> {
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
