// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The snapshot file of a run (`<run>/snapshots/t<tick>.json`): the kernel's state between two ticks with the
 * signed head of the chain at that point. A run resumes from it. No behaviour.
 */
import type { KernelSnapshot } from "../kernel/kernel-def.ts";

/**
 * The version of the snapshot file format.
 *
 * @public
 */
export const SNAPSHOT_FILE_FORMAT = 1;

/**
 * The signed head of a chain, as a snapshot file carries it. It has the fields of the chain package's
 * `ChainCheckpoint`, which this package may not import; a value of either type is one of the other.
 *
 * @public
 */
export interface SnapshotCheckpoint {
	/** The genesis hash of the chain the head belongs to. */
	readonly genesis: string;
	/** How many lines of the event log the head covers. */
	readonly lines: number;
	/** The hash of the last line it covers. */
	readonly hash: string;
	/** The chain's public key (base64 SPKI DER). */
	readonly publicKey: string;
	/** The signature over the canonical head message (base64). */
	readonly signature: string;
	/** The hash of the snapshot's state (`snapshotStateHash`), signed with the head. */
	readonly state?: string;
}

/**
 * A snapshot file: what a run resumes from.
 *
 * @public
 */
export interface SnapshotFile {
	/** The version of the file format, {@link SNAPSHOT_FILE_FORMAT}. */
	readonly format: 1;
	/** The id of the run the snapshot was taken from. */
	readonly runId: string;
	/** The game hash of the manifest the snapshot belongs to. */
	readonly gameHash: string;
	/** The last finished tick. */
	readonly tick: number;
	/** The state of the kernel after that tick. */
	readonly snapshot: KernelSnapshot;
	/** The signed head of the chain; its `state` is `snapshotStateHash(snapshot)`. */
	readonly checkpoint: SnapshotCheckpoint;
}
