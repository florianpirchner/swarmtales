// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The gamemaker's plan of the next tribunal, carried from the old `schedule.ts` (`schedulingWindow`, `schedule`,
 * `cityCall`) and `view.ts` (`mayScheduleTribunal`): the guard rails in the old order with the old refusal texts, and
 * when the city calls a tribunal itself if nobody plans one.
 */
import { ProgressionService } from "@swarmtales/mechanic-progression/contract";
import { refuse, reply } from "@swarmtales/sdk";
import type { RandomSource, ToolOutcome } from "@swarmtales/contracts";
import { active, endOfAct, missing, present } from "./city.ts";
import { planTribunal } from "./court.ts";
import type { Reads, TribunalCtx, TribunalToolCtx } from "./head.ts";
import { callTick, earliestOpening, fitsBefore, lastCityTick, maxFactions, roomAfter } from "./pacing.ts";
import { currentSession, previousOpening } from "./state.ts";

/**
 * Whether `scheduleTribunal` is open now, and its bounds (old `TribunalViewApi.schedulingWindow`).
 *
 * @public
 */
export type SchedulingWindow =
	| { readonly open: false; readonly why: string }
	| { readonly open: true; readonly earliest: number; readonly latestFinal: number; readonly latestWithRoom?: number; readonly missing: number; readonly maxFactions: number };

// The reason the window is closed before any bound is computed, or undefined.
function closedBecause(ctx: Reads): string | undefined {
	const { state } = ctx;
	if (!active(ctx) || state.ended || state.halted) return "the city holds no more tribunals";
	if (state.actStart === undefined) return "the tribunal's act has not begun";
	if (state.called === 0) return "the first tribunal has not been called yet";
	if (state.plan !== undefined || currentSession(state) !== undefined) return "a tribunal is pending; plan the next once its result is out";
	if (missing(ctx) === 0) return "the target is reached; the last gates are closing";
	if (ctx.call(ProgressionService, "doorShut", {})) return "a snapshot door is shut; plan once it opens";
	return undefined;
}

/**
 * Old `schedulingWindow`: whether the gamemaker may plan now, and the bounds of a plan.
 *
 * @param ctx - The context or the facts' view.
 * @returns The window.
 *
 * @public
 */
export function schedulingWindow(ctx: Reads): SchedulingWindow {
	const why = closedBecause(ctx);
	if (why !== undefined) return { open: false, why };
	const { state, options: spec } = ctx;
	const earliest = earliestOpening(spec, state.lastTick + 1, previousOpening(state));
	const end = endOfAct(ctx);
	const last = lastCityTick(end) - spec.voteMinutes - spec.gateMinutes;
	if (earliest > last) return { open: false, why: "no tribunal fits before the act's last minute" };
	let latestWithRoom: number | undefined;
	for (let opens = earliest; opens <= last; opens++) if (roomAfter(spec, opens, end)) latestWithRoom = opens;
	const factions = spec.factions === undefined ? 0 : maxFactions(present(ctx).length);
	return { open: true, earliest, latestFinal: last, ...(latestWithRoom === undefined ? {} : { latestWithRoom }), missing: missing(ctx), maxFactions: factions };
}

// Whether the city may still call one itself: tribunals held, the first called, nothing pending, something missing.
function callable(ctx: Reads): boolean {
	const { state } = ctx;
	if (!active(ctx) || state.ended || state.halted || state.called === 0) return false;
	return state.plan === undefined && currentSession(state) === undefined && missing(ctx) > 0;
}

/**
 * Old `cityCall`: when the city calls a tribunal itself if nobody plans one.
 *
 * @param ctx - The context or the facts' view.
 * @returns The tick of the call and of the opening, or null.
 *
 * @public
 */
export function cityCall(ctx: Reads): { readonly calledAt: number; readonly opens: number } | null {
	const { state, options: spec } = ctx;
	if (!callable(ctx)) return null;
	const previous = previousOpening(state);
	const end = endOfAct(ctx);
	const fallback = state.lastResult === undefined ? undefined : state.lastResult + spec.fallbackGap;
	for (let minute = state.lastTick + 1; minute < end; minute++) {
		const opens = earliestOpening(spec, minute, previous);
		if (!fitsBefore(spec, opens, end)) return null;
		const final = !fitsBefore(spec, earliestOpening(spec, minute + 1, previous), end);
		if (final || (fallback !== undefined && minute >= fallback)) return { calledAt: callTick(spec, opens, previous), opens };
	}
	return null;
}

/**
 * The params of `scheduleTribunal`.
 *
 * @public
 */
export interface ScheduleParams {
	/** The tick it opens. */
	readonly minute: number;
	/** Residents it exiles. */
	readonly count: number;
	/** Factions formed before it. */
	readonly factions?: number | undefined;
	/** Why, logged only. */
	readonly reason: string;
}

type Open = Extract<SchedulingWindow, { open: true }>;
interface Refused {
	readonly code: string;
	readonly detail: string;
}

// The factions asked (left out: the story's default count, within what the city's residents allow), or the refusal.
function factionsOf(ctx: TribunalCtx, window: Open, factions: number | undefined): Refused | number {
	const draft = ctx.options.factions;
	if (draft === undefined) return factions === undefined ? 0 : { code: "INVALID_FACTIONS", detail: "this city holds no faction draft; leave factions out" };
	if (window.maxFactions < 2) return 0;
	const asked = factions ?? Math.min(draft.count, window.maxFactions);
	if (!Number.isInteger(asked) || asked < 2 || asked > window.maxFactions) return { code: "INVALID_FACTIONS", detail: `factions must be between 2 and ${String(window.maxFactions)} (half of the residents present)` };
	return asked;
}

// The opening's checks: not before the earliest, not after the latest, and room for one more unless it takes all.
function minuteRefused(ctx: TribunalCtx, window: Open, minute: number, count: number): Refused | undefined {
	if (!Number.isInteger(minute) || minute < window.earliest) {
		return { code: "INVALID_MINUTE", detail: `the earliest opening is minute ${String(window.earliest)} (the call comes ahead of it, not before the next minute, and ${String(ctx.options.minGap)} minutes after the previous opening)` };
	}
	if (minute > window.latestFinal) return { code: "INVALID_MINUTE", detail: `the latest opening is minute ${String(window.latestFinal)}: vote and gate must end before the act does` };
	const left = String(window.missing);
	if (count >= window.missing || (window.latestWithRoom !== undefined && minute <= window.latestWithRoom)) return undefined;
	const detail = window.latestWithRoom === undefined ? `no tribunal fits after this one: exile all ${left} still missing (count ${left})` : `open by minute ${String(window.latestWithRoom)} to leave room for one more tribunal, or exile all ${left} still missing`;
	return { code: "INVALID_MINUTE", detail };
}

// The plan's checks in the old order: the count, the factions, the minute; the refusal or the factions it forms.
function checked(ctx: TribunalCtx, window: Open, { minute, count, factions }: ScheduleParams): Refused | number {
	if (!Number.isInteger(count) || count < 1 || count > window.missing) return { code: "INVALID_COUNT", detail: `count must be between 1 and ${String(window.missing)}, the residents still to exile` };
	const formed = factionsOf(ctx, window, factions);
	return typeof formed === "number" ? (minuteRefused(ctx, window, minute, count) ?? formed) : formed;
}

/**
 * Old `scheduleTribunal`: the gamemaker plans the next tribunal within the guard rails.
 *
 * @param ctx - The tool's context.
 * @param params - The plan.
 * @returns The old reply, or the refusal.
 * @throws SwtError `SWT-G020` when a text of the options names an unknown placeholder.
 */
export function runSchedule(ctx: TribunalToolCtx, params: ScheduleParams): ToolOutcome {
	const window = schedulingWindow(ctx);
	if (!window.open) return refuse("NOT_NOW", window.why);
	const factions = checked(ctx, window, params);
	if (typeof factions !== "number") return refuse(factions.code, factions.detail);
	const plan = planTribunal(ctx, params.minute, params.count, factions, "gamemaker", params.reason.trim().slice(0, 500));
	ctx.state.gamemakerPlanned = ctx.tick;
	const text = ctx.prompt("tribunal/gamemaker/replies/tribunal-planned", { tribunal: plan.tribunal, calledAt: plan.calledAt, opens: plan.opens, count: plan.count });
	return reply(plan.factions >= 2 ? `${text}, ${ctx.prompt("tribunal/gamemaker/replies/tribunal-factions", { factions: plan.factions })}` : text);
}

/**
 * Old `#mayScheduleTribunal`: the gamemaker is offered `scheduleTribunal` while the window is open and a resident in the
 * city plays a level of the `director` role. The old look kept the tool for the rest of the look, so a second plan in
 * the same tick is let through to `NOT_NOW` once the gamemaker planned one.
 *
 * @param ctx - The context.
 * @returns True when the tool is open.
 */
export function mayScheduleTribunal(ctx: TribunalCtx): boolean {
	if (ctx.state.gamemakerPlanned === ctx.tick) return true;
	if (!schedulingWindow(ctx).open) return false;
	const roles = ctx.options.gamemakerRoles ?? [];
	const roleOn = (level: number): string | undefined => roles.filter((entry) => entry.fromLevel <= level).at(-1)?.role;
	return present(ctx).some((agent) => roleOn(ctx.call(ProgressionService, "levelOf", { resident: agent })) === "director");
}

/** The share of the times the sample of `scheduleTribunal` is asked in which it gives a plan. */
const SAMPLE_RATE = 0.25;
const SAMPLE_REASON = "The city has waited long enough; the next tribunal settles who is still missing.";

/**
 * What the fake driver (`--fake`) may call of `scheduleTribunal`: now and then a plan inside the window's bounds, for
 * one resident at an opening that leaves room for one more tribunal, or for every resident still missing at any
 * opening when none fits after it (the story's factions). While the tool is not offered it gives nothing and draws
 * nothing, so a run in which the gamemaker cannot plan plays as before. No sample changes state.
 *
 * @param ctx - The context of the tool call.
 * @param random - The fake driver's random stream.
 * @returns The params, or undefined most of the time and while the tool is not offered.
 */
export function sampleSchedule(ctx: TribunalToolCtx, random: RandomSource): { minute: number; count: number; reason: string } | undefined {
	if (!mayScheduleTribunal(ctx)) return undefined;
	const window = schedulingWindow(ctx);
	if (!window.open || random.next() >= SAMPLE_RATE) return undefined;
	const { earliest, latestWithRoom, missing: left } = window;
	if (latestWithRoom === undefined) return { minute: random.int(earliest, window.latestFinal), count: left, reason: SAMPLE_REASON };
	return { minute: random.int(earliest, latestWithRoom), count: 1, reason: SAMPLE_REASON };
}
