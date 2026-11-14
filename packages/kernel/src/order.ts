// SPDX-License-Identifier: Apache-2.0
/** The order of the registrations of one hook, or of the listeners of one event, across plugins (3.4). */
import { SwtError } from "@swarmtales/contracts";
import { afterCycle } from "./errors.ts";
import type { Placed } from "./parts.ts";

/**
 * Places registrations: repeatedly the first entry in the given (load) order whose `after` plugins have no entry
 * left to place. The sort is stable; an `after` id without an entry, and an entry's own plugin id, are ignored.
 *
 * @param entries - The registrations in load order, and within one plugin in the order it lists them.
 * @returns The entries in the order they run.
 * @throws SwtError `SWT-R016` when `after` relations form a cycle; it names the plugins that could not be placed.
 */
export function ordered<T extends Placed>(entries: readonly T[]): readonly T[] {
	const open = [...entries];
	const placed: T[] = [];
	while (open.length > 0) {
		const next = open.findIndex((entry) => !open.some((other) => other.plugin !== entry.plugin && entry.after?.includes(other.plugin) === true));
		if (next < 0) throw new SwtError(afterCycle([...new Set(open.map((entry) => entry.plugin))]));
		placed.push(...open.splice(next, 1));
	}
	return placed;
}
