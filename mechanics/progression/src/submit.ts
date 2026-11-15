// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Submitting a code, entering a level and the doors (carried from the old `mechanics/progression/src/submit.ts`:
 * `submit`, `enterLevel`, `notifyHolders`, `openDoor`, `openOnClock`). The order of the checks and of the events is
 * the old one: the reward, the acts and the locks, `level_up`, the notices, `level_entered`, then `submission`. The receipt of a solved level
 * is issued by the provider of `receipt-source` in its own listener; the reply names the id it gets (decision A64).
 */
import { AllowanceService, ReceiptSourceService } from "@swarmtales/mechanic-contracts";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { LedgerService } from "@swarmtales/mechanic-ledger/contract";
import { LevelPiecesService } from "./contract.ts";
import type { ProgressionCtx } from "./head.ts";
import { noteActStarts, syncLocks } from "./acts.ts";
import { aliveResidents, standingOf, definitionOf, hasPassed, isOpenOnClock, isPlayable, lastLevelOf, levelOf, nextPenalty, offencesOf, opensAt } from "./levels.ts";
import { doorIn, type Standing } from "./model.ts";
import { problemFor, withTaskLines } from "./task.ts";

const CITY = "CITY";

/** What a submission came to. */
export type SubmitOutcome =
	| { readonly status: "correct"; readonly reward: number; readonly nextLevel: number; readonly receipt: string; readonly held?: true }
	| { readonly status: "incorrect"; readonly penalty: number; readonly attemptsRemaining: number; readonly nextPenalty: number }
	| { readonly status: "wrong_level"; readonly currentLevel: number }
	| { readonly status: "already_solved" }
	| { readonly status: "invalid_format"; readonly expectedLength: number; readonly digitsOnly: boolean }
	| { readonly status: "rate_limited" }
	| { readonly status: "door_closed"; readonly opensAt: number };

/**
 * A resident submits a code; the outcome is logged as `submission` whatever it is.
 * @param ctx - The context of the progression.
 * @param agent - The resident.
 * @param level - The level.
 * @param code - The code the resident submitted.
 * @returns What the submission came to.
 */
export function submit(ctx: ProgressionCtx, agent: string, level: number, code: string): SubmitOutcome {
	const outcome = judge(ctx, agent, level, code);
	const deltaPoints = outcome.status === "correct" ? outcome.reward : outcome.status === "incorrect" ? -outcome.penalty : 0;
	ctx.emit("submission", { agent, level, outcome: outcome.status, deltaPoints });
	return outcome;
}

// The refusals before the code is read, in the old order: the level, a solved level, the door clock.
function placed(ctx: ProgressionCtx, entry: Standing, level: number): SubmitOutcome | undefined {
	if (level > entry.level || level > lastLevelOf(ctx) || level < ctx.options.startLevel) return { status: "wrong_level", currentLevel: entry.level };
	if (level < entry.level || entry.solved.includes(level)) return { status: "already_solved" };
	return isOpenOnClock(ctx, level) ? undefined : { status: "door_closed", opensAt: opensAt(ctx, level) };
}

function judge(ctx: ProgressionCtx, agent: string, level: number, code: string): SubmitOutcome {
	const entry = standingOf(ctx, agent);
	const refused = placed(ctx, entry, level);
	if (refused !== undefined) return refused;

	const solution = ctx.call(LevelPiecesService, "solutionOf", { resident: agent, level });
	if (solution === null) throw new RangeError(`progression: ${agent} has no code on level ${String(level)}`);
	const digitsOnly = ctx.call(LevelPiecesService, "kindOf", { level }) === "additive";
	const attempt = digitsOnly ? code.trim() : code.trim().toUpperCase();
	const wellFormed = attempt.length === solution.length && (!digitsOnly || /^\d+$/.test(attempt));
	if (!wellFormed) return { status: "invalid_format", expectedLength: solution.length, digitsOnly };

	const recent = entry.wrongAttempts.filter((at) => ctx.tick - at < ctx.options.attemptWindowMinutes);
	entry.wrongAttempts.splice(0, entry.wrongAttempts.length, ...recent);
	if (recent.length >= ctx.options.maxAttemptsPerWindow) return { status: "rate_limited" };

	const definition = definitionOf(ctx, level);
	if (definition === undefined) return { status: "wrong_level", currentLevel: entry.level };
	return attempt === solution ? solved(ctx, agent, entry, level, definition.reward) : wrong(ctx, agent, entry, level);
}

function solved(ctx: ProgressionCtx, agent: string, entry: Standing, level: number, reward: number): SubmitOutcome {
	if (reward > 0) ctx.call(LedgerService, "mint", { account: agent, amount: reward, reason: `level ${String(level)} solved` });
	entry.solved.push(level);
	ctx.state.solves.push({ agent, level, tick: ctx.tick });
	entry.wrongAttempts.length = 0;
	entry.wrongOnLevel = 0;
	const receipt = ctx.tryCall(ReceiptSourceService, "ofLevel", { resident: agent, level }) ?? "none";
	if (level === ctx.state.door) {
		// The log marks the pass now; the entry into the next level waits for the door.
		entry.held = true;
		ctx.emit("level_up", { agent, from: level, to: level + 1 });
		ctx.call(ChannelsService, "notify", { to: agent, author: CITY, text: ctx.prompt("progression/door-wait", { level }) });
		return { status: "correct", reward, nextLevel: level + 1, receipt, held: true };
	}
	enterLevel(ctx, agent, level + 1, false);
	return { status: "correct", reward, nextLevel: level + 1, receipt };
}

function wrong(ctx: ProgressionCtx, agent: string, entry: Standing, level: number): SubmitOutcome {
	const penalty = nextPenalty(ctx, agent);
	offencesOf(ctx, agent).wrong += 1;
	if (penalty > 0) ctx.call(LedgerService, "burn", { account: agent, amount: penalty, reason: `level ${String(level)} wrong submission` });
	entry.wrongAttempts.push(ctx.tick);
	entry.wrongOnLevel += 1;
	return { status: "incorrect", penalty, attemptsRemaining: Math.max(0, ctx.options.maxAttemptsPerWindow - entry.wrongAttempts.length), nextPenalty: nextPenalty(ctx, agent) };
}

/**
 * The resident enters `level`; `announced` when its `level_up` was logged at the pass (a door that was shut).
 * @param ctx - The context of the progression.
 * @param agent - The resident.
 * @param level - The level.
 * @param announced - Whether its `level_up` was written at the pass already.
 */
export function enterLevel(ctx: ProgressionCtx, agent: string, level: number, announced: boolean): void {
	const entry = standingOf(ctx, agent);
	const from = entry.level;
	entry.level = level;
	noteActStarts(ctx, level);
	syncLocks(ctx, agent);
	if (!announced) ctx.emit("level_up", { agent, from, to: level });
	notifyHolders(ctx, agent, level);
	ctx.emit("level_entered", { agent, level });
}

function costText(ctx: ProgressionCtx, holder: string): string {
	const price = ctx.tryCall(AllowanceService, "priceOf", { resident: holder, channel: "dm" }) ?? 0;
	if (price === 0) return ctx.prompt("progression/cost-free", {});
	return price === 1 ? ctx.prompt("progression/cost-one-mark", {}) : ctx.prompt("progression/cost-marks", { price });
}

/**
 * On an additive level, a holder of what the arriving resident needs who is still on a lower level never read it in
 * a task: the city tells it privately right away, and that the piece is its to give.
 * @param ctx - The context of the progression.
 * @param agent - The resident.
 * @param level - The level.
 */
function notifyHolders(ctx: ProgressionCtx, agent: string, level: number): void {
	for (const { holder, piece, value } of ctx.call(LevelPiecesService, "holders", { resident: agent, level })) {
		// A holder waiting at an opening door enters with the others and reads the piece in its task.
		if (levelOf(ctx, holder) >= level || standingOf(ctx, holder).held) continue;
		const needs = piece === "counter-factor" ? ctx.prompt("progression/needs-counter", { value }) : ctx.prompt("progression/needs-certificate", { value });
		ctx.call(ChannelsService, "notify", { to: holder, author: CITY, text: ctx.prompt("progression/holder-notice", { agent, level, needs, cost: costText(ctx, holder) }) });
	}
}

/**
 * Opens the door once every resident in the city has passed its level, or the door was released: deals the levels up to the next door (or the
 * last level) and lets every waiting resident enter the next level, in roster order.
 * @param ctx - The context of the progression.
 * @returns True when the door opened.
 */
export function openDoor(ctx: ProgressionCtx): boolean {
	const door = ctx.state.door;
	if (door === undefined || (!ctx.state.doorReleased && !aliveResidents(ctx).every((id) => hasPassed(ctx, id, door)))) return false;
	// The next door is clamped below the last level, as the first one is.
	const holdAfter = doorIn(ctx.options);
	const next = holdAfter !== undefined && holdAfter > door ? holdAfter : undefined;
	ctx.state.door = next;
	ctx.state.doorReleased = false;
	for (let level = door + 1; level <= Math.min(next ?? lastLevelOf(ctx), lastLevelOf(ctx)); level++) ctx.call(LevelPiecesService, "deal", { level });
	for (const [id, entry] of ctx.state.standings) {
		if (!entry.held) continue;
		entry.held = false;
		enterLevel(ctx, id, door + 1, true);
	}
	return true;
}

/**
 * The door clock: a door that opens at the start of `minute` lets in the residents who wait at it, and the city
 * tells each of them privately, with the task they could not read before and the lines other mechanics put under it.
 * @param ctx - The context of the progression.
 * @param minute - The minute (tick) that starts.
 */
export function openOnClock(ctx: ProgressionCtx, minute: number): void {
	for (const definition of ctx.options.levels) {
		// Nobody waits at a door open from the start.
		if (minute === 0 || definition.opensAt !== minute || !isPlayable(ctx, definition.number)) continue;
		for (const agent of aliveResidents(ctx)) {
			if (levelOf(ctx, agent) !== definition.number || standingOf(ctx, agent).held) continue;
			const problem = problemFor(ctx, agent, definition.number);
			if (problem.ok) ctx.call(ChannelsService, "notify", { to: agent, author: CITY, text: ctx.prompt("progression/door-open", { level: definition.number, minute, task: withTaskLines(ctx, problem.value.text, definition.number) }) });
		}
	}
}
