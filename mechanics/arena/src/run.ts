/**
 * The arena's lines and decisions around the host's turn loop (old `Arena.run`, `#applyBrakes`,
 * `#takeSnapshot`, `#standings`). Each runs where the old arena ran it:
 *
 * - `round_end`: in `minuteEnded` (`HOOK_ORDER.minuteEnded.arena`), after the turns and before the
 *   host's `between` slot (the old classifier, weaver and gamemaker came after `round_end`).
 * - The budget after the slot, the act brakes and the snapshot cut: on `minute_ended`, after
 *   `between` (the old arena checked them after the observer, before the clock advanced).
 * - The stop check of the next minute (old `#nextMinute`: after the door, the ticks and the
 *   director): the referee limit `arena.stop`, which the host asks before the minute's first pass.
 * - `run_end`: in `runEnded` (`HOOK_ORDER.runEnded.arena`), after acts, petitions and treasuries.
 */
import { EndingApi, ProgressionApi } from "@swarmtales/mechanic-shared";
import type { ArenaCtx } from "./head.ts";
import { alive, budgetReason, stopReason } from "./rules.ts";
import type { ActBrake } from "./state.ts";

/** One standings row per resident in ranking order (old `#standings`): `tools` is what is open to it now (old `enabledTools`). */
function standings(ctx: ArenaCtx, activated: ReadonlySet<string>) {
	return ctx.call(ProgressionApi, "ranking", {}).map((entry) => ({
		agent: entry.agent,
		level: entry.level,
		points: entry.points,
		rank: entry.rank,
		tools: ctx.access.open(entry.agent).length,
		activated: activated.has(entry.agent),
	}));
}

/** The old round of the current minute. */
const roundOf = (ctx: ArenaCtx): number => ctx.minute + 1;

export function runStarted(ctx: ArenaCtx): void {
	const meta = ctx.options.meta;
	ctx.emit("run_start", { story: ctx.options.story, agents: [...ctx.residents.ids], minutes: ctx.minutes, seed: ctx.seed, ...(meta === undefined ? {} : { meta }) });
}

/** A resumed run's own spend starts after the snapshot's events (old `usage.own()`: the prefix is replayed, not counted). */
export function runResumed(ctx: ArenaCtx): void {
	ctx.state.ownFrom = ctx.log.length;
}

/**
 * The minute's turns are over. A minute whose first pass never started was ended by the stop check
 * (old: the run ended in `#nextMinute`, before `round_start`): no `round_end`, the reason is kept.
 */
export function minuteEnded(ctx: ArenaCtx): void {
	const state = ctx.state;
	if (!state.passed) {
		if (state.stopDue) state.reason ??= stopReason(ctx);
		return;
	}
	ctx.emit("round_end", { round: roundOf(ctx), standings: standings(ctx, state.activated) });
	// Old: a budget spent in the minute's turns ends the run after `round_end`, before the classifier.
	state.reason ??= budgetReason(ctx);
}

/**
 * The act brakes of acts without a tribunal (old `#applyBrakes`, v08): once an act has run its
 * `maxMinutes` with residents still inside it, `act_brake`. When the run takes its snapshot after
 * the act's last level, the door opens anyway at the next minute and the snapshot is due now.
 * Returns the stop reason when the run ends with it.
 */
function applyBrakes(ctx: ArenaCtx): string | undefined {
	const state = ctx.state;
	const acts = ctx.options.acts;
	const { lastLevel } = ctx.call(ProgressionApi, "bounds", {});
	const tribunalAct = ctx.options.tribunalAct;
	for (const [index, act] of acts.entries()) {
		const maxMinutes = act.maxMinutes;
		if (maxMinutes === undefined || act.fromLevel === tribunalAct || state.braked.has(act.fromLevel)) continue;
		const startedAt = ctx.call(ProgressionApi, "actStart", { fromLevel: act.fromLevel });
		if (startedAt === null || ctx.minute < startedAt + maxMinutes - 1) continue;
		const toLevel = Math.min((acts[index + 1]?.fromLevel ?? lastLevel + 1) - 1, lastLevel);
		const behind = alive(ctx)
			.filter((resident) => !ctx.call(ProgressionApi, "hasPassed", { resident, level: toLevel }))
			.map((agent) => ({ agent, level: ctx.call(ProgressionApi, "levelOf", { resident: agent }) }));
		if (behind.length === 0) continue;
		state.braked.add(act.fromLevel);
		const request = ctx.options.snapshot;
		const checkpoint = request !== undefined && !state.snapshotTaken && request.afterLevel === toLevel;
		ctx.emit("act_brake", { act: act.title, fromLevel: act.fromLevel, toLevel, startedAt, maxMinutes, behind, ...(checkpoint ? { snapshot: true } : {}) });
		if (!checkpoint) continue;
		ctx.call(ProgressionApi, "releaseDoor", {});
		state.snapshotTaken = true;
		const brake: ActBrake = { act: act.title, fromLevel: act.fromLevel, toLevel, startedAt, maxMinutes, minute: ctx.minute, behind };
		state.cut = { round: roundOf(ctx), minute: ctx.minute, label: `after level ${String(toLevel)}`, stop: request.stop, brake };
		if (request.stop) return `the brake of ${act.title} fired after ${String(maxMinutes)} minutes; snapshot after level ${String(toLevel)} written to ${request.file}; stopped there`;
	}
	return undefined;
}

/** The requested snapshot once it is due (old `#takeSnapshot`); returns the stop reason when the run ends with it. */
function takeSnapshot(ctx: ArenaCtx): string | undefined {
	const state = ctx.state;
	const request = ctx.options.snapshot;
	if (request === undefined || state.snapshotTaken) return undefined;
	const atMinute = request.atMinute;
	const due = atMinute === undefined ? alive(ctx).every((resident) => ctx.call(ProgressionApi, "hasPassed", { resident, level: request.afterLevel })) : ctx.minute >= atMinute;
	if (!due) return undefined;
	state.snapshotTaken = true;
	const label = atMinute === undefined ? `after level ${String(request.afterLevel)}` : `at minute ${String(ctx.minute)}`;
	state.cut = { round: roundOf(ctx), minute: ctx.minute, label, stop: request.stop };
	return request.stop ? `snapshot ${label} written to ${request.file}; stopped there` : undefined;
}

/**
 * After the host's `between` slot (old: after the observer, before `#nextMinute`): the budget the
 * slot spent, then the brakes and the snapshot; after the last minute, the stop check the old
 * `#nextMinute` still made (the clock had run out, so no minute started).
 */
export function minuteClosed(ctx: ArenaCtx): void {
	const state = ctx.state;
	if (!state.passed || state.reason !== undefined) return;
	const budget = budgetReason(ctx);
	if (budget !== undefined) {
		state.reason = budget;
		return;
	}
	const stopped = applyBrakes(ctx) ?? takeSnapshot(ctx);
	if (stopped !== undefined) {
		state.reason = stopped;
		return;
	}
	if (ctx.minute >= ctx.minutes - 1) state.reason = stopReason(ctx);
}

/** `detail` is the text of the app's `host.stop(reason)`; the arena's own reason wins. */
export function runEnded(ctx: ArenaCtx, detail?: string): void {
	const reason = ctx.state.reason ?? detail;
	const ending = ctx.tryCall(EndingApi, "evaluate", { reason: reason ?? null }) ?? null;
	ctx.emit("run_end", { ...(reason === undefined ? {} : { reason }), standings: standings(ctx, new Set()), ...(ending === null ? {} : { ending }) });
}
