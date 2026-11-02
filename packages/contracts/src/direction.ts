/**
 * The direction dial (2026-10-29, Flo): how strongly a run steers what its residents do, on two
 * dials from 0 to 10. `--figure-direction` steers the resident's own prompt, `--gm-direction` the
 * gamemaker. The defined levels are 0, 4, 6, 8 and 10; other values round down to the next defined
 * level. What each level shows lives with its reader (apps/cli/src/host/direction.ts for the
 * residents, the gamemaker's system prompt in `@swarmtales/roles`). Moved here from the old engine
 * (step 18, R1-8), so roles and the CLI share one definition.
 */

export const DIRECTION_LEVELS = [0, 4, 6, 8, 10] as const;
export type DirectionLevel = (typeof DIRECTION_LEVELS)[number];

/** The default of both dials: the run as v12 played it. */
export const DEFAULT_DIRECTION: DirectionLevel = 4;

/** A dial value 0-10 as the defined level it plays (rounded down). */
export function directionLevel(value: number): DirectionLevel {
	if (!Number.isInteger(value) || value < 0 || value > 10) throw new RangeError(`A direction is an integer from 0 to 10, got ${String(value)}`);
	let level: DirectionLevel = 0;
	for (const candidate of DIRECTION_LEVELS) if (candidate <= value) level = candidate;
	return level;
}
