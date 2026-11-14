// SPDX-License-Identifier: Apache-2.0
/** Actors: who causes something in a run. The kernel treats every kind alike. */
import type { JsonValue } from "../values.ts";

/**
 * The id of an actor: `<kind>:<name>` with an open kind, or one of the three reserved ids.
 *
 * @public
 */
export type ActorId = `${string}:${string}` | "human" | "script" | "kernel";

/**
 * One actor of a run, as the kernel definition lists it.
 *
 * @public
 */
export interface ActorSpec {
	/** The actor's id. */
	readonly id: ActorId;
	/** The part of the id before the colon; a reserved id is its own kind. */
	readonly kind: string;
	/** The grant name its tools come from; the sdk writes the kind. */
	readonly grant: string;
	/** Attributes every plugin may read, written at genesis. */
	readonly shared: Readonly<Record<string, JsonValue>>;
}

/**
 * Builds the id of an actor from its kind and its name. It joins the two parts and checks nothing.
 *
 * @param kind - The kind, the part before the colon.
 * @param name - The name, the part after the colon.
 * @returns The id `<kind>:<name>`.
 *
 * @example
 * ```ts
 * actorId("worker", "A03"); // "worker:A03"
 * ```
 *
 * @public
 */
export function actorId(kind: string, name: string): ActorId {
	return `${kind}:${name}`;
}

/**
 * Reads the kind of an actor id.
 *
 * @param id - The actor id.
 * @returns The part before the first colon; a reserved id is its own kind.
 *
 * @public
 */
export function kindOf(id: ActorId): string {
	const colon = id.indexOf(":");
	return colon < 0 ? id : id.slice(0, colon);
}

/**
 * Reads the name of an actor id.
 *
 * @param id - The actor id.
 * @returns The part after the first colon; the id itself when it is reserved.
 *
 * @public
 */
export function nameOf(id: ActorId): string {
	const colon = id.indexOf(":");
	return colon < 0 ? id : id.slice(colon + 1);
}
