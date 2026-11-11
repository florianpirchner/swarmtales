/** The chain verdict of a loaded run, from `@swarmtales/chain` (the verifier `swt log verify` uses). */
import { type ChainVerdict, PUBLIC_KEY_FILE, verifyChainText } from "@swarmtales/chain";
import type { RunModel } from "./load.ts";

export type RunVerification =
	/** The run has no `events.chain.jsonl` (written before the chain, or by a library caller). */
	| { readonly signed: false }
	| { readonly signed: true; readonly verdict: ChainVerdict; readonly checkedWith: "run.pub" | "given key" };

export interface VerifyRunOptions {
	/** A public key (PEM) published elsewhere, instead of the run's own `run.pub`. */
	readonly publicKey?: string;
}

/**
 * Checks the run's chain. Without a published key this proves the log was not changed after its
 * key was fixed, not that the run was honest before (docs/design/event-log-signing.md, "The limit").
 */
export function verifyRun(model: RunModel, options: VerifyRunOptions = {}): RunVerification {
	const { chain } = model.texts;
	if (chain === undefined) return { signed: false };
	const key = options.publicKey ?? model.texts.publicKey;
	const checkedWith = options.publicKey === undefined ? "run.pub" : "given key";
	if (key === undefined) return { signed: true, checkedWith, verdict: { ok: false, reason: `${PUBLIC_KEY_FILE} is missing in ${model.dir}` } };
	return { signed: true, checkedWith, verdict: verifyChainText(model.texts.events, chain, key) };
}
