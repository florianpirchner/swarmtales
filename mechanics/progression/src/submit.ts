/**
 * Submitting a code, entering a level and the doors (old `submit`, `#submit`, `#enterLevel`,
 * `#notifyHolders`, `openDoor`, `releaseDoor`, `#openOnClock` of packages/engine/src/world.ts). The
 * order of the checks and of the events is the old one: reward, receipt, `level_up`, notices, then
 * `submission`.
 */
import { ChannelsApi, LedgerApi, MarksApi, PuzzlesApi, ReceiptsApi } from "@swarmtales/mechanic-shared";
import type { ProgressionCtx } from "./head.ts";
import {
	aliveResidents,
	competitorOf,
	definitionOf,
	hasPassed,
	isOpenOnClock,
	isPlayable,
	lastLevelOf,
	levelOf,
	nextPenalty,
	noteActStarts,
	offencesOf,
	opensAt,
	syncLocks,
} from "./levels.ts";
import { problemFor } from "./task.ts";

const CITY = "CITY";

export type SubmitOutcome =
	| { readonly status: "correct"; readonly reward: number; readonly nextLevel: number; readonly receipt: string; readonly held?: true }
	| { readonly status: "incorrect"; readonly penalty: number; readonly attemptsRemaining: number; readonly nextPenalty: number }
	| { readonly status: "wrong_level"; readonly currentLevel: number }
	| { readonly status: "already_solved" }
	| { readonly status: "invalid_format"; readonly expectedLength: number; readonly digitsOnly: boolean }
	| { readonly status: "rate_limited" }
	| { readonly status: "door_closed"; readonly opensAt: number };

/** A resident submits a code; the outcome is logged as `submission` whatever it is. */
export function submit(ctx: ProgressionCtx, agent: string, level: number, code: string): SubmitOutcome {
	const outcome = judge(ctx, agent, level, code);
	const deltaPoints = outcome.status === "correct" ? outcome.reward : outcome.status === "incorrect" ? -outcome.penalty : 0;
	ctx.emit("submission", { agent, level, outcome: outcome.status, deltaPoints });
	return outcome;
}

function judge(ctx: ProgressionCtx, agent: string, level: number, code: string): SubmitOutcome {
	const entry = competitorOf(ctx, agent);
	if (level > entry.level || level > lastLevelOf(ctx) || level < ctx.options.startLevel) return { status: "wrong_level", currentLevel: entry.level };
	if (level < entry.level || entry.solved.includes(level)) return { status: "already_solved" };
	if (!isOpenOnClock(ctx, level)) return { status: "door_closed", opensAt: opensAt(ctx, level) };

	const solution = ctx.call(PuzzlesApi, "solutionOf", { resident: agent, level });
	if (solution === null) throw new Error(`${agent} has no code on level ${level}`);
	const digitsOnly = ctx.call(PuzzlesApi, "kindOf", { level }) === "additive";
	const attempt = digitsOnly ? code.trim() : code.trim().toUpperCase();
	const wellFormed = attempt.length === solution.length && (!digitsOnly || /^\d+$/.test(attempt));
	if (!wellFormed) return { status: "invalid_format", expectedLength: solution.length, digitsOnly };

	const minute = ctx.minute;
	const recent = entry.wrongAttempts.filter((at) => minute - at < ctx.options.attemptWindowMinutes);
	entry.wrongAttempts.splice(0, entry.wrongAttempts.length, ...recent);
	if (recent.length >= ctx.options.maxAttemptsPerWindow) return { status: "rate_limited" };

	const definition = definitionOf(ctx, level);
	if (definition === undefined) return { status: "wrong_level", currentLevel: entry.level };

	if (attempt === solution) {
		if (definition.reward > 0) ctx.call(LedgerApi, "mint", { account: agent, amount: definition.reward, reason: `level ${level} solved` });
		entry.solved.push(level);
		entry.wrongAttempts.length = 0;
		const receipt = ctx.call(ReceiptsApi, "issue", { body: { kind: "levelUp", agent, level, reward: definition.reward } });
		if (level === ctx.state.door) {
			// The log marks the pass now; the entry into the next level waits for the door.
			entry.held = true;
			ctx.emit("level_up", { agent, from: level, to: level + 1 });
			ctx.call(ChannelsApi, "notify", { to: agent, author: CITY, text: ctx.prompt("progression/door-wait", { level }) });
			return { status: "correct", reward: definition.reward, nextLevel: level + 1, receipt: receipt.id, held: true };
		}
		enterLevel(ctx, agent, level + 1, false);
		return { status: "correct", reward: definition.reward, nextLevel: level + 1, receipt: receipt.id };
	}

	const penalty = nextPenalty(ctx, agent);
	offencesOf(ctx, agent).wrong += 1;
	if (penalty > 0) ctx.call(LedgerApi, "burn", { account: agent, amount: penalty, reason: `level ${level} wrong submission` });
	entry.wrongAttempts.push(minute);
	return { status: "incorrect", penalty, attemptsRemaining: Math.max(0, ctx.options.maxAttemptsPerWindow - entry.wrongAttempts.length), nextPenalty: nextPenalty(ctx, agent) };
}

/** The resident enters `level`; `announced` when its `level_up` was logged at the pass (a door that was shut). */
export function enterLevel(ctx: ProgressionCtx, agent: string, level: number, announced: boolean): void {
	const entry = competitorOf(ctx, agent);
	const from = entry.level;
	entry.level = level;
	noteActStarts(ctx, level);
	syncLocks(ctx, agent);
	if (!announced) ctx.emit("level_up", { agent, from, to: level });
	notifyHolders(ctx, agent, level);
	// After the holder notices: the script's director reacts to this (D-2).
	ctx.emit("level_entered", { agent, level });
}

/**
 * On an additive level, a holder of what the arriving resident needs who is still on a lower level
 * never read it in a task: the city tells it privately right away, and that the piece is its to give.
 */
function notifyHolders(ctx: ProgressionCtx, agent: string, level: number): void {
	for (const { holder, piece, value } of ctx.call(PuzzlesApi, "holders", { resident: agent, level })) {
		// A holder waiting at an opening door enters with the others and reads the piece in its task.
		if (levelOf(ctx, holder) >= level || competitorOf(ctx, holder).held) continue;
		const needs = piece === "counter-factor" ? ctx.prompt("progression/needs-counter", { value }) : ctx.prompt("progression/needs-certificate", { value });
		const price = ctx.tryCall(MarksApi, "priceOf", { resident: holder, channel: "dm" }) ?? 0;
		const cost = price === 0 ? ctx.prompt("progression/cost-free", {}) : price === 1 ? ctx.prompt("progression/cost-one-mark", {}) : ctx.prompt("progression/cost-marks", { price });
		ctx.call(ChannelsApi, "notify", { to: holder, author: CITY, text: ctx.prompt("progression/holder-notice", { agent, level, needs, cost }) });
	}
}

/**
 * Opens the door once every resident has passed its level: deals the levels up to the next door (or
 * the last level) and lets every waiting resident enter the next level, in roster order.
 */
export function openDoor(ctx: ProgressionCtx): boolean {
	const door = ctx.state.door;
	if (door === undefined || (!ctx.state.doorReleased && !aliveResidents(ctx).every((id) => hasPassed(ctx, id, door)))) return false;
	const holdAfter = ctx.options.holdAfter;
	const next = holdAfter !== undefined && holdAfter > door ? holdAfter : undefined;
	ctx.state.door = next;
	ctx.state.doorReleased = false;
	for (let level = door + 1; level <= Math.min(next ?? lastLevelOf(ctx), lastLevelOf(ctx)); level++) ctx.call(PuzzlesApi, "deal", { level });
	for (const [id, entry] of ctx.state.competitors) {
		if (!entry.held) continue;
		entry.held = false;
		enterLevel(ctx, id, door + 1, true);
	}
	return true;
}

/**
 * The door clock: a door that opens at the start of `minute` lets in the residents who wait at it,
 * and the city tells each of them privately, with the task they could not read before.
 */
export function openOnClock(ctx: ProgressionCtx, minute: number): void {
	for (const definition of ctx.options.levels) {
		// Nobody waits at a door open from the start.
		if (minute === 0 || definition.opensAt !== minute || !isPlayable(ctx, definition.number)) continue;
		for (const agent of aliveResidents(ctx)) {
			if (levelOf(ctx, agent) !== definition.number || competitorOf(ctx, agent).held) continue;
			const problem = problemFor(ctx, agent, definition.number);
			if (problem.ok) ctx.call(ChannelsApi, "notify", { to: agent, author: CITY, text: ctx.prompt("progression/door-open", { level: definition.number, minute, task: problem.value.text }) });
		}
	}
}
