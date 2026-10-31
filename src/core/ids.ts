import type { CompetitorId, SystemAuthor } from "../contracts/ids.ts";

export type { CompetitorId, SystemAuthor };

/** System author of city notices and board posts. */
export const CITY = "CITY";
/** Anonymous author of courier lines. */
export const COURIER = "COURIER";
/** Authors that are always available to a story, independent of its cast. */
export const SYSTEM_AUTHORS = [CITY, COURIER] as const satisfies readonly SystemAuthor[];

/** Neutral competitor IDs `A01`..`Ann`. */
export function competitorIds(count: number): readonly CompetitorId[] {
	if (!Number.isInteger(count) || count < 1) throw new RangeError(`Invalid competitor count: ${count}`);
	const width = Math.max(2, String(count).length);
	return Array.from({ length: count }, (_, index) => `A${String(index + 1).padStart(width, "0")}`);
}

export function isSystemAuthor(value: string): value is SystemAuthor {
	return SYSTEM_AUTHORS.some((author) => author === value);
}
