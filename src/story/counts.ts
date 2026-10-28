/** Counts that grow with the city (v09): shared by the validator and the engine. */
import type { ScaledCount } from "./types.ts";

/** The count for a city of `residents`: the fixed number, or its share rounded up, at least the minimum. */
export function resolveCount(count: ScaledCount, residents: number): number {
	return typeof count === "number" ? count : Math.max(count.minimum, Math.ceil(residents * count.share));
}
