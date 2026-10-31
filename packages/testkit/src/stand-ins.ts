/**
 * Stand-ins for mechanics not carved yet (docs/design/carve-plan.md), so a story with a partial
 * carve resumes an old snapshot (`convertLegacySnapshot`): the host refuses a slice whose mechanic
 * is not loaded and a stateful mechanic without a slice, and a stand-in fills exactly that gap. It
 * holds its version-0 slice unchanged as a version-1 slice, and does nothing else.
 */
import { Type } from "typebox";
import type { HostSnapshot, MechanicUse } from "@swarmtales/contracts";
import { defineMechanic } from "@swarmtales/kernel";

/** A mechanic `id` without tools, events or hooks; its slice is version 1, migrated from the converter's version 0 (`{ old }`). */
export function standIn(id: string) {
	return defineMechanic(
		{ id, summary: `Stand-in for ${id}: keeps its old snapshot slice.`, options: Type.Object({}), state: (): { data: unknown } => ({ data: null }), events: {} },
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
export function standInsFor(snapshot: HostSnapshot, loaded: readonly string[]): readonly MechanicUse[] {
	return Object.keys(snapshot.mechanics)
		.filter((id) => !loaded.includes(id))
		.map((id) => standIn(id).with());
}
