// SPDX-License-Identifier: Apache-2.0
/**
 * Types, schemas and closed vocabularies shared by every package. No behaviour.
 *
 * @packageDocumentation
 */

/**
 * The version of the game definition format.
 *
 * @remarks
 * A game file states this number, and a runner refuses a file with a version it does not know. Version 1 has one
 * format for every game and no `kind` field.
 *
 * @example
 * ```ts
 * import { GAME_FORMAT_VERSION } from "@swarmtales/contracts";
 *
 * const header = { version: GAME_FORMAT_VERSION };
 * ```
 *
 * @public
 */
export const GAME_FORMAT_VERSION = 1;

export { type RunManifest, RunManifestSchema } from "./run/index.ts";

export * from "./values.ts";
export * from "./kernel/index.ts";

export { GameDefinitionSchema, ResidentIdSchema, type GameData, type PromptLookup } from "./game/index.ts";
export { closest, formatIssue, SWT_CODE, SwtError, SwtIssueSchema, type SwtIssue } from "./error.ts";
