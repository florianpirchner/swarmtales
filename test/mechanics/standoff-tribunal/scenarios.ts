/**
 * Scripted holdout scenarios (team T4b). Four residents stand at fragment door 2 from the start,
 * one team, nobody shares: after the stall every one of them is a blocker. Together the scenarios
 * reach every tool, every refusal code and every way a tribunal ends (dropped, banished, the lot,
 * spared after the door's lot, the city's own fallback).
 */
import { FragmentModel } from "./model.ts";
import type { Action, Scenario } from "./differential.ts";

export const RESIDENTS = ["A01", "A02", "A03", "A04"] as const;
const OTHERS = (agent: string) => RESIDENTS.filter((id) => id !== agent);

/** Everyone at fragment door 2, one team, each with its own two-letter fragment. */
export function cityOf(residents: readonly string[]): FragmentModel {
	const fragments = Object.fromEntries(residents.map((id, index) => [id, String.fromCharCode(65 + 2 * index, 66 + 2 * index)]));
	const model = new FragmentModel(residents, new Map([[2, { teams: [[...residents]], fragments }]]));
	for (const id of residents) model.levels.set(id, 2);
	return model;
}

const city = () => cityOf(RESIDENTS);

const votes = (yes: boolean, accused: string): readonly Action[] => OTHERS(accused).map((agent) => ({ kind: "vote", agent, yes }));
const shares = (holder: string): readonly Action[] => OTHERS(holder).map((to) => ({ kind: "give", to, holder, door: 2 }));

const scenario = (minutes: number, steps: Scenario["steps"]): Scenario => ({ residents: RESIDENTS, model: city, minutes, steps });

/** Called too early, then on several blockers (the lot draws A02 as the accused); three failed votes, the gamemaker strikes the drawn one. */
export const lotStrikes = (): Scenario =>
	scenario(24, {
		1: [{ kind: "call", accused: ["A01"], reason: "Too early." }],
		4: [
			{ kind: "call", accused: ["A01", "A01"], reason: "Twice the same." },
			{ kind: "call", accused: ["Z99"], reason: "Nobody." },
			{ kind: "drawLot", candidates: ["A01"] },
			{ kind: "permaDeath", agent: "A01", reason: "Not yet." },
			{ kind: "announce", text: "Nothing yet." },
			{ kind: "vote", agent: "A02", yes: true },
			{ kind: "call", accused: ["A01", "A02", "A03"], reason: "Three hold back their fragments." },
			{ kind: "call", accused: ["A04"], reason: "One at a time." },
		],
		7: [...votes(false, "A02"), { kind: "vote", agent: "A01", yes: true }, { kind: "vote", agent: "A02", yes: true }],
		9: votes(false, "A02"),
		11: [{ kind: "vote", agent: "A01", yes: true }, { kind: "vote", agent: "A03", yes: false }, { kind: "vote", agent: "A04", yes: true }],
		13: [
			{ kind: "permaDeath", agent: "A02", reason: "No lot yet." },
			{ kind: "drawLot", candidates: ["A01", "A02"] },
			{ kind: "drawLot", candidates: [...RESIDENTS] },
			{ kind: "drawLot", candidates: [...RESIDENTS] },
			{ kind: "permaDeath", agent: "A01", reason: "Not the drawn one." },
			{ kind: "permaDeath", agent: "A02", reason: "The lot fell on A02." },
		],
		14: [{ kind: "permaDeath", agent: "Z99", reason: "Nobody." }],
	});

/** The accused shares in its grace: the tribunal is dropped, and the city announces it. */
export const dropped = (): Scenario =>
	scenario(14, {
		4: [{ kind: "call", accused: ["A02"], reason: "A02 keeps its fragment." }],
		5: shares("A02"),
		6: [{ kind: "announce", text: "A02 shared at last." }],
		7: [{ kind: "announce", text: "Again." }],
	});

/** A unanimous vote banishes; the gamemaker strikes someone else first, then the accused; the next call waits for the cool-down. */
export const banished = (): Scenario =>
	scenario(20, {
		4: [{ kind: "call", accused: ["A03", "A02"], reason: "A03 and A02 keep their fragments." }],
		7: votes(true, "A02"),
		9: [
			{ kind: "permaDeath", agent: "A01", reason: "Wrong one." },
			{ kind: "permaDeath", agent: "A02", reason: "A02 leaves the city." },
		],
		10: [{ kind: "call", accused: ["A01"], reason: "Too soon after." }],
	});

/** Nobody acts after the call: the city announces and strikes by itself (the fallback), and later spares at the same door. */
export const fallback = (): Scenario =>
	scenario(40, {
		4: [{ kind: "call", accused: ["A04"], reason: "A04 keeps its fragment." }],
		20: [{ kind: "call", accused: ["A01"], reason: "A01 keeps its fragment." }],
	});

/** A blocker passes the door before its call; the accused passes during the vote. */
export const passing = (): Scenario =>
	scenario(18, {
		3: [{ kind: "pass", agent: "A04" }],
		4: [{ kind: "call", accused: ["A01"], reason: "A01 keeps its fragment." }],
		7: [{ kind: "vote", agent: "A02", yes: true }, { kind: "pass", agent: "A01" }],
	});

export const SCENARIOS: readonly (readonly [string, () => Scenario])[] = [
	["lot strikes", lotStrikes],
	["dropped", dropped],
	["banished", banished],
	["fallback", fallback],
	["passing", passing],
];
