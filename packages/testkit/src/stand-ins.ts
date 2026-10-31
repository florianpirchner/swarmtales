/**
 * Stand-ins for mechanics not carved yet (docs/design/carve-plan.md), so a story with a partial
 * carve resumes an old snapshot (`convertLegacySnapshot`): the host refuses a slice whose mechanic
 * is not loaded and a stateful mechanic without a slice, and a stand-in fills exactly that gap. It
 * holds its version-0 slice unchanged as a version-1 slice, and does nothing else.
 *
 * A stand-in declares the events of the definitions in `events` whose id is its own (wave 3.5,
 * T1 request 12): a loaded listener of `progression.level_up` needs a `progression` that declares
 * it. The testkit may not import mechanics/shared, so a test passes `SHARED_EVENTS` itself.
 */
import { Type } from "typebox";
import type { EventSchemas, EventsDefinition, HostSnapshot, MechanicUse } from "@swarmtales/contracts";
import { defineMechanic } from "@swarmtales/kernel";

export interface StandInOptions {
	/** Event definitions to declare from: those whose id is the stand-in's (`SHARED_EVENTS`). */
	readonly events?: readonly EventsDefinition[];
}

/** The events of `definitions` that belong to `id`, merged. */
function eventsOf(id: string, definitions: readonly EventsDefinition[]): EventSchemas {
	const merged: Record<string, EventSchemas[string]> = {};
	for (const definition of definitions) if (definition.id === id) Object.assign(merged, definition.events);
	return merged;
}

/** A mechanic `id` without tools or hooks; its slice is version 1, migrated from the converter's version 0 (`{ old }`). */
export function standIn(id: string, options: StandInOptions = {}) {
	return defineMechanic(
		{ id, summary: `Stand-in for ${id}: keeps its old snapshot slice.`, options: Type.Object({}), state: (): { data: unknown } => ({ data: null }), events: eventsOf(id, options.events ?? []) },
		(kit) => ({
			snapshot: kit.snapshot({
				version: 1,
				schema: Type.Object({ old: Type.Unknown() }),
				save: (state) => ({ old: state.data }),
				load: (data) => ({ data: data.old }),
				migrations: { 0: (old) => ({ old }) },
			}),
		}),
	);
}

/** A stand-in use for every slice of `snapshot` whose mechanic is not in `loaded`, in the slices' order. */
export function standInsFor(snapshot: HostSnapshot, loaded: readonly string[], options: StandInOptions = {}): readonly MechanicUse[] {
	return Object.keys(snapshot.mechanics)
		.filter((id) => !loaded.includes(id))
		.map((id) => standIn(id, options).with());
}
