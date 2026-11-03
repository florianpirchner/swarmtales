/**
 * The rules the validator and the story texts share with the mechanics: the penalty ladder (v09, P35;
 * the progression mechanic's copy plays it) and the tribunal's pacing (SPEC 6.4; the tribunal
 * mechanic's copy, mechanics/tribunal/src/rules.ts, plays it). Moved here from the old engine when it
 * was deleted (step 18, item 8): the sdk depends on the contracts and the kernel only, and the core
 * names no points, so it keeps its own copy.
 */
import type { PenaltyLadder, TribunalSpec } from "@swarmtales/contracts";

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

/** The target share of a city of `residents` (v09): a plain share, or the first rule whose `from` the city reaches; 0 when no rule holds. */
function targetShareFor(spec: TribunalSpec, residents: number): number {
	const share = spec.targetShare;
	if (typeof share === "number") return share;
	return share.find((rule) => residents >= (rule.from ?? 0))?.share ?? 0;
}

/** Residents the tribunals exile in all: `targetShare` of the residents at the start of the act, rounded down. */
function exileTarget(spec: TribunalSpec, residents: number): number {
	return Math.max(0, Math.floor(residents * targetShareFor(spec, residents)));
}

/** Whether a city of `residents` holds tribunals at all: it exiles at least one, keeps every seat, and has three residents for a tribunal. */
export function tribunalHeld(spec: TribunalSpec, residents: number, survivors: number): boolean {
	const target = exileTarget(spec, residents);
	return target >= 1 && residents >= 3 && residents - target >= survivors;
}

/** The minute the tribunal's act ends (exclusive): `maxMinutes` after its start, within the run's minutes. */
export function actEnd(spec: TribunalSpec, actStart: number, minutes: number): number {
	return Math.min(spec.maxMinutes === undefined ? minutes : actStart + spec.maxMinutes, minutes);
}

/** Whether a tribunal opening at `opens` closes its vote and its gates by the last minute before the act's `end` (the city acts at a minute's start). */
export function fitsBefore(spec: TribunalSpec, opens: number, end: number): boolean {
	return opens + spec.voteMinutes + spec.gateMinutes <= end - 1;
}

/** Factions a tribunal of `present` residents may have: 2 up to half of them; 0 when not even two fit. */
export function maxFactions(present: number): number {
	const most = Math.floor(present / 2);
	return most >= 2 ? most : 0;
}
