// SPDX-License-Identifier: Apache-2.0
/** Event definitions: the events a plugin declares. */
import type { TSchema } from "typebox";

/**
 * The payload schemas of a plugin's events, by event type.
 *
 * @public
 */
export type EventSchemas = Readonly<Record<string, TSchema>>;

/**
 * Events declared apart from the plugin that emits them, so a listener needs no value import of it.
 *
 * @public
 */
export interface EventsDefinition<Id extends string = string, E extends EventSchemas = EventSchemas> {
	/** The id of the plugin that emits the events. */
	readonly id: Id;
	/** The payload schemas, by event type. */
	readonly events: E;
}
