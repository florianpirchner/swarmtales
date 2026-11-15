// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The pick of the whisperer, carried from the old `pickWhisperer`: pure rule code, shared through `/rules`, so that
 * `motives` deals the whisperer's character in its `start`, where no service can be asked (decision A86). The
 * whispers' own `start` picks with it too, so both read the same resident from the same seed.
 *
 * @packageDocumentation
 */

/**
 * The seeded streams of the run by label, as far as the pick draws from them (`setup.rng` of a mechanic).
 *
 * @public
 */
export type PickStreams = (label: string) => { pick<T>(items: readonly T[]): T };

/**
 * The whisperer of a fresh run: the resident the game names when it is one of the run, else a seeded pick among the
 * residents in sorted order from the stream `whisperer`.
 *
 * @param residents - The residents of the run.
 * @param rng - The seeded streams of the run.
 * @param agent - The resident the game names (the whispers' `whisperer.agent`), if any.
 * @returns The whisperer, or null in a run without residents.
 *
 * @public
 */
export function pickWhisperer(residents: readonly string[], rng: PickStreams, agent?: string): string | null {
	if (residents.length === 0) return null;
	if (agent !== undefined && residents.includes(agent)) return agent;
	return rng("whisperer").pick([...residents].sort((a, b) => a.localeCompare(b)));
}
