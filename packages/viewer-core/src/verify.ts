/** The chain verdict of a loaded run, from `@swarmtales/chain` (the verifier `swt log verify` uses). */
import { CHAIN_FILE, type ChainVerdict, keyFingerprint, PUBLIC_KEY_FILE, verifyChainText } from "@swarmtales/chain";
import type { RunModel } from "./load.ts";

export type RunVerification =
	/**
	 * No chain to check: the run has no `events.chain.jsonl` (written before the chain, or by a library
	 * caller), or, with `unreadable`, the file is there but could not be read (a rate limit, a 403).
	 */
	| { readonly signed: false; readonly unreadable?: string }
	| {
			readonly signed: true;
			readonly verdict: ChainVerdict;
			readonly checkedWith: "run.pub" | "given key";
			/** The fingerprint of the key the genesis names (first 16 hex digits of its sha256), to compare with a published copy. */
			readonly key?: string;
	  };

export interface VerifyRunOptions {
	/** A public key (PEM) published elsewhere, instead of the run's own `run.pub`. */
	readonly publicKey?: string;
}

/**
 * Checks the run's chain. With the run's own `run.pub` this proves the log matches the key in the run
 * folder, not more: whoever can replace the folder can write another log and sign it with a new key
 * (docs/design/event-log-signing.md, "The limit"). A key published elsewhere, compared by fingerprint
 * or passed as `publicKey`, is what ties the log to its author.
 */
export function verifyRun(model: RunModel, options: VerifyRunOptions = {}): RunVerification {
	const { chain } = model.texts;
	if (chain === undefined) {
		const issue = model.issues.find((one) => (one.file === CHAIN_FILE || one.file.endsWith(`/${CHAIN_FILE}`)) && one.reason.startsWith("could not be read"));
		return issue === undefined ? { signed: false } : { signed: false, unreadable: `${CHAIN_FILE} ${issue.reason}` };
	}
	const key = options.publicKey ?? model.texts.publicKey;
	const checkedWith = options.publicKey === undefined ? "run.pub" : "given key";
	const genesisKey = model.genesis?.publicKey;
	const fingerprint = genesisKey === undefined ? {} : { key: keyFingerprint(genesisKey) };
	if (key === undefined) return { signed: true, checkedWith, ...fingerprint, verdict: { ok: false, reason: `${PUBLIC_KEY_FILE} is missing in ${model.dir}` } };
	return { signed: true, checkedWith, ...fingerprint, verdict: verifyChainText(model.texts.events, chain, key) };
}
