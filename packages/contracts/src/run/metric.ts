// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The metric: one number a mechanic exports about a finished run. A type only; the sdk has the typed helper. */
import type { Envelope } from "../kernel/envelope.ts";

/**
 * One number a mechanic exports about a finished run, computed from its own events.
 *
 * @remarks
 * What an implementer must do. A mechanic declares its metrics on its head, so they are readable without its body.
 * `compute` is a pure function of the envelopes it is given: no clock, no random number, no state between two
 * calls, and it does not throw. It reads only events of the plugin that declares it. When the run holds no event
 * that gives the number a meaning, it returns `undefined`, which a table prints as "absent"; it never returns 0
 * for "nothing happened", and never `NaN` or an infinite number.
 *
 * @example
 * ```ts
 * const moves: MetricDefinition = {
 * 	id: "moves",
 * 	title: "Moves played",
 * 	reads: ["move_played"],
 * 	compute: (events) => (events.length === 0 ? undefined : events.length),
 * };
 * ```
 *
 * @public
 */
export interface MetricDefinition {
	/** The id inside the plugin, for example `tablePoints`; the key in a table is `<plugin id>.<id>`. */
	readonly id: string;
	/** The title of the column, for a reader. */
	readonly title: string;
	/** The unit of the number, for example `points`; left out for a plain count or a share. */
	readonly unit?: string;
	/** The event types of the declaring plugin that `compute` needs; it is given no other event. */
	readonly reads: readonly string[];
	/**
	 * Computes the number of one run.
	 *
	 * @param events - The envelopes of the types in `reads`, from the declaring plugin, in log order.
	 * @returns The number, or `undefined` for "absent": the run has no value, which is never the same as zero.
	 */
	compute(events: readonly Envelope[]): number | undefined;
}
