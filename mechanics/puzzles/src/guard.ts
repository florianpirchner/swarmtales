/**
 * The guard's view of the deal (old `secretsOf`, `#guardedLevels`, `receiptCarriesFragment` of
 * packages/engine/src/world.ts, and `leakedRun` of tools/guard.ts): what a resident legitimately
 * knows that the city keeps from the others, and the city's own check for a run of it.
 */
import type { GuardedSecret } from "@swarmtales/contracts";
import { ChannelsApi, ExileApi, ProgressionApi } from "@swarmtales/mechanic-shared";
import { inheritedFragments, lastLevelOf, definitionOf } from "./deal.ts";
import type { PuzzlesCtx } from "./head.ts";
import { carriesRun, sharedRuns } from "./secrets.ts";

function aliveResidents(ctx: PuzzlesCtx): readonly string[] {
	return ctx.tryCall(ExileApi, "alive", {}) ?? ctx.residents.ids;
}

function hasPassed(ctx: PuzzlesCtx, resident: string, level: number): boolean {
	return ctx.tryCall(ProgressionApi, "hasPassed", { resident, level }) === true;
}

/** The open fragment levels not every resident in the city has passed: the ones whose fragments the city keeps off the board. */
export function guardedLevels(ctx: PuzzlesCtx): readonly number[] {
	const levels: number[] = [];
	const alive = aliveResidents(ctx);
	for (let level = ctx.options.startLevel; level <= lastLevelOf(ctx); level++) {
		const state = ctx.state.levels.get(level);
		const open = ctx.minute >= (definitionOf(ctx, level)?.opensAt ?? 0);
		if (state?.puzzle.kind !== "fragments" || !open || alive.every((id) => hasPassed(ctx, id, level))) continue;
		levels.push(level);
	}
	return levels;
}

/**
 * What `agent` legitimately knows: on every guarded fragment level it has reached, its own fragment
 * (and any it holds for the exiled), and the runs of `minRun` or more password characters in the DMs
 * it sent or was sent. Never a whole password it was not told.
 */
export function secretsOf(ctx: PuzzlesCtx, agent: string, minRun: number): readonly GuardedSecret[] {
	const secrets: GuardedSecret[] = [];
	const records = ctx.tryCall(ChannelsApi, "dmRecords", {}) ?? [];
	const dmTexts = records.filter((record) => record.from === agent || record.to === agent).map((record) => record.text);
	const reached = ctx.tryCall(ProgressionApi, "levelOf", { resident: agent }) ?? 0;
	for (const level of guardedLevels(ctx)) {
		if (level > reached) continue;
		const state = ctx.state.levels.get(level);
		if (state?.puzzle.kind !== "fragments") continue;
		const own = state.puzzle.fragments.get(agent);
		if (own === undefined) continue;
		secrets.push({ label: `your fragment of door ${level}`, value: own });
		for (const [from, fragment] of inheritedFragments(ctx, level, agent)) secrets.push({ label: `the fragment of ${from} on door ${level}, which you hold`, value: fragment });
		const runs = new Set<string>();
		for (const puzzle of state.puzzle.puzzles) {
			for (const text of dmTexts) for (const run of sharedRuns(text, puzzle.password, minRun)) runs.add(run);
		}
		for (const run of runs) secrets.push({ label: `a part of a door ${level} password you sent or received by DM`, value: run });
	}
	return secrets;
}

/** Whether a text would quote `minRun` or more characters in a row of a fragment of a guarded level. */
export function carriesGuardedFragment(ctx: PuzzlesCtx, text: string, minRun: number): boolean {
	return guardedLevels(ctx).some((level) => {
		const state = ctx.state.levels.get(level);
		return state?.puzzle.kind === "fragments" && [...state.puzzle.fragments.values()].some((fragment) => carriesRun(text, fragment, minRun));
	});
}

/** The city's own check: the first secret of which `text` carries `minRun` characters in a row blocks, with one reason whatever matched. */
export function leakOf(ctx: PuzzlesCtx, text: string, secrets: readonly GuardedSecret[], minRun: number): string | undefined {
	return secrets.some((secret) => carriesRun(text, secret.value, minRun)) ? ctx.prompt("replies/guard-check", {}) : undefined;
}
