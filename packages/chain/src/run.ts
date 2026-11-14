// SPDX-License-Identifier: Apache-2.0
/** The verifier of a run of the new platform: the chain of version 2 and the manifest it names. */
import { iJsonIssue } from "./canonical.ts";
import { jsonHash, parseJson } from "./hashes.ts";
import type { ChainVerdict } from "./schemas.ts";
import { type ChainTexts, verifyChainText } from "./verify.ts";

/** The four texts of a run: the three of the chain and `manifest.json`. @public */
export interface RunTexts extends ChainTexts {
	/** The text of `manifest.json`. */
	readonly manifest: string;
}

/**
 * Checks a run: `verifyChainText`, and the genesis is of version 2 and names the hash of the manifest given.
 * A fault in the chain is reported before a fault in the manifest.
 *
 * @param texts - The texts of `events.jsonl`, `events.chain.jsonl`, `run.pub` and `manifest.json`.
 * @returns The chain's verdict, or the fault: an old genesis, a manifest that is not JSON, or a manifest whose
 * hash is not the one the genesis names.
 * @public
 */
export function verifyRunTexts(texts: RunTexts): ChainVerdict {
	const verdict = verifyChainText(texts.events, texts.chain, texts.publicKey);
	if (!verdict.ok) return verdict;
	if (verdict.genesis.version !== 2) return { ok: false, kind: "manifest", reason: `the genesis is of version ${String(verdict.genesis.version)}, a run names its manifest in a genesis of version 2` };
	const manifest = parseJson(texts.manifest);
	if (!manifest.ok) return { ok: false, kind: "manifest", reason: "the manifest is not JSON" };
	const issue = iJsonIssue(texts.manifest, manifest.value);
	if (issue !== undefined) return { ok: false, kind: "manifest", reason: `the manifest is not I-JSON (${issue}): JSON parsers may read it differently` };
	if (jsonHash(manifest.value) !== verdict.genesis.manifest) return { ok: false, kind: "manifest", reason: "the manifest does not match the genesis (the manifest was changed, or it is another run's)" };
	return verdict;
}
