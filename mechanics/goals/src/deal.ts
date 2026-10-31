/**
 * Dealing the goals of one act (old `dealGoals` of packages/engine/src/goals.ts): pure and seeded.
 * A resident's kind follows its core motive most of the time, against it for about `againstCoreMotive` of them, at
 * random without a core motive. For every `protect(X)` an `exile(X)` is held by another resident when the
 * city is large enough; targets spread over the residents and are never the holder itself.
 */
import type { RandomSource } from "@swarmtales/contracts";
import { GOAL_KINDS, type Goal, type GoalKind } from "./model.ts";

export interface DealSpec {
	readonly leadTribunals: number;
	readonly againstCoreMotive: number;
	readonly matches: Readonly<Partial<Record<GoalKind, readonly string[] | undefined>>>;
}

/** The kinds a city can deal: `lead` only with factions, the targeted kinds only with someone else to target. */
export function dealableKinds(factions: boolean, residents: number): readonly GoalKind[] {
	return GOAL_KINDS.filter((kind) => (kind === "lead" ? factions : kind === "heir" || residents >= 2));
}

/** The kind its core motive suggests (the strongest drive the story maps), against it now and then, at random without one. */
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

export function dealGoals(
	spec: DealSpec,
	residents: readonly string[],
	options: { readonly rng: RandomSource; readonly factions: boolean; readonly drives: (agent: string) => readonly string[] | null },
): ReadonlyMap<string, Goal> {
	const { rng } = options;
	const order = rng.shuffle([...residents]);
	const allowed = dealableKinds(options.factions, residents.length);
	const kinds = new Map<string, GoalKind>();
	for (const agent of order) kinds.set(agent, kindFor(spec, allowed, options.drives(agent), rng));
	const targeted = new Map<string, number>();
	const goals = new Map<string, Goal>();
	const pickTarget = (holder: string): string | undefined => {
		const candidates = order.filter((agent) => agent !== holder);
		if (candidates.length === 0) return undefined;
		const fewest = Math.min(...candidates.map((agent) => targeted.get(agent) ?? 0));
		const target = rng.pick(candidates.filter((agent) => (targeted.get(agent) ?? 0) === fewest));
		targeted.set(target, (targeted.get(target) ?? 0) + 1);
		return target;
	};
	// Protectors first: each protect(X) looks for an exile(X) in other hands, turning an undealt goal into one if needed.
	for (const holder of order.filter((agent) => kinds.get(agent) === "protect")) {
		const target = pickTarget(holder);
		if (target === undefined) continue;
		goals.set(holder, { kind: "protect", target });
		const free = (agent: string): boolean => agent !== holder && agent !== target && !goals.has(agent);
		const rival = order.find((agent) => free(agent) && kinds.get(agent) === "exile") ?? order.find((agent) => free(agent) && kinds.get(agent) !== "protect");
		if (rival === undefined) continue;
		kinds.set(rival, "exile");
		goals.set(rival, { kind: "exile", target });
		targeted.set(target, (targeted.get(target) ?? 0) + 1);
	}
	for (const holder of order) {
		if (goals.has(holder)) continue;
		const kind = kinds.get(holder) ?? "heir";
		if (kind === "lead") goals.set(holder, { kind: "lead", count: spec.leadTribunals });
		else if (kind === "heir") goals.set(holder, { kind: "heir" });
		else {
			const target = pickTarget(holder);
			goals.set(holder, target === undefined ? { kind: "heir" } : { kind, target });
		}
	}
	return new Map(
		residents.flatMap((agent): [string, Goal][] => {
			const goal = goals.get(agent);
			return goal === undefined ? [] : [[agent, goal]];
		}),
	);
}
