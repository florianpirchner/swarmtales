// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The standoff's line of the old story mapping, carried from old `mechanics/standoff/src/grants.ts`: the gamemaker is
 * granted `ultimatum` only at direction 10 in a game with ultimatums, as the old gamemaker offered it. The mechanic
 * has no dial of its own: a game without the grant offers no `ultimatum` at all.
 */

/**
 * The old `--gm-direction` default.
 *
 * @public
 */
export const DEFAULT_DIRECTION = 4;

/**
 * The direction from which the ultimatum is offered.
 *
 * @public
 */
export const ULTIMATUM_DIRECTION = 10;

/**
 * Whether a game grants `ultimatum` to the gamemaker.
 *
 * @param direction - The run's dial; the old default when left out.
 * @param hasUltimatums - Whether the game sets the option `ultimatum`.
 * @returns True when the gamemaker gets the tool.
 *
 * @public
 */
export function grantsUltimatum(direction: number | undefined, hasUltimatums: boolean): boolean {
	return (direction ?? DEFAULT_DIRECTION) >= ULTIMATUM_DIRECTION && hasUltimatums;
}
