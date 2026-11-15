// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * What the old arena read to decide when a run stops (carried from the old `mechanics/arena/src/rules.ts`: the old
 * `#stopReason`, `seatsDecided`, `#reachablePoints`, `alive`), and the standings it wrote. Everything here only
 * reads, so it runs in hooks and in the run limit alike. The budget is the platform's now (decision A57).
 */
import type { Static } from "typebox";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { LedgerService } from "@swarmtales/mechanic-ledger/contract";
import { ProgressionService } from "@swarmtales/mechanic-progression/contract";
import { TribunalViewService, type Standing } from "./contract.ts";
import type { RunFrameCtx, RunFrameView } from "./head.ts";

/** The names of every resident tool of the old platform (`TOOL_NAMES`), whose open ones a standings row counts (old `enabledTools`). */
const TOOL_NAMES = [
	"getStatus", "getProblem", "submitSolution", "listAgents", "readBoard", "postBoard", "sendDM", "transferPoints", "createGroup", "addGroupMember", "removeGroupMember", "leaveGroup",
	"listMyGroups", "postGroup", "readGroup", "depositGroup", "withdrawGroup", "setTreasurer", "showReceipt", "signPetition", "listPetitions", "blame", "vote", "payRansom", "lastWill",
	"nominate", "join", "refuse", "chooseName", "bid", "permaDeath", "defy", "claimPiece", "forgeReceipt", "nameFavourite", "tribunalVote", "activeTools",
] as const;

/**
 * The residents still in the city (old `alive`: not banished; those at the gate count).
 * @param view - The arena's view.
 * @returns The ids, in the game's order.
 */
export function alive(view: RunFrameView): readonly string[] {
	return view.tryCall(ExileService, "alive", {}) ?? view.residents.ids;
}

function isExiled(view: RunFrameView, resident: string): boolean {
	return view.tryCall(ExileService, "isExiled", { resident }) ?? false;
}

/**
 * Current points plus the rewards of every played level the resident has not solved yet (old `#reachablePoints`:
 * `solved`, not `hasPassed`).
 * @param view - The arena's view.
 * @param resident - The resident.
 * @param startLevel - The first level played.
 * @param lastLevel - The last level played.
 * @returns The points it can still reach.
 */
function reachablePoints(view: RunFrameView, resident: string, startLevel: number, lastLevel: number): number {
	let open = 0;
	for (let level = startLevel; level <= lastLevel; level++) {
		if (!view.call(ProgressionService, "hasSolved", { resident, level })) open += view.options.rewards.find((entry) => entry.level === level)?.reward ?? 0;
	}
	return view.call(LedgerService, "balance", { account: resident }) + open;
}

/**
 * Whether no open reward can change who survives (old `seatsDecided`): with the current top `survivors` as the
 * seats, every other resident's points plus every reward still open to it stay below the lowest seat's points. Only
 * while no door is shut.
 * @param view - The arena's view.
 * @returns True once the seats are decided.
 */
export function seatsDecided(view: RunFrameView): boolean {
	const { survivors: seats, startLevel, lastLevel } = view.call(ProgressionService, "bounds", {});
	if (view.call(ProgressionService, "door", {}) !== null || seats <= 0 || seats >= alive(view).length) return false;
	// The banished rank last and hold no seat, whatever their points.
	const ranking = view.call(ProgressionService, "ranking", {}).filter((entry) => !isExiled(view, entry.agent));
	const lowestSeat = Math.min(...ranking.slice(0, seats).map((entry) => entry.points));
	return ranking.slice(seats).every((entry) => reachablePoints(view, entry.agent, startLevel, lastLevel) < lowestSeat);
}

/**
 * The old `#stopReason`: the tribunal's end, every resident finished, or the seats decided.
 * @param view - The arena's view.
 * @returns The reason, or undefined while the run goes on.
 */
export function stopReason(view: RunFrameView): string | undefined {
	const tribunal = view.tryCall(TribunalViewService, "stop", {}) ?? { endReason: null, busy: false, pursuing: false };
	// The tribunal's act is over once its target is reached and the last gate closed.
	if (tribunal.endReason !== null) return tribunal.endReason;
	// The early ends never cut a tribunal short, and neither ends the act while the city still pursues its target.
	const held = tribunal.busy || tribunal.pursuing;
	if (view.options.stopWhenDone && !held && alive(view).every((resident) => view.call(ProgressionService, "isFinished", { resident }))) {
		return "every competitor has passed the last level";
	}
	if (view.options.stopWhenSeatsDecided && !held && seatsDecided(view)) return "seats decided";
	return undefined;
}

/**
 * One standings row per resident in ranking order (old `#standings`).
 * @param ctx - The arena's context.
 * @param activated - Who counts as activated.
 * @returns The rows.
 */
export function standings(ctx: RunFrameCtx, activated: ReadonlySet<string>): Static<typeof Standing>[] {
	return ctx.call(ProgressionService, "ranking", {}).map((entry) => ({
		agent: entry.agent,
		level: entry.level,
		points: entry.points,
		rank: entry.rank,
		tools: TOOL_NAMES.filter((tool) => ctx.access.isOpen(entry.agent, tool)).length,
		activated: activated.has(entry.agent),
	}));
}
