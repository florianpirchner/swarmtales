// SPDX-License-Identifier: Apache-2.0
/** Part 4: the step counter of one tick. It counts the calls of the actors of the definition and of nobody else. */
import type { PartFactories } from "./parts.ts";

/**
 * Creates the step counter.
 *
 * @param max - The steps one counted actor may make in a tick (`limits.maxCallsPerTick`); undefined: no limit.
 * @param counted - The ids that are counted: the actors of the definition. A reserved id is not among them.
 * @returns The counter: `step` counts one step and answers false once the actor is over the limit (the step over
 * the limit is counted too); `tickStarted` sets every counter back.
 */
export const createSteps = ((max, counted) => {
	const known = new Set<string>(counted);
	const counts = new Map<string, number>();
	return {
		step: (actor) => {
			if (max === undefined || !known.has(actor)) return true;
			const steps = (counts.get(actor) ?? 0) + 1;
			counts.set(actor, steps);
			return steps <= max;
		},
		tickStarted: () => {
			counts.clear();
		},
	};
}) satisfies PartFactories["createSteps"];
