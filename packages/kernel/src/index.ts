// SPDX-License-Identifier: Apache-2.0
/**
 * The single-writer state machine over an append-only log. It calls no model, reads no file, no environment
 * variable and no wall clock. The index exports `createKernel`, the revision and the random streams.
 *
 * @packageDocumentation
 */
export { createKernel } from "./kernel.ts";
export { createRng, deriveSeed, rngFor, seedFrom } from "./random.ts";
export { RUNTIME_REVISION } from "./revision.ts";
