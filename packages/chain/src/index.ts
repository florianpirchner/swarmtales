// SPDX-License-Identifier: Apache-2.0
/**
 * Pure verifier of the signed, hash-chained log of a run. No `node:*` import, no `Buffer`: the command line, a
 * browser and a Web Worker give one verdict. Signing needs `node:crypto` and lives in `@swarmtales/runlog`.
 * The index exports what production code uses; helpers only tests need stay in their source files.
 *
 * @packageDocumentation
 */
export { CanonicalJsonError, canonicalJson, wellFormed } from "./canonical.ts";
export { type ContinuityTextOptions, verifyContinuityText } from "./continuity.ts";
export { checkpointVerifies, headMessage, jsonHash, snapshotStateHash } from "./hashes.ts";
export { keyFingerprint } from "./keys.ts";
export { type RunTexts, verifyRunTexts } from "./run.ts";
export {
	CHAIN_FILE,
	CHAIN_FORMAT,
	CHAIN_VERSION,
	ChainCheckpointSchema,
	ChainGenesisSchema,
	ChainGenesisV2Schema,
	EVENTS_FILE,
	GenesisEntrySchema,
	PUBLIC_KEY_FILE,
	ZERO_HASH,
	type ChainBroken,
	type ChainCheckpoint,
	type ChainGenesis,
	type ChainGenesisInput,
	type ChainGenesisV2,
	type ChainGenesisV2Input,
	type ChainHolds,
	type ChainVerdict,
	type VerifiedHead,
} from "./schemas.ts";
export { type ChainTexts, verifyChainText } from "./verify.ts";
