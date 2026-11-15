// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The chain's hashes and the small text helpers its verifiers share. Line `n`'s hash is
 * `sha256(hash(n-1) + canonicalJson(line n))` (RFC 8785, hex digests, UTF-8), starting from the genesis entry's
 * hash. A head entry signs `{format, genesis, lines, hash}` (and a checkpoint's snapshot `state`) with the run's
 * Ed25519 key.
 */
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "./bytes.ts";
import { canonicalJson } from "./canonical.ts";
import { publicKeyFromDer, signatureVerifies } from "./keys.ts";
import { type ChainCheckpoint, HEAD_FORMAT } from "./schemas.ts";

/**
 * Hashes one link: `sha256(previous + text)`.
 *
 * @param previous - The hash before, in hex.
 * @param text - The canonical text of the link.
 * @returns The hash in hex.
 */
export function linkHash(previous: string, text: string): string {
	return bytesToHex(sha256(utf8ToBytes(previous + text)));
}

/**
 * Hashes a JSON value (a log line, the genesis, a manifest, a game): sha256 of its canonical JSON.
 *
 * @param value - A value as `JSON.parse` returns it.
 * @returns The hash in hex.
 * @throws CanonicalJsonError when the value holds something that is no JSON value.
 * @public
 */
export function jsonHash(value: unknown): string {
	return bytesToHex(sha256(utf8ToBytes(canonicalJson(value))));
}

/**
 * Builds the text a head signature is made over (sign its UTF-8 bytes); a checkpoint's head also signs its
 * snapshot's state.
 *
 * @param genesis - The genesis hash of the chain.
 * @param lines - How many lines the head covers.
 * @param hash - The hash of the last covered line.
 * @param state - The snapshot's state hash, for a checkpoint.
 * @returns The canonical head message.
 * @public
 */
export function headMessage(genesis: string, lines: number, hash: string, state?: string): string {
	return canonicalJson({ format: HEAD_FORMAT, genesis, lines, hash, ...(state === undefined ? {} : { state }) });
}

/**
 * Gives the state hash of a snapshot file (a parsed run file, untrusted): sha256 of its canonical JSON
 * without its `chain`. What a checkpoint signs as `state` and what a resume compares against.
 *
 * @param file - The parsed snapshot file.
 * @returns The hash in hex.
 * @public
 */
export function snapshotStateHash(file: unknown): string {
	const value: unknown = JSON.parse(JSON.stringify(file));
	if (typeof value !== "object" || value === null || Array.isArray(value)) return jsonHash(value);
	return jsonHash(Object.fromEntries(Object.entries(value).filter(([key]) => key !== "chain")));
}

/**
 * Checks a checkpoint's signature under the key it names.
 *
 * @param checkpoint - The checkpoint.
 * @returns True when the signature holds.
 * @public
 */
export function checkpointVerifies(checkpoint: ChainCheckpoint): boolean {
	const key = publicKeyFromDer(checkpoint.publicKey);
	return key !== undefined && signatureVerifies(key, utf8ToBytes(headMessage(checkpoint.genesis, checkpoint.lines, checkpoint.hash, checkpoint.state)), checkpoint.signature);
}

/**
 * Splits a JSONL text into its lines, without the empty string after its last newline.
 *
 * @param text - The JSONL text.
 * @returns The lines.
 */
export function linesOf(text: string): readonly string[] {
	const lines = text.split("\n");
	if (lines.at(-1) === "") lines.pop();
	return lines;
}

/** A parsed JSON text, or the fact that it is none. */
export type Parsed = { readonly ok: true; readonly value: unknown } | { readonly ok: false };

/**
 * Parses a JSON text without throwing.
 *
 * @param text - The text.
 * @returns The value, or `ok: false` when the text is not JSON.
 */
export function parseJson(text: string): Parsed {
	try {
		const value: unknown = JSON.parse(text);
		return { ok: true, value };
	} catch {
		return { ok: false };
	}
}

/**
 * Reads the `type` of a parsed log line.
 *
 * @param value - The parsed line.
 * @param name - The field to read.
 * @returns The field's value, or `undefined` when the line is no object.
 */
export function fieldOf(value: unknown, name: string): unknown {
	return typeof value === "object" && value !== null ? Reflect.get(value, name) : undefined;
}
