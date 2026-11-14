// SPDX-License-Identifier: Apache-2.0
/** The log envelope and the lines of an activation's inputs. The schemas live in `schemas.ts`. */
import type { ActorId } from "./actor.ts";

/**
 * One event of the log.
 *
 * @public
 */
export interface Envelope<T extends string = string, P = unknown> {
	/** The commit order: from 1, no gaps. */
	readonly seq: number;
	/** Logical time, from 0. */
	readonly tick: number;
	/** `"kernel"`, `"driver"`, or the canonical plugin name `<package>/<id>`. */
	readonly source: string;
	/** The event type: bare, unique within its source. */
	readonly type: T;
	/** Who caused the chain this event belongs to. */
	readonly actor: ActorId;
	/** The seq this event is a consequence of; always smaller than `seq`. */
	readonly causedBy?: number;
	/** The highest seq the actor had seen when it decided; on `activation_opened` and `tool_called` only. */
	readonly basis?: number;
	/** The canonical tool name of the call this event was written in. */
	readonly tool?: string;
	/** The grant names that may read the event; absent: everyone. */
	readonly audience?: readonly string[];
	/** The event's data, as its declared schema describes it. */
	readonly payload: P;
}

/**
 * The format name of an event log.
 *
 * @public
 */
export const LOG_FORMAT = "swarmtales.events";

/**
 * The version of the event log format.
 *
 * @public
 */
export const LOG_VERSION = 1;

/**
 * One line of an activation's inputs as shown, tagged with the plugin id that gave it.
 *
 * @public
 */
export interface InputNote {
	/** The id of the plugin that gave the line. */
	readonly source: string;
	/** The kind of the line; the scheduler arranges the lines by it. */
	readonly kind?: string;
	/** The text as shown. */
	readonly text: string;
}

/**
 * What an `inputs` hook returns per line; within a kind, lines sort by `order` (0 when left out).
 *
 * @public
 */
export type InputLine = string | { readonly kind: string; readonly text: string; readonly order?: number };

/**
 * A hook's line before it is arranged: the note plus its sort key.
 *
 * @public
 */
export interface OrderedNote extends InputNote {
	/** The sort key within the kind; 0 when left out. */
	readonly order?: number;
}
