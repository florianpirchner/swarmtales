// SPDX-License-Identifier: Apache-2.0
/**
 * Run folder, JSONL sink, chain writer and run verification. The issues of milestone M1 fill this package.
 *
 * @packageDocumentation
 */

export { EventChain, type EventChainOptions } from "./chain-writer.ts";
export { briefingKey, GAME_FILE, MANIFEST_FILE, nextRunFolder, openRunFolder, TEXTS_FILE, type RunFolder, type RunFolderOptions } from "./folder.ts";
export { findLeaks } from "./leaks.ts";
export { createSink } from "./sink.ts";
export { readSnapshotFile, SNAPSHOTS_FOLDER, type SnapshotExpectation, writeSnapshotFile } from "./snapshot.ts";
export { type RunVerdict, type VerifyRunOptions, verifyRun } from "./verify.ts";
