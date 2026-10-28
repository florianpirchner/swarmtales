/**
 * Graduated penalties (v09, P35): a price ladder per offence within an act.
 * Shared by the validator, the engine and the story texts.
 */
import type { PenaltyLadder } from "./types.ts";

/** The steps of a ladder; a plain number is a ladder of one step. */
export function ladderSteps(ladder: PenaltyLadder): readonly number[] {
	return typeof ladder === "number" ? [ladder] : ladder;
}

/** The price of the `offence`-th offence (from 1): its step, or the last step beyond the ladder. */
export function penaltyAt(ladder: PenaltyLadder, offence: number): number {
	const steps = ladderSteps(ladder);
	return steps[Math.min(Math.max(1, offence), steps.length) - 1] ?? 0;
}

/** "2, 4, 6, then 8 points" or "8 points": the ladder in words. */
export function ladderText(ladder: PenaltyLadder): string {
	const steps = ladderSteps(ladder);
	const last = steps.at(-1) ?? 0;
	if (steps.length <= 1) return `${last} ${last === 1 ? "point" : "points"}`;
	return `${steps.slice(0, -1).join(", ")}, then ${last} points`;
}
