import type { CompetitorId } from "@swarmtales/contracts";

export type { CompetitorId };

/** Neutral competitor IDs `A01`..`Ann`. */
export function competitorIds(count: number): readonly CompetitorId[] {
	if (!Number.isInteger(count) || count < 1) throw new RangeError(`Invalid competitor count: ${count}`);
	const width = Math.max(2, String(count).length);
	return Array.from({ length: count }, (_, index) => `A${String(index + 1).padStart(width, "0")}`);
}
