// SPDX-License-Identifier: Apache-2.0
/**
 * Prompt file loader and lookup: the file format with its renderer, and the layered lookup over the game's
 * folder, the owning mechanic's folder and `library/prompts/`.
 *
 * @packageDocumentation
 */
export { PromptError } from "./errors.ts";
export { hasStrayBraces, parsePromptFile, placeholders, renderBody, type PromptFile } from "./file.ts";
export { libraryDir, libraryRoot } from "./library.ts";
export { createPromptLookup, mechanicPromptFolders, type LayeredPrompts, type PromptLookupOptions } from "./lookup.ts";
