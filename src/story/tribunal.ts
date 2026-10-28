/**
 * The tribunal's pacing rules (SPEC 6.4), shared by the validator, the
 * engine and the game master's tool: the exile target, how far ahead a
 * tribunal is called, the earliest minute one may open, and whether it fits
 * before the act's last minute. The city acts at the start of a minute, so a
 * vote and a gate must end by the last minute of the act. The act's end
 * (`end`, exclusive) comes from {@link actEnd}: its start plus `maxMinutes`,
 * within the run's minutes (v08: the deadlines count from the act's start).
 */
import type { RansomSpec, TribunalSpec } from "./types.ts";

/** Residents the tribunals exile in all: `targetShare` of the residents at the start of the act, rounded down. */
export function exileTarget(spec: TribunalSpec, residents: number): number {
	return Math.max(0, Math.floor(residents * spec.targetShare));
}

/**
 * Whether a city of `residents` holds tribunals at all: it exiles at least
 * one, keeps every seat, and has three residents for a tribunal (one
 * accused, two voters). A smaller city (a test city) never hears of one.
 */
export function tribunalHeld(spec: TribunalSpec, residents: number, survivors: number): boolean {
	const target = exileTarget(spec, residents);
	return target >= 1 && residents >= 3 && residents - target >= survivors;
}

/** The minute the tribunal's act ends (exclusive): `maxMinutes` after its start, within the run's minutes. */
export function actEnd(spec: TribunalSpec, actStart: number, minutes: number): number {
	return Math.min(spec.maxMinutes === undefined ? minutes : actStart + spec.maxMinutes, minutes);
}

/** The last minute the city acts in: the minute before the act's end. */
export function lastCityMinute(end: number): number {
	return end - 1;
}

/** Minutes between the call and the opening of a tribunal that opens at `opens`. */
export function leadFor(spec: TribunalSpec, opens: number, previousOpening: number | undefined): number {
	if (previousOpening === undefined) return spec.lead.minimum;
	return Math.max(spec.lead.minimum, Math.floor((opens - previousOpening) * spec.lead.share));
}

/** The minute a tribunal opening at `opens` is called. */
export function callMinute(spec: TribunalSpec, opens: number, previousOpening: number | undefined): number {
	return opens - leadFor(spec, opens, previousOpening);
}

/**
 * The earliest opening of a tribunal called at `now` or later: its call is
 * not before `now`, and it opens at least `minGap` after the previous one.
 */
export function earliestOpening(spec: TribunalSpec, now: number, previousOpening: number | undefined): number {
	let opens = Math.max(now + spec.lead.minimum, previousOpening === undefined ? 0 : previousOpening + spec.minGap);
	// The lead grows with the gap, by at most `share` per minute, so the call moves forward with the opening.
	while (callMinute(spec, opens, previousOpening) < now) opens += 1;
	return opens;
}

/** Whether a tribunal opening at `opens` closes its vote and its gates by the last minute before the act's `end`. */
export function fitsBefore(spec: TribunalSpec, opens: number, end: number): boolean {
	return opens + spec.voteMinutes + spec.gateMinutes <= lastCityMinute(end);
}

/**
 * Whether one more tribunal still fits after a tribunal opening at `opens`:
 * the next can be called once its vote closed and must keep the gap.
 */
export function roomAfter(spec: TribunalSpec, opens: number, end: number): boolean {
	return fitsBefore(spec, earliestOpening(spec, opens + spec.voteMinutes, opens), end);
}

/**
 * Residents accused when a tribunal exiles `count` of `present`: one more
 * than it exiles, at most all but one (one resident is always safe). Every
 * present resident votes, the accused too (v08, P33), so a tribunal of three
 * or more always has at least two voters; fewer than three hold none.
 */
export function accusedCount(count: number, present: number): number {
	if (present < 3) return 0;
	return Math.max(0, Math.min(count + 1, present - 1));
}

/** The most members a faction may hold, its leader included: the present residents shared evenly (v08, P31). */
export function factionCap(present: number, factions: number): number {
	return factions <= 0 ? 0 : Math.ceil(present / factions);
}

/**
 * Why a tribunal holds no faction draft, if it holds none: fewer than two
 * factions fit, or a faction would have fewer residents than the tribunal
 * accuses (v08: `floor(present / factions) < accused`).
 */
export function noDraftReason(present: number, factions: number, accused: number): "too few residents" | "too few per faction" | undefined {
	if (factions < 2) return "too few residents";
	return Math.floor(present / factions) < accused ? "too few per faction" : undefined;
}

/** Factions a tribunal of `present` residents may have: 2 up to half of them; 0 when not even two fit. */
export function maxFactions(present: number): number {
	const most = Math.floor(present / 2);
	return most >= 2 ? most : 0;
}

/** The rule values every tribunal text may show. */
export function tribunalRuleValues(spec: TribunalSpec, residents: number, survivors: number): Readonly<Record<string, string>> {
	const target = exileTarget(spec, residents);
	return {
		target: String(target),
		residents: String(residents),
		kept: String(residents - target),
		survivors: String(survivors),
		voteMinutes: String(spec.voteMinutes),
		penalty: String(spec.nonVoterPenalty),
		gateMinutes: String(spec.gateMinutes),
		ransomShare: percent(spec.ransom.share),
		selfRansomShare: percent(spec.ransom.selfShare),
		ransomMinimum: String(spec.ransom.minimum),
		bequestPerHeir: percent(spec.bequestPerHeir),
	};
}

function percent(share: number): string {
	return `${Math.round(share * 100)}%`;
}

/** The most points a resident holding `points` may leave to one heir: `bequestPerHeir` of them, rounded down. */
export function bequestCap(spec: TribunalSpec, points: number): number {
	return Math.max(0, Math.floor(points * spec.bequestPerHeir));
}

export interface RansomPrices {
	/** What others pay in full. */
	readonly price: number;
	/** What the resident at the gate pays in full for itself. */
	readonly selfPrice: number;
}

/** The ransom for a gate opening now, from the points of the residents still in the register. */
export function ransomPrices(spec: RansomSpec, points: readonly number[]): RansomPrices {
	const sorted = [...points].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	const median = sorted.length === 0 ? 0 : sorted.length % 2 === 1 ? (sorted[middle] ?? 0) : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
	const price = Math.max(spec.minimum, Math.round(median * spec.share));
	return { price, selfPrice: Math.max(price, Math.round((price * spec.selfShare) / spec.share)) };
}
