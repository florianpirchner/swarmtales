// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The log envelope and the lines of an activation's inputs. The schemas live in `schemas.ts`. */
import type { ActorId } from "./actor.ts";

/**
 * One event of the log: who caused it (`actor`), when (`tick`), who wrote it (`source`), what it says (`type`,
 * `payload`) and what it follows from (`causedBy`). The log is the single record of a run; `seq` is its order.
 *
 * @example
 * ```ts
 * const event: Envelope = { seq: 12, tick: 0, source: "kernel", type: "tool_called", actor: "worker:A01", causedBy: 9, basis: 11, tool: "@example/mechanic-counter/counter/add", payload: { as: "add", params: { by: 1 } } };
 * ```
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
	/**
	 * The highest seq the actor had seen when it decided; on `activation_opened` and `tool_called` only. For an
	 * activation it is the log length when its inputs were built; for a later call of the same activation it is the
	 * seq of the result or refusal of the call before.
	 */
	readonly basis?: number;
	/**
	 * The canonical tool name of the call this event was written in: on `tool_called`, `tool_refused`, `tool_result`
	 * and on every event a plugin emits while the call runs. Absent outside a call, and when the name the caller
	 * used stands for no tool it holds.
	 */
	readonly tool?: string;
	/** The grant names that may read the event; absent: everyone. Written only when the emitting plugin declares one for the type. */
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
 * What an `inputs` hook returns per line: a plain string is a line without a kind; an object names its kind, and
 * within a kind lines sort by `order` (0 when left out). The scheduler arranges the lines by kind.
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
