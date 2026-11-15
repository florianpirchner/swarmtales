// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The chain verdict of a loaded run, from `@swarmtales/chain` (the verifier `swt log verify` uses). */
import { CHAIN_FILE, type ChainVerdict, keyFingerprint, PUBLIC_KEY_FILE, type RunTexts, verifyChainText, verifyRunTexts } from "@swarmtales/chain";
import { envelopeLogIssues } from "@swarmtales/contracts";
import { envelopeLines } from "./envelope.ts";
import type { RunModel } from "./load.ts";

/**
 * What the check of a run's chain says.
 *
 * @public
 */
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

/**
 * What `verifyRun` takes beside the run.
 *
 * @public
 */
export interface VerifyRunOptions {
	/** A public key (PEM) published elsewhere, instead of the run's own `run.pub`. */
	readonly publicKey?: string;
}

// Checks a run of the new platform: the chain and the manifest it names (`verifyRunTexts`), then the order
// of the log (`envelopeLogIssues`). A fault of the chain is reported before a fault of the order.
function envelopeVerdict(texts: RunTexts): ChainVerdict {
	const verdict = verifyRunTexts(texts);
	if (!verdict.ok) return verdict;
	const fault = envelopeLogIssues(envelopeLines(texts.events))[0];
	return fault === undefined ? verdict : { ok: false, kind: "chain", line: fault.line, reason: fault.reason };
}

/**
 * Checks the run's chain. With the run's own `run.pub` this proves the log matches the key in the run
 * folder, not more: whoever can replace the folder can write another log and sign it with a new key.
 * A key published elsewhere, compared by fingerprint or passed as `publicKey`, is what ties the log to
 * its author. A run of the new platform is also checked against its manifest and for the order of its lines.
 *
 * @param model - The loaded run; the texts it keeps are the ones that are checked.
 * @param options - A public key published elsewhere, instead of the run's own.
 * @returns Whether the run is signed, and the verdict of the chain when it is.
 * @public
 */
export function verifyRun(model: RunModel, options: VerifyRunOptions = {}): RunVerification {
	const { chain, events, manifest } = model.texts;
	if (chain === undefined) {
		const issue = model.issues.find((one) => (one.file === CHAIN_FILE || one.file.endsWith(`/${CHAIN_FILE}`)) && one.reason.startsWith("could not be read"));
		return issue === undefined ? { signed: false } : { signed: false, unreadable: `${CHAIN_FILE} ${issue.reason}` };
	}
	const key = options.publicKey ?? model.texts.publicKey;
	const checkedWith = options.publicKey === undefined ? "run.pub" : "given key";
	const genesisKey = model.genesis?.publicKey;
	const fingerprint = genesisKey === undefined ? {} : { key: keyFingerprint(genesisKey) };
	if (key === undefined) return { signed: true, checkedWith, ...fingerprint, verdict: { ok: false, kind: "signature", reason: `${PUBLIC_KEY_FILE} is missing in ${model.dir}` } };
	const verdict = manifest === undefined ? verifyChainText(events, chain, key) : envelopeVerdict({ events, chain, publicKey: key, manifest });
	return { signed: true, checkedWith, ...fingerprint, verdict };
}
