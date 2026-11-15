// SPDX-License-Identifier: Apache-2.0
/**
 * Authoring: defineMechanic, defineGame and game resolution. The issues of milestone M1 fill this package.
 *
 * @packageDocumentation
 */
export { defineEvents, defineService, defineTool, refuse, reply } from "./mechanic/definers.ts";
export { loadOrder, type LoadOrder, type LoadOrderEntry } from "./game/load-order.ts";
export * from "./errors.ts";

export type * from "./mechanic/context-types.ts";
export type * from "./mechanic/types.ts";
export type * from "./mechanic/parts.ts";
export type * from "./game/types.ts";

export { actorOf, contextFor, residentOf, viewFor, RESIDENT_KIND } from "./mechanic/context.ts";
export { bindHooks, bindStages } from "./mechanic/hooks.ts";
export { convertArguments } from "./mechanic/arguments.ts";
export { inSchemaOrder } from "./mechanic/schema-order.ts";

export { createKit, type KitBinding } from "./mechanic/kit.ts";

export { defineGame, definitionsOf, gameData } from "./game/define-game.ts";
export { resolveGrants, type GrantsInput, type ResolvedGrants } from "./game/grants.ts";
export { shownNameClashes, toolNames, type NamedTool, type ToolNames, type ToolSource } from "./game/tool-names.ts";

export { actorsOf, checkSchema, directorsOf, mechanicsOf, residentsOf, type UsedMechanic } from "./game/validate.ts";
export { appendRoster, rosterPlugin, RosterService } from "./roster/index.ts";

export { defineHandlers, defineHead } from "./mechanic/define-head.ts";
export { defineMetric, type MetricEvent, type MetricSpec } from "./mechanic/metrics.ts";
export { defineMechanic } from "./mechanic/define-mechanic.ts";

export { resolveGame } from "./game/resolve.ts";
export { defineDirector, type DirectorActContext, type DirectorBody, type DirectorContext, type DirectorDefinition, type DirectorHead, type DirectorLimits, type DirectorTrigger, type Firing } from "./director/define.ts";
export { directorsPlugin, NOT_A_DIRECTOR, parseTake, TakeAnswerSchema, type TakeAnswer } from "./director/plugin.ts";
export { directorGrants, resolveDirectors, DIRECTOR_KIND, DIRECTOR_TAKE, DIRECTORS_PLUGIN, type DirectorsInput } from "./game/directors.ts";
export { defineGameFamily, familyParams, isGameFamily, type GameFamily } from "./game/family.ts";
export { collectTexts, type CollectedTexts, type TextSource } from "./game/texts.ts";
