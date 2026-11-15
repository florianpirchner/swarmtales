// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The arena's lines around the turns (carried from the old `mechanics/arena/src/run.ts`: `Arena.run`,
 * `#applyBrakes`, `#standings`). Each runs where the old arena ran it:
 *
 * - `run_start` in `runStarted`, after every other mechanic's start (the arena loads last);
 * - `round_end` in `tickEnded`, after the tick's turns; then the act brakes, and in the last tick the stop check the
 *   old `#nextMinute` still made after the clock ran out;
 * - the stop check of a tick after the first (old `#nextMinute`: after the door, the tribunal and the script): the run
 *   limit `arena.stop`, which the scheduler asks before the tick's first pass. A tick that stops there writes no
 *   `round_end`;
 * - `run_end` in `runEnded`, after the acts, the petitions and the treasuries.
 *
 * The budget and the snapshot checkpoint, with the brake's checkpoint, are the platform's now (decision A57).
 */
import type { RunEnd } from "@swarmtales/contracts";
import { ProgressionService } from "@swarmtales/mechanic-progression/contract";
import type { RunFrameCtx } from "./head.ts";
import { alive, standings, stopReason } from "./stop.ts";

/**
 * The old round of the current tick.
 * @param ctx - The arena's context.
 * @returns The tick plus one.
 */
const roundOf = (ctx: RunFrameCtx): number => ctx.tick + 1;

/**
 * Writes `run_start`.
 * @param ctx - The arena's context.
 */
export function runStarted(ctx: RunFrameCtx): void {
	const meta = ctx.options.meta;
	ctx.emit("run_start", { story: ctx.options.story, agents: [...ctx.residents.ids], minutes: ctx.ticks, seed: ctx.seed, ...(meta === undefined ? {} : { meta }) });
}

/**
 * A new tick: the stop check is due from the second tick on, until the first activation.
 * @param ctx - The arena's context.
 */
export function tickStarted(ctx: RunFrameCtx): void {
	ctx.state.stopDue = ctx.tick > 0;
	ctx.state.activated.clear();
}

/**
 * The act brakes of acts without a tribunal (old `#applyBrakes`, v08): once an act has run its `maxMinutes` with
 * residents still inside it, `act_brake`, once per act.
 * @param ctx - The arena's context.
 */
function applyBrakes(ctx: RunFrameCtx): void {
	const { acts, tribunalAct } = ctx.options;
	const { lastLevel } = ctx.call(ProgressionService, "bounds", {});
	for (const [index, act] of acts.entries()) {
		const maxMinutes = act.maxMinutes;
		if (maxMinutes === undefined || act.fromLevel === tribunalAct || ctx.state.braked.has(act.fromLevel)) continue;
		const startedAt = ctx.call(ProgressionService, "actStart", { fromLevel: act.fromLevel });
		// The output of `actStart` is typed loosely by its contract: a number once the act has begun.
		if (typeof startedAt !== "number" || ctx.tick < startedAt + maxMinutes - 1) continue;
		const toLevel = Math.min((acts[index + 1]?.fromLevel ?? lastLevel + 1) - 1, lastLevel);
		const behind = alive(ctx)
			.filter((resident) => !ctx.call(ProgressionService, "hasPassed", { resident, level: toLevel }))
			.map((agent) => ({ agent, level: ctx.call(ProgressionService, "levelOf", { resident: agent }) }));
		if (behind.length === 0) continue;
		ctx.state.braked.add(act.fromLevel);
		ctx.emit("act_brake", { act: act.title, fromLevel: act.fromLevel, toLevel, startedAt, maxMinutes, behind });
	}
}

/**
 * The tick's turns are over. A tick whose stop check found a reason before any activation ends the run here (the
 * limit answers the same reason): no `round_end`, the reason is kept.
 * @param ctx - The arena's context.
 */
export function tickEnded(ctx: RunFrameCtx): void {
	const state = ctx.state;
	if (state.stopDue) {
		const reason = stopReason(ctx);
		if (reason !== undefined) {
			state.reason ??= reason;
			return;
		}
		state.stopDue = false;
	}
	ctx.emit("round_end", { round: roundOf(ctx), standings: standings(ctx, state.activated) });
	applyBrakes(ctx);
	if (ctx.tick >= ctx.ticks - 1) state.reason ??= stopReason(ctx);
}

/**
 * Writes `run_end` with the arena's reason and the last standings.
 * @param _end - How the run ended.
 * @param ctx - The arena's context.
 */
export function runEnded(_end: RunEnd, ctx: RunFrameCtx): void {
	const reason = ctx.state.reason;
	ctx.emit("run_end", { ...(reason === undefined ? {} : { reason }), standings: standings(ctx, new Set()) });
}
