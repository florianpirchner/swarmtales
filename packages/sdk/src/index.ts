/**
 * What a story author imports: the builder DSL, the validator, the story shape (re-exported from
 * `@swarmtales/contracts`) and the few helpers story texts use.
 */
export * from "./define.ts";
export * from "./validate.ts";
export * from "./cast/figures.ts";
export * from "@swarmtales/contracts";
export { placeholdersOf, renderTemplate, resolveCount, TemplateError, unknownPlaceholders, type CheckedTemplate, type PlaceholdersOf } from "@swarmtales/kernel";
export { ladderSteps, ladderText, penaltyAt } from "./rules.ts";
export { isSystemAuthor, SYSTEM_AUTHORS } from "./authors.ts";
