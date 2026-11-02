/**
 * The exile's state: the gates (old `Tribunal#gates`), everyone who left the city (the tribunal's
 * `#exiled` with `by: "tribunal"` or `"seal"`, the holdout tribunal's `struck` with `"holdout"`) and
 * who was bought back once (`#ransomed`). The old code kept these in two classes; one list keeps
 * the order in which residents left.
 */
import type { Standing } from "@swarmtales/mechanic-shared";

export interface Payment {
	readonly payer: string;
	readonly amount: number;
}

export interface Gate {
	readonly resident: string;
	readonly since: number;
	readonly until: number;
	readonly ransomable: boolean;
	readonly voters: readonly string[];
	/** Absent only for a gate of an old snapshot written before the median ransom; set at the next minute. */
	price: number | undefined;
	selfPrice: number | undefined;
	readonly payments: Payment[];
	will: { readonly text: string; readonly factors: readonly string[] } | undefined;
}

export type GoneBy = "tribunal" | "seal" | "holdout";

export interface Gone {
	readonly resident: string;
	readonly by: GoneBy;
	/** The minute the resident left; absent for a resident of an old snapshot. */
	readonly minute?: number;
}

export interface ExileState {
	readonly gates: Gate[];
	readonly gone: Gone[];
	readonly ransomed: string[];
}

export function emptyExile(): ExileState {
	return { gates: [], gone: [], ransomed: [] };
}

export function gateOf(state: ExileState, resident: string): Gate | undefined {
	return state.gates.find((gate) => gate.resident === resident);
}

/** The old `Tribunal#exiled`: gone through the gate or by the seal, in the order they left. */
export function tribunalExiled(state: ExileState): readonly string[] {
	return state.gone.filter((entry) => entry.by !== "holdout").map((entry) => entry.resident);
}

/** Old `isExiled`: exiled by the tribunal, struck by the seal or the holdout tribunal. */
export function isGone(state: ExileState, resident: string): boolean {
	return state.gone.some((entry) => entry.resident === resident);
}

/** Old `standingOf`: the holdout's strike first, then the tribunal's standing (the gate counts as in the city). */
export function standingOf(state: ExileState, resident: string): Standing {
	if (isGone(state, resident)) return { kind: "exiled" };
	const gate = gateOf(state, resident);
	return gate === undefined ? { kind: "alive" } : { kind: "gate", until: gate.until };
}

/** Prices of a gate; a gate of an old snapshot without them gets them at the next minute (old `restore`). */
export function pricesOf(gate: Gate): { readonly price: number; readonly selfPrice: number } {
	if (gate.price === undefined || gate.selfPrice === undefined) throw new Error(`exile: the gate of ${gate.resident} has no ransom prices yet`);
	return { price: gate.price, selfPrice: gate.selfPrice };
}

/**
 * What is left of a ransom, in units of `price * selfPrice`: each point of others covers
 * `selfPrice` units, each own point `price` units (old `ransomRest`).
 */
export function ransomRest(gate: Gate): number {
	const { price, selfPrice } = pricesOf(gate);
	const covered = gate.payments.reduce((sum, payment) => sum + payment.amount * (payment.payer === gate.resident ? price : selfPrice), 0);
	return price * selfPrice - covered;
}

/** Old `coveredPercent`. */
export function coveredPercent(gate: Gate): number {
	const { price, selfPrice } = pricesOf(gate);
	return Math.min(100, Math.floor((100 * (price * selfPrice - ransomRest(gate))) / (price * selfPrice)));
}

/** "A04", "A04 and A05", "A02, A04 and A05"; `nobody` for none (old `namesOf`, factions.ts). */
export function namesOf(ids: readonly string[]): string {
	if (ids.length === 0) return "nobody";
	const last = ids.at(-1) ?? "";
	return ids.length === 1 ? last : `${ids.slice(0, -1).join(", ")} and ${last}`;
}

/** Old `namesList` (world.ts): like `namesOf`, without a word for none. */
export function namesList(names: readonly string[]): string {
	const last = names.at(-1) ?? "";
	return names.length <= 1 ? last : `${names.slice(0, -1).join(", ")} and ${last}`;
}
