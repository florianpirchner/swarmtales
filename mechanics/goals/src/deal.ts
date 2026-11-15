// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Dealing the goals of one act (old `dealGoals` of packages/engine/src/goals.ts), carried from the old
 * `mechanics/goals/src/deal.ts`: pure and seeded.
 * A resident's kind follows its core motive most of the time, against it for about `againstCoreMotive` of them, at
 * random without a core motive. For every `protect(X)` an `exile(X)` is held by another resident when the
 * city is large enough; targets spread over the residents and are never the holder itself.
 */
import type { RandomSource } from "@swarmtales/contracts";
import type { Goal } from "./contract.ts";
import { GOAL_KINDS, type GoalKind } from "./model.ts";

/**
 * What the deal reads of the options.
 *
 * @public
 */
export interface DealSpec {
	/** How many tribunals a `lead` goal asks for. */
	readonly leadTribunals: number;
	/** The share of residents dealt against their core motive. */
	readonly againstCoreMotive: number;
	/** The drive ids that suggest each kind. */
	readonly matches: Readonly<Partial<Record<GoalKind, readonly string[] | undefined>>>;
}

/**
 * The kinds a city can deal: `lead` only with factions, the targeted kinds only with someone else to target.
 *
 * @param factions - Whether the city holds faction drafts.
 * @param residents - How many residents are dealt.
 * @returns The kinds.
 *
 * @public
 */
export function dealableKinds(factions: boolean, residents: number): readonly GoalKind[] {
	return GOAL_KINDS.filter((kind) => (kind === "lead" ? factions : kind === "heir" || residents >= 2));
}

// The kind its core motive suggests (the strongest drive the story maps), against it now and then, at random without one.
function kindFor(spec: DealSpec, allowed: readonly GoalKind[], drives: readonly string[] | null, rng: RandomSource): GoalKind {
	const against = rng.next() < spec.againstCoreMotive;
	const matched = drives
		?.map((drive) => allowed.find((kind) => spec.matches[kind]?.includes(drive) === true))
		.find((kind): kind is GoalKind => kind !== undefined);
	if (matched === undefined) return rng.pick(allowed);
	if (!against) return matched;
	const others = allowed.filter((kind) => kind !== matched);
	return others.length === 0 ? matched : rng.pick(others);
}


/**
 * What the deal draws with.
 *
 * @public
 */
export interface DealStreams {
	/** The stream, `rng("goals", act)`. */
	readonly rng: RandomSource;
	/** Whether the city holds faction drafts. */
	readonly factions: boolean;
	/** The drive ids of a resident's core motive, the strongest first, or null. */
	readonly drives: (agent: string) => readonly string[] | null;
}

// One deal in progress: the shuffled order, the kinds drawn, the goals so far, and how often each resident is a target.
interface Table {
	readonly rng: RandomSource;
	readonly order: readonly string[];
	readonly kinds: Map<string, GoalKind>;
	readonly goals: Map<string, Goal>;
	readonly targeted: Map<string, number>;
}

// A target among those targeted least, never the holder itself.
function pickTarget(table: Table, holder: string): string | undefined {
	const candidates = table.order.filter((agent) => agent !== holder);
	if (candidates.length === 0) return undefined;
	const fewest = Math.min(...candidates.map((agent) => table.targeted.get(agent) ?? 0));
	const target = table.rng.pick(candidates.filter((agent) => (table.targeted.get(agent) ?? 0) === fewest));
	table.targeted.set(target, (table.targeted.get(target) ?? 0) + 1);
	return target;
}

// Protectors first: each protect(X) looks for an exile(X) in other hands, turning an undealt goal into one if needed.
function dealProtectors(table: Table): void {
	const { order, kinds, goals } = table;
	for (const holder of order.filter((agent) => kinds.get(agent) === "protect")) {
		const target = pickTarget(table, holder);
		if (target === undefined) continue;
		goals.set(holder, { kind: "protect", target });
		const free = (agent: string): boolean => agent !== holder && agent !== target && !goals.has(agent);
		const rival = order.find((agent) => free(agent) && kinds.get(agent) === "exile") ?? order.find((agent) => free(agent) && kinds.get(agent) !== "protect");
		if (rival === undefined) continue;
		kinds.set(rival, "exile");
		goals.set(rival, { kind: "exile", target });
		table.targeted.set(target, (table.targeted.get(target) ?? 0) + 1);
	}
}

// Everyone else, in the shuffled order.
function dealRest(table: Table, leadTribunals: number): void {
	for (const holder of table.order) {
		if (table.goals.has(holder)) continue;
		const kind = table.kinds.get(holder) ?? "heir";
		if (kind === "lead") table.goals.set(holder, { kind: "lead", count: leadTribunals });
		else if (kind === "heir") table.goals.set(holder, { kind: "heir" });
		else {
			const target = pickTarget(table, holder);
			table.goals.set(holder, target === undefined ? { kind: "heir" } : { kind, target });
		}
	}
}

/**
 * Deals one act's goals, seeded.
 *
 * @param spec - What the deal reads of the options.
 * @param residents - The residents, in roster order.
 * @param streams - The stream, whether factions run, and the drives of a resident.
 * @returns The goal of each resident, in roster order.
 *
 * @public
 */
export function dealGoals(spec: DealSpec, residents: readonly string[], streams: DealStreams): ReadonlyMap<string, Goal> {
	const { rng } = streams;
	const order = rng.shuffle([...residents]);
	const allowed = dealableKinds(streams.factions, residents.length);
	const kinds = new Map<string, GoalKind>();
	for (const agent of order) kinds.set(agent, kindFor(spec, allowed, streams.drives(agent), rng));
	const table: Table = { rng, order, kinds, goals: new Map(), targeted: new Map() };
	dealProtectors(table);
	dealRest(table, spec.leadTribunals);
	return new Map(
		residents.flatMap((agent): [string, Goal][] => {
			const goal = table.goals.get(agent);
			return goal === undefined ? [] : [[agent, goal]];
		}),
	);
}
