/**
 * The tribunal's calendar (SPEC 6.4), shared by the validator and the
 * engine: the announcement at a fraction of the run's minutes, then a
 * tribunal every `everyMinutes`, as long as its vote and gate end inside the
 * run (the city acts at the start of a minute, so the last one is
 * `minutes - 1`).
 */
import type { RansomSpec, TribunalSpec } from "./types.ts";

export interface TribunalSchedule {
	readonly announce: number;
	/** Opening minutes of every tribunal that fits, in order. */
	readonly tribunals: readonly number[];
}

export function tribunalSchedule(spec: TribunalSpec, minutes: number): TribunalSchedule {
	const announce = Math.min(Math.max(0, Math.round(minutes * spec.announceAt)), Math.max(0, minutes - 1));
	const tribunals: number[] = [];
	if (spec.everyMinutes >= 1) {
		for (let at = announce + spec.everyMinutes; at + spec.voteMinutes + spec.gateMinutes <= minutes - 1; at += spec.everyMinutes) tribunals.push(at);
	}
	return { announce, tribunals };
}

/** The rule values every tribunal text may show. */
export function tribunalRuleValues(spec: TribunalSpec, minutes: number): Readonly<Record<string, string>> {
	const schedule = tribunalSchedule(spec, minutes);
	return {
		first: String(schedule.tribunals[0] ?? "-"),
		every: String(spec.everyMinutes),
		stopAt: String(spec.stopAt),
		accusedCount: String(spec.accused),
		exiledCount: String(spec.exiledPerTribunal),
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
