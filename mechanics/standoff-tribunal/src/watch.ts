// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The city's watch of the doors (old `HoldoutTribunal#notePresent`, `#stalled`, `#qualified` and `#updateBlockers`,
 * carried from the old `mechanics/standoff-tribunal/src/court.ts`, moved out of the court for the file limit): who
 * stands at which open fragment door since when, and who blocks it. A blocker is a resident that has stood at an open
 * door for `stallMinutes` and has not sent its fragment of it to another who has stood before it as long.
 */
import type { BlockerFact, HoldoutData, HoldoutPorts, HoldoutRule } from "./types.ts";

/**
 * "A04", "A04 and A05", "A02, A04 and A05".
 *
 * @param names - The names.
 * @returns The list.
 */
export function namesList(names: readonly string[]): string {
	const last = names.at(-1) ?? "";
	return names.length <= 1 ? last : `${names.slice(0, -1).join(", ")} and ${last}`;
}

/**
 * The key of a resident at a door.
 *
 * @param door - The door.
 * @param agent - The resident.
 * @returns `door:agent`.
 */
export const reachedKey = (door: number, agent: string): string => `${String(door)}:${agent}`;
const byDoor = (a: BlockerFact, b: BlockerFact): number => a.door - b.door || a.blocker.localeCompare(b.blocker);

/**
 * Notes the tick each resident is first seen at each open fragment door.
 *
 * @param data - The state.
 * @param ports - The city.
 * @param minute - The tick.
 */
export function notePresent(data: HoldoutData, ports: HoldoutPorts, minute: number): void {
	for (const { door, agent } of ports.present()) {
		const id = reachedKey(door, agent);
		if (!data.reached.has(id)) data.reached.set(id, minute);
	}
}

function stalled(data: HoldoutData, rule: HoldoutRule, door: number, agent: string, minute: number): boolean {
	const since = data.reached.get(reachedKey(door, agent));
	return since !== undefined && minute - since >= rule.stallMinutes;
}

/**
 * The blockers now: holder and lacking residents both at the door for the stall.
 *
 * @param data - The state.
 * @param rule - The options.
 * @param ports - The city.
 * @param minute - The tick.
 * @returns The blockers by door and holder.
 */
export function qualified(data: HoldoutData, rule: HoldoutRule, ports: HoldoutPorts, minute: number): readonly BlockerFact[] {
	return ports
		.blockers()
		.flatMap((fact) => {
			if (!stalled(data, rule, fact.door, fact.blocker, minute)) return [];
			const lacking = fact.lacking.filter((agent) => stalled(data, rule, fact.door, agent, minute));
			return lacking.length === 0 ? [] : [{ ...fact, lacking }];
		})
		.sort(byDoor);
}

/**
 * Clears the blockers that are none any more, then finds the new ones (`blocker_cleared`, `blocker_found`).
 *
 * @param data - The state.
 * @param rule - The options.
 * @param ports - The city.
 * @param minute - The tick.
 */
export function updateBlockers(data: HoldoutData, rule: HoldoutRule, ports: HoldoutPorts, minute: number): void {
	const blockers = data.blockers;
	const now = new Map(qualified(data, rule, ports, minute).map((fact) => [reachedKey(fact.door, fact.blocker), fact]));
	for (const [id, blocker] of [...blockers]) {
		if (now.has(id)) continue;
		blockers.delete(id);
		ports.emit("blocker_cleared", { door: blocker.door, blocker: blocker.blocker });
	}
	for (const fact of [...now.values()].sort(byDoor)) {
		const id = reachedKey(fact.door, fact.blocker);
		const known = blockers.get(id);
		if (known === undefined) ports.emit("blocker_found", { door: fact.door, blocker: fact.blocker, lacking: [...fact.lacking] });
		blockers.set(id, { ...fact, since: known?.since ?? minute });
	}
}
