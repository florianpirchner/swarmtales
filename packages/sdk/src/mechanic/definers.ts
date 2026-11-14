// SPDX-License-Identifier: Apache-2.0
/**
 * The small definers an author writes beside `defineMechanic`: a service contract, events and a tool declared
 * apart from their mechanic, and the two results of a tool call. Each returns what it was given, with its types
 * kept narrow.
 */
import type { TSchema } from "typebox";
import type { EventSchemas, EventsDefinition, Refusal, ServiceDefinition, ServiceMethods, ToolRef, ToolSuccess } from "@swarmtales/contracts";

/**
 * Declares a service contract apart from the mechanic that provides it, so a caller needs no value import of
 * the provider.
 *
 * @param service - The contract: name, summary and methods.
 * @returns The same contract, with the name and the methods as literal types.
 * @example
 * ```ts
 * const Board = defineService({
 * 	name: "board",
 * 	summary: "The board of the running game.",
 * 	methods: { cells: { kind: "query", summary: "Every cell.", input: Type.Object({}), output: Type.Array(Type.String()) } },
 * });
 * ```
 *
 * @public
 */
export function defineService<const N extends string, const M extends ServiceMethods>(service: ServiceDefinition<N, M>): ServiceDefinition<N, M> {
	return service;
}

/**
 * Declares a mechanic's events apart from it, for its head and for listeners that should not import it.
 *
 * @param id - The id of the mechanic that emits the events.
 * @param events - The payload schemas, by event type.
 * @returns The events definition.
 *
 * @public
 */
export function defineEvents<const Id extends string, const E extends EventSchemas>(id: Id, events: E): EventsDefinition<Id, E> {
	return { id, events };
}

/**
 * Declares a tool's bare name and parameters apart from its mechanic, for typed grants and locks.
 *
 * @param name - The bare name.
 * @param parameters - The schema of the arguments.
 * @returns The reference to the tool.
 *
 * @public
 */
export function defineTool<const N extends string, P extends TSchema>(name: N, parameters: P): ToolRef<N, P> {
	return { name, parameters };
}

/**
 * The answer of a tool call that ran.
 *
 * @param text - What the caller reads.
 * @param options - The options of the answer.
 * @param options.endsTurn - True when the call ends the caller's activation.
 * @returns The success; `endsTurn` is left out unless it is true.
 *
 * @public
 */
export function reply(text: string, options: { readonly endsTurn?: boolean } = {}): ToolSuccess {
	return options.endsTurn === true ? { ok: true, reply: text, endsTurn: true } : { ok: true, reply: text };
}

/**
 * Refuses a tool call. A refusal is part of the game: the caller reads it, and it is never an error.
 *
 * @param code - The refusal code; callers read it.
 * @param detail - The text for the caller.
 * @returns The refusal; `detail` is left out when none was given.
 *
 * @public
 */
export function refuse(code: string, detail?: string): Refusal {
	return detail === undefined ? { ok: false, code } : { ok: false, code, detail };
}
