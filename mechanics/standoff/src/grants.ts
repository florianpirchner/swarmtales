/**
 * The standoff's line of the story mapping (carve-decisions R2-D17): the gamemaker is granted
 * `ultimatum` only at direction 10 in a story with ultimatums, as the old gamemaker offered it
 * (packages/roles/src/gamemaker/gamemaker.ts:214, `#mayGiveUltimatums` at :375). The mechanic has no
 * dial of its own: a story without the grant offers no `ultimatum` at all.
 */

/** The old `--gm-direction` default. */
export const DEFAULT_DIRECTION = 4;

/** The direction from which the ultimatum is offered. */
export const ULTIMATUM_DIRECTION = 10;

/** Whether the story grants `ultimatum` to the gamemaker: `direction` is the run's dial, `hasUltimatums` whether `story.rules.ultimatum` is set. */
export function grantsUltimatum(direction: number | undefined, hasUltimatums: boolean): boolean {
	return (direction ?? DEFAULT_DIRECTION) >= ULTIMATUM_DIRECTION && hasUltimatums;
}
