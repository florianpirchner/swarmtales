// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** Part 4: the step counter of one tick. It counts the calls of the actors of the definition and of nobody else. */
import type { ActorId } from "@swarmtales/contracts";

/**
 * Creates the step counter.
 *
 * @param max - The steps one counted actor may make in a tick (`limits.maxCallsPerTick`); undefined: no limit.
 * @param counted - The ids that are counted: the actors of the definition. A reserved id is not among them.
 * @returns The counter: `step` counts one step and answers false once the actor is over the limit (the step over
 * the limit is counted too); `tickStarted` sets every counter back.
 */
export function createSteps(max: number | undefined, counted: readonly ActorId[]) {
	const known = new Set<string>(counted);
	const counts = new Map<string, number>();
	return {
		step: (actor: ActorId): boolean => {
			if (max === undefined || !known.has(actor)) return true;
			const steps = (counts.get(actor) ?? 0) + 1;
			counts.set(actor, steps);
			return steps <= max;
		},
		tickStarted: (): void => {
			counts.clear();
		},
	};
}
