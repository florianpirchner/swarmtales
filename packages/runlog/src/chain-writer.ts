// SPDX-License-Identifier: Apache-2.0
/**
 * The signer of a run's log: it writes `events.jsonl`, the hash chain beside it (`events.chain.jsonl`) and the
 * run's public key (`run.pub`). Carried from the old `packages/chronicle/src/log/chain.ts` (`EventChain`); new is
 * the genesis of version 2 and that the writer itself writes each line of the log, as canonical JSON, so the bytes
 * of the file are the bytes that were hashed. Every verification is `@swarmtales/chain`'s pure verifier.
 *
 * Every run makes its own Ed25519 key pair; the private key lives only in this object's memory and is never
 * written or logged. A resumed run's genesis chains from the snapshot's checkpoint: its `previousHash` is the
 * checkpoint's hash.
 */
import { createHash, generateKeyPairSync, type KeyObject, sign } from "node:crypto";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CHAIN_FILE, CHAIN_FORMAT, CHAIN_VERSION, type ChainCheckpoint, type ChainGenesisV2, type ChainGenesisV2Input, canonicalJson, EVENTS_FILE, headMessage, PUBLIC_KEY_FILE, ZERO_HASH } from "@swarmtales/chain";

/**
 * One link with `node:crypto` (the writer's hot path); `@swarmtales/chain`'s `linkHash` gives the same hex.
 *
 * @param previous - The hash of the entry before.
 * @param text - The text of the line.
 * @returns The hash of the line in the chain, hex.
 */
export function nodeLinkHash(previous: string, text: string): string {
	return createHash("sha256").update(previous, "utf8").update(text, "utf8").digest("hex");
}

function derOf(key: KeyObject): string {
	return key.export({ type: "spki", format: "der" }).toString("base64");
}

// The line that ends a run: the kernel's `run_ended` envelope.
function isRunEnd(value: unknown): boolean {
	return typeof value === "object" && value !== null && Reflect.get(value, "type") === "run_ended" && Reflect.get(value, "source") === "kernel";
}

/** The options of an {@link EventChain}. @public */
export interface EventChainOptions {
	/** A fixed key pair instead of a fresh one; for tests only (the chain's determinism). */
	readonly keys?: { readonly publicKey: KeyObject; readonly privateKey: KeyObject };
}

/**
 * Writes `events.jsonl`, `events.chain.jsonl` and `run.pub` of one run. Nothing else may append to the log.
 *
 * @example
 * ```ts
 * const chain = new EventChain(directory, { manifest: jsonHash(manifest), log: manifest.log });
 * chain.append({ seq: 1, tick: 0, source: "kernel", type: "run_started", actor: "kernel", payload: {}, at });
 * chain.close();
 * ```
 *
 * @public
 */
export class EventChain {
	readonly #events: string;
	readonly #path: string;
	readonly #privateKey: KeyObject;
	/** The run's public key, base64 SPKI DER. */
	readonly publicKey: string;
	/** The hash of the genesis entry. */
	readonly genesisHash: string;
	#lines = 0;
	#head: string;
	/** Lines covered by the last signed head (-1: none yet). */
	#signed = -1;
	#checkpoint: ChainCheckpoint | undefined;

	/**
	 * Creates the folder, an empty log, the key file and the chain with its genesis of version 2.
	 *
	 * @param directory - The run folder.
	 * @param input - What the genesis states: the manifest's hash and the log format.
	 * @param options - A fixed key pair, for tests.
	 */
	constructor(directory: string, input: ChainGenesisV2Input, options: EventChainOptions = {}) {
		mkdirSync(directory, { recursive: true });
		const keys = options.keys ?? generateKeyPairSync("ed25519");
		this.#privateKey = keys.privateKey;
		this.publicKey = derOf(keys.publicKey);
		writeFileSync(join(directory, PUBLIC_KEY_FILE), keys.publicKey.export({ type: "spki", format: "pem" }));
		const genesis: ChainGenesisV2 = { format: CHAIN_FORMAT, version: CHAIN_VERSION, algorithm: "ed25519", digest: "sha256", canonical: "RFC 8785", publicKey: this.publicKey, ...input };
		const previousHash = input.resumedFrom?.checkpoint?.hash ?? ZERO_HASH;
		this.genesisHash = nodeLinkHash(previousHash, canonicalJson(genesis));
		this.#head = this.genesisHash;
		this.#events = join(directory, EVENTS_FILE);
		this.#path = join(directory, CHAIN_FILE);
		writeFileSync(this.#events, "");
		writeFileSync(this.#path, `${JSON.stringify({ kind: "genesis", seq: 0, previousHash, hash: this.genesisHash, genesis })}\n`);
	}

	/**
	 * Writes one line of `events.jsonl` as canonical JSON and chains it; a line that ends the run is signed at once.
	 *
	 * @param value - The line's value, a stored envelope.
	 * @throws CanonicalJsonError when the value holds something that is no JSON value; nothing is written then.
	 */
	append(value: unknown): void {
		const line = canonicalJson(value);
		this.#lines += 1;
		this.#head = nodeLinkHash(this.#head, line);
		appendFileSync(this.#events, `${line}\n`);
		appendFileSync(this.#path, `{"seq":${String(this.#lines)},"hash":"${this.#head}"}\n`);
		if (isRunEnd(value)) this.#sign();
	}

	/**
	 * The state of the chain.
	 *
	 * @returns The lines chained so far and the hash of the last.
	 */
	head(): { readonly lines: number; readonly hash: string } {
		return { lines: this.#lines, hash: this.#head };
	}

	/**
	 * Signs the head now (a snapshot's checkpoint); a resumed run's genesis chains from it.
	 *
	 * @param state - The snapshot's `snapshotStateHash`, signed with the head.
	 * @returns The checkpoint.
	 */
	checkpoint(state?: string): ChainCheckpoint {
		return this.#sign(state);
	}

	/** Signs the head when lines came after the last signature. Call once the run's last line is written. */
	close(): void {
		if (this.#signed !== this.#lines) this.#sign();
	}

	#sign(state?: string): ChainCheckpoint {
		if (this.#signed === this.#lines && this.#checkpoint !== undefined && (state === undefined || this.#checkpoint.state === state)) return this.#checkpoint;
		const signature = sign(null, Buffer.from(headMessage(this.genesisHash, this.#lines, this.#head, state), "utf8"), this.#privateKey).toString("base64");
		appendFileSync(this.#path, `${JSON.stringify({ kind: "head", seq: this.#lines, hash: this.#head, ...(state === undefined ? {} : { state }), signature })}\n`);
		this.#signed = this.#lines;
		this.#checkpoint = { genesis: this.genesisHash, lines: this.#lines, hash: this.#head, publicKey: this.publicKey, signature, ...(state === undefined ? {} : { state }) };
		return this.#checkpoint;
	}
}
