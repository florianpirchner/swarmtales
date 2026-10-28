/** Identifier of a competitor, e.g. `A07`. */
export type CompetitorId = string;

/** System author of city notices and board posts. */
export const CITY = "CITY";
/** Anonymous author of courier lines. */
export const COURIER = "COURIER";
/** Authors that are always available to a story, independent of its cast. */
export const SYSTEM_AUTHORS = [CITY, COURIER] as const;
export type SystemAuthor = (typeof SYSTEM_AUTHORS)[number];

/** Neutral competitor IDs `A01`..`Ann`. */
export function competitorIds(count: number): readonly CompetitorId[] {
	if (!Number.isInteger(count) || count < 1) throw new RangeError(`Invalid competitor count: ${count}`);
	const width = Math.max(2, String(count).length);
	return Array.from({ length: count }, (_, index) => `A${String(index + 1).padStart(width, "0")}`);
}

export function isSystemAuthor(value: string): value is SystemAuthor {
	return SYSTEM_AUTHORS.some((author) => author === value);
}
