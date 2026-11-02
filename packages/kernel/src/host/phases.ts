/**
 * The order of hook phases across mechanics (`HookPhase`): every loaded mechanic's phases of one
 * hook, sorted by `order` (ascending). Ties keep load order, then the order in which a mechanic
 * lists its phases, so a story that gives no orders runs its hooks in load order as before.
 */
import type { HookPhase, InstancePhases, MechanicInstance } from "@swarmtales/contracts";

/** One phase with the mechanic it belongs to. */
export interface PlacedPhase<F> {
	readonly source: string;
	readonly order: number;
	readonly run: F;
}

/** The phases of one hook over `instances` (in load order), in the order they run. */
export function orderedPhases<F>(instances: readonly (readonly [string, MechanicInstance])[], pick: (phases: InstancePhases) => readonly HookPhase<F>[]): readonly PlacedPhase<F>[] {
	const placed = instances.flatMap(([source, instance]) => pick(instance.hooks.phases).map((phase) => ({ source, order: phase.order, run: phase.run })));
	// Array.prototype.sort is stable: equal orders keep load order and listing order.
	return placed.map((phase, index) => ({ phase, index })).sort((a, b) => a.phase.order - b.phase.order || a.index - b.index).map(({ phase }) => phase);
}
