// SPDX-License-Identifier: Apache-2.0
/** The run folder: where it is, and the files a run writes into it before its first event. */
import type { KeyObject } from "node:crypto";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type ChainGenesisV2Input, canonicalJson, jsonHash } from "@swarmtales/chain";
import { type EventSink, type RunManifest, RunManifestSchema, SwtError, type SwtIssue } from "@swarmtales/contracts";
import { Check, Errors } from "typebox/value";
import { EventChain } from "./chain-writer.ts";
import { createSink } from "./sink.ts";

/** The manifest of a run, canonical JSON. @public */
export const MANIFEST_FILE = "manifest.json";
/** The resolved game definition, canonical JSON: what the manifest's `game.hash` hashes. @public */
export const GAME_FILE = "game.json";
/** Key to text, canonical JSON: every text the manifest names by hash. @public */
export const TEXTS_FILE = "texts.json";

/** What {@link openRunFolder} needs beside the manifest. @public */
export interface RunFolderOptions {
	/** The clock that stamps each line: the wall clock in a run, a fixed clock in a test. */
	readonly now: () => Date;
	/** The resolved game definition; written as `game.json` when given. */
	readonly game?: unknown;
	/** Key to text; written as `texts.json` when given. */
	readonly texts?: Readonly<Record<string, string>>;
	/** The snapshot the run resumed from, as the genesis states it. */
	readonly resumedFrom?: NonNullable<ChainGenesisV2Input["resumedFrom"]>;
	/** A fixed key pair instead of a fresh one; for tests only. */
	readonly keys?: { readonly publicKey: KeyObject; readonly privateKey: KeyObject };
}

/** An open run folder. @public */
export interface RunFolder {
	/** The sink that stamps, writes and chains each event; give it to the kernel. */
	readonly sink: EventSink;
	/** Signs the head when the run stopped without its end; does nothing after the sink was closed. */
	close(): void;
}

/**
 * The folder of the next run of a game under `root`: `<game id>-<NNN>`, NNN the next free number with three digits.
 *
 * @param root - The folder that holds the runs, usually `runs`; it need not exist.
 * @param gameId - The id of the game.
 * @returns The path of the folder; it is not created.
 * @public
 */
export function nextRunFolder(root: string, gameId: string): string {
	let names: readonly string[] = [];
	try {
		names = readdirSync(root);
	} catch {
		// No folder yet: the first run.
	}
	const taken = names.filter((name) => name.startsWith(`${gameId}-`) && /^\d+$/.test(name.slice(gameId.length + 1))).map((name) => Number(name.slice(gameId.length + 1)));
	return join(root, `${gameId}-${String(Math.max(0, ...taken) + 1).padStart(3, "0")}`);
}

/**
 * Checks a value against `RunManifestSchema`.
 *
 * @param manifest - The value: the manifest a run is opened with, or the parsed text of `manifest.json`.
 * @returns The first mismatch, as its place and what is wrong there; undefined when the value is a run manifest.
 */
export function manifestMismatch(manifest: unknown): string | undefined {
	if (Check(RunManifestSchema, manifest)) return undefined;
	const first = Errors(RunManifestSchema, manifest)[0];
	const place = first === undefined || first.instancePath === "" ? "" : `${first.instancePath} `;
	return `${place}${first?.message ?? "does not match its schema"}`;
}

// `SWT-L003` for a manifest that a caller built past the type (a cast, plain JavaScript, a value out of a range).
function notManifest(mismatch: string): SwtIssue {
	return {
		code: "SWT-L003",
		summary: `the manifest of the run is not a run manifest: ${mismatch}`,
		where: { file: MANIFEST_FILE },
		why: "A run folder is opened with a manifest that matches the run manifest format, so the run can be verified and compared later.",
		fix: "Build the manifest with the manifest builder of the engine, and correct the field that is named.",
	};
}

/**
 * Opens a run folder: writes `manifest.json` (and `game.json`, `texts.json` when given) as canonical JSON, the
 * genesis that names the manifest's hash, and the key, and returns the sink of the log.
 *
 * @param directory - The run folder; it is created.
 * @param manifest - The run's manifest.
 * @param options - The clock, the files beside the manifest, and a fixed key for tests.
 * @returns The sink and a `close` for a run that stopped without its end.
 * @throws SwtError `SWT-L003` when the manifest does not match `RunManifestSchema`; nothing is written then.
 * @throws Error of the file system when the folder already holds a manifest: a run folder is written once.
 * @throws CanonicalJsonError when the manifest, the game or the texts hold something that is no JSON value.
 * @example
 * ```ts
 * const folder = openRunFolder(nextRunFolder("runs", manifest.game.id), manifest, { now: () => new Date() });
 * ```
 *
 * @public
 */
export function openRunFolder(directory: string, manifest: RunManifest, options: RunFolderOptions): RunFolder {
	const mismatch = manifestMismatch(manifest);
	if (mismatch !== undefined) throw new SwtError(notManifest(mismatch));
	mkdirSync(directory, { recursive: true });
	writeFileSync(join(directory, MANIFEST_FILE), `${canonicalJson(manifest)}\n`, { flag: "wx" });
	if (options.game !== undefined) writeFileSync(join(directory, GAME_FILE), `${canonicalJson(options.game)}\n`);
	if (options.texts !== undefined) writeFileSync(join(directory, TEXTS_FILE), `${canonicalJson(options.texts)}\n`);
	const genesis: ChainGenesisV2Input = { manifest: jsonHash(manifest), log: manifest.log, ...(options.resumedFrom === undefined ? {} : { resumedFrom: options.resumedFrom }) };
	const chain = new EventChain(directory, genesis, options.keys === undefined ? {} : { keys: options.keys });
	return {
		sink: createSink(chain, options.now),
		close() {
			chain.close();
		},
	};
}
