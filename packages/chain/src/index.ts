/**
 * `@swarmtales/chain`: the pure verifier of the signed event log (docs/design/event-log-signing.md).
 * No `node:*` import, no `Buffer`: the CLI (through `@swarmtales/chronicle`), a browser and a Web
 * Worker give one verdict. Signing stays in `@swarmtales/chronicle` (`EventChain`, `node:crypto`).
 * The index exports what production code uses; helpers only tests need stay in their source files.
 */
export { canonicalJson, wellFormed } from "./canonical.ts";
export { keyFingerprint } from "./keys.ts";
export {
	CHAIN_FILE,
	CHAIN_FORMAT,
	CHAIN_VERSION,
	ChainCheckpointSchema,
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
	snapshotStateHash,
	verifyChainText,
	verifyContinuityText,
	type ChainTexts,
} from "./verify.ts";
