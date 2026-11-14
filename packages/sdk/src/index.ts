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

export { createKit, type KitBinding } from "./mechanic/kit.ts";
