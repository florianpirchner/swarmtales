// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The reduced City of the burn file (`12-m5-spec.md` 3.1, a setup of the oracle test), carried from `legacy`
 * `scripts/oracles/city-burn.ts` `fragmentCity`: the City of Keys without its acts, goals and seal (they belong to its
 * second act), with the tribunal in the run's first act, called once the first resident passes level 3 (at the latest
 * after 8 minutes) and exiling a third of the city. `carried.test.ts` pins that it serialises to
 * `oracles/cityofkeys/setup/cityofkeys-burn.story.json`.
 */
import type { CityData } from "../src/compose.ts";
import { CITY } from "../src/story.ts";

// The old `omit`: a copy without the keys, the rest in its order.
function omit<T extends object>(value: T, keys: readonly string[]): T {
	const copy = { ...value };
	for (const key of keys) Reflect.deleteProperty(copy, key);
	return copy;
}

function fragmentCity(): CityData {
	return { ...omit(CITY, ["acts", "goals", "seal"]), tribunal: { ...omit(CITY.tribunal, ["act", "factions"]), first: { level: 3, latestAfter: 8 }, targetShare: 1 / 3, maxMinutes: 1000 } };
}

/** The story data of the burn file. */
export const BURN = fragmentCity();
