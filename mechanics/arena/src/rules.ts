/**
 * What the old `Arena` read from the world to decide when a run stops (packages/engine/src/arena.ts
 * `#stopReason`, `#budgetReason`, `#standings`; world.ts `seatsDecided`, `#reachablePoints`,
 * `alive`). Everything here only reads, so it runs in hooks and in the referee's limits alike.
 */
import { Type } from "typebox";
import { Check } from "typebox/value";
import { ExileApi, LedgerApi, ProgressionApi, TribunalViewApi } from "@swarmtales/mechanic-shared";
import type { ArenaView } from "./head.ts";

/** Residents still in the city (old `alive`: not exiled; those at the gate count). */
export function alive(view: ArenaView): readonly string[] {
	return view.tryCall(ExileApi, "alive", {}) ?? view.residents.ids;
}

function isExiled(view: ArenaView, resident: string): boolean {
	return view.tryCall(ExileApi, "isExiled", { resident }) ?? false;
}

/** Current points plus the rewards of every played level the resident has not passed yet (old `#reachablePoints`). */
function reachablePoints(view: ArenaView, resident: string, startLevel: number, lastLevel: number): number {
	let open = 0;
	for (let level = startLevel; level <= lastLevel; level++) {
		if (!view.call(ProgressionApi, "hasPassed", { resident, level })) open += view.options.rewards.find((entry) => entry.level === level)?.reward ?? 0;
	}
	return view.call(LedgerApi, "balance", { account: resident }) + open;
}

/**
 * Whether no open reward can change who survives (old `seatsDecided`): with the current top
 * `survivors` as the seats, every other resident's points plus every reward still open to it stay
 * below the lowest seat's points. Only once every level is dealt, so never while a door is shut.
 */
export function seatsDecided(view: ArenaView): boolean {
	const { survivors: seats, startLevel, lastLevel } = view.call(ProgressionApi, "bounds", {});
	if (view.call(ProgressionApi, "door", {}) !== null || seats <= 0 || seats >= alive(view).length) return false;
	// The exiled rank last and hold no seat, whatever their points.
	const ranking = view.call(ProgressionApi, "ranking", {}).filter((entry) => !isExiled(view, entry.agent));
	const lowestSeat = Math.min(...ranking.slice(0, seats).map((entry) => entry.points));
	return ranking.slice(seats).every((entry) => reachablePoints(view, entry.agent, startLevel, lastLevel) < lowestSeat);
}

/** Old `#stopReason`, without the app's own `stopWhen` (an app stops the host itself). */
export function stopReason(view: ArenaView): string | undefined {
	const tribunal = view.tryCall(TribunalViewApi, "stop", {});
	// The tribunal's act is over once its target is reached and the last gate closed (SPEC 6.4).
	if (tribunal !== undefined && tribunal.endReason !== null) return tribunal.endReason;
	// The early ends never cut a tribunal short: a called one runs to its last gate first (P18).
	const busy = tribunal?.busy === true;
	// While the city still pursues its target, neither finished doors nor decided seats end the act (v06).
	const pursuing = tribunal?.pursuing === true;
	if (view.options.stopWhenDone && !busy && !pursuing && alive(view).every((resident) => view.call(ProgressionApi, "isFinished", { resident }))) {
		return "every competitor has passed the last level";
	}
	if (view.options.stopWhenSeatsDecided && seatsDecided(view) && !busy && !pursuing) return "seats decided";
	return undefined;
}

/** What the arena reads of a `usage` app event: who spent and how much (the app's runner, roles and judges write them). */
const Usage = Type.Object({ agent: Type.String(), costUsd: Type.Number() });

/**
 * This run's own model spend: the `usage` app events after `ownFrom`, summed per agent in log
 * order and then over the agents in their sorted order, as the old `UsageCollector.own()` summed
 * them (so the floating-point total is the same number).
 */
export function spentUsd(view: ArenaView): number {
	const perAgent = new Map<string, number>();
	for (const event of view.log.since(view.state.ownFrom)) {
		if (event.source !== "app" || event.type !== "usage" || !Check(Usage, event.payload)) continue;
		perAgent.set(event.payload.agent, (perAgent.get(event.payload.agent) ?? 0) + event.payload.costUsd);
	}
	return [...perAgent.entries()].sort(([a], [b]) => a.localeCompare(b)).reduce((total, [, cost]) => total + cost, 0);
}

/** Old `#budgetReason`. */
export function budgetReason(view: ArenaView): string | undefined {
	const limit = view.options.budgetUsd;
	if (limit === undefined) return undefined;
	const spent = spentUsd(view);
	return spent > limit ? `budget exceeded (${spent.toFixed(4)} > ${String(limit)} USD)` : undefined;
}
