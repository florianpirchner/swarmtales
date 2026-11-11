/**
 * `@swarmtales/chain`: the pure verifier of the signed event log (docs/design/event-log-signing.md).
 * No `node:*` import, no `Buffer`: the CLI (through `@swarmtales/chronicle`), a browser and a Web
 * Worker give one verdict. Signing stays in `@swarmtales/chronicle` (`EventChain`, `node:crypto`).
 */
export { canonicalJson, CanonicalJsonError, iJsonIssue, wellFormed } from "./canonical.ts";
export { keyFingerprint } from "./keys.ts";
export {
	CHAIN_FILE,
	CHAIN_FORMAT,
	CHAIN_VERSION,
	ChainCheckpointSchema,
	ChainGenesisSchema,
	EVENTS_FILE,
	GenesisEntrySchema,
	PUBLIC_KEY_FILE,
	ZERO_HASH,
	type ChainCheckpoint,
	type ChainGenesis,
	type ChainGenesisInput,
	type ChainVerdict,
} from "./schemas.ts";
export {
	checkpointVerifies,
	headMessage,
	jsonHash,
	linkHash,
	snapshotStateHash,
	verifyChainText,
	verifyContinuityText,
	type ChainTexts,
	type ContinuityTextOptions,
} from "./verify.ts";
