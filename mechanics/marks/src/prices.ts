// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The prices on the tools of other mechanics (12-m5-spec.md 2.2, pattern 2): the old callers asked `canAfford` before
 * a message and `spend` after it; here `marks` does both in its own stage handlers, by the bare tool name. The check
 * is a `rule` handler (`NO_MARKS`), the charge an `after` handler on a call that succeeded (decision A51: no stage
 * `afford` in the kernel). Where both a tool's own check and the price refuse, the tool's own `rule` answers first; a
 * tool that checks in its body (`postBoard`, `sendDM`) answers `NO_MARKS` first (erratum J45, registered).
 */
import { Type } from "typebox";
import { Value } from "typebox/value";
import type { InputLine, Refusal, ToolOutcome } from "@swarmtales/contracts";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { ProgressionService, TaskLinesService } from "@swarmtales/mechanic-progression/contract";
import { refuse, type StageCall } from "@swarmtales/sdk";
import { activeOn, canAfford, priceOf, runWide, spend, statusOf, termsOn, type Book, type Channel } from "./book.ts";
import type { MarksCtx } from "./head.ts";

/** The tools a price is asked for, by bare name, and their channel: the messages of `channels`, a shown and a forged receipt. */
const PRICED: Readonly<Record<string, Channel>> = { postBoard: "board", sendDM: "dm", postGroup: "group", showReceipt: "receipt", forgeReceipt: "receipt" };

/** The old order of the marks part of the status line and of the terms under the task (after the names and the holdout rule). */
const STATUS_ORDER = 500;
const TASK_ORDER = 300;

const InGroup = Type.Object({ groupId: Type.String({ description: "The group" }) }, { description: "A call that names a group" });

/**
 * The book of the marks: the options, the level of each resident (from `progression`, else `startLevel`) and the tick.
 *
 * @param ctx - The context.
 * @returns The book.
 */
export function bookOf(ctx: MarksCtx): Book {
	const { rules, levels, startLevel } = ctx.options;
	return {
		rules,
		overrides: new Map(levels.map((entry) => [entry.level, entry.perLevel])),
		levelOf: (resident) => ctx.tryCall(ProgressionService, "levelOf", { resident }) ?? startLevel,
		tick: ctx.tick,
	};
}

// The channel a call pays on, or undefined: not a priced tool, no resident, or a post in a group of the city (free).
function channelOf(call: StageCall, ctx: MarksCtx): Channel | undefined {
	const channel = PRICED[call.tool];
	if (channel === undefined || call.resident === undefined) return undefined;
	if (channel !== "group" || !Value.Check(InGroup, call.params)) return channel;
	return ctx.tryCall(ChannelsService, "group", { group: call.params.groupId })?.founder === "CITY" ? undefined : channel;
}

/**
 * The `rule` handler: a priced call the resident cannot pay is refused (old `canAfford`).
 *
 * @param call - The call.
 * @param ctx - The context.
 * @returns `NO_MARKS`, or undefined.
 */
export function checkPrice(call: StageCall, ctx: MarksCtx): Refusal | undefined {
	const channel = channelOf(call, ctx);
	if (channel === undefined || call.resident === undefined) return undefined;
	return canAfford(ctx.state, bookOf(ctx), call.resident, channel) ? undefined : refuse("NO_MARKS");
}

/**
 * The `after` handler: a priced call that succeeded is paid and `marks_spent` written; a free channel books nothing.
 *
 * @param call - The call.
 * @param outcome - Its outcome.
 * @param ctx - The context.
 */
export function chargePrice(call: StageCall, outcome: ToolOutcome, ctx: MarksCtx): void {
	const channel = channelOf(call, ctx);
	const resident = call.resident;
	if (!outcome.ok || channel === undefined || resident === undefined) return;
	const book = bookOf(ctx);
	if (priceOf(book, book.levelOf(resident), channel) === 0) return;
	const status = spend(ctx.state, book, resident, channel);
	if (status !== undefined) ctx.emit("marks_spent", { agent: resident, channel, remaining: status.remaining });
}

/**
 * The price the resident pays on the channel now, the one {@link chargePrice} books for this call.
 *
 * @param ctx - The context.
 * @param resident - The resident.
 * @param channel - The channel.
 * @returns The price, or null where marks do not apply.
 */
export function priceNow(ctx: MarksCtx, resident: string, channel: Channel): number | null {
	const book = bookOf(ctx);
	const level = book.levelOf(resident);
	return activeOn(book, level) ? priceOf(book, level, channel) : null;
}

/**
 * "1 mark per minute", "1 mark every 3 minutes", "2 marks every 3 minutes" (old `refillText`).
 *
 * @param marks - The marks that come back.
 * @param every - The ticks between two refills.
 * @returns The text.
 */
function regainText(marks: number, every: number): string {
	const amount = `${String(marks)} ${marks === 1 ? "mark" : "marks"}`;
	return every === 1 ? `${amount} per minute` : `${amount} every ${String(every)} minutes`;
}

/**
 * The marks terms of a level (old `taskLine`), or null where marks do not apply.
 *
 * @param ctx - The context.
 * @param level - The level.
 * @returns The line.
 */
export function termsLine(ctx: MarksCtx, level: number): string | null {
	const book = bookOf(ctx);
	if (!activeOn(book, level)) return null;
	const { budget, prices, refill } = termsOn(book, level);
	const values = { budget, board: prices.board, group: prices.group, dm: prices.dm, receipt: prices.receipt };
	if (runWide(book)) return ctx.prompt("marks/task/marks-run", values);
	return refill === undefined ? ctx.prompt("marks/task/marks-level", values) : ctx.prompt("marks/task/marks-level-refill", { ...values, regain: regainText(refill.marks, refill.everyMinutes) });
}

// Whether the progression shows the task of the resident's level now (the old task carried the terms): a new level, not finished, its door open.
function taskShown(ctx: MarksCtx, resident: string, level: number): boolean {
	if (ctx.state.shown.get(resident) === level) return false;
	const finished = ctx.tryCall(ProgressionService, "isFinished", { resident });
	return finished === false && ctx.tryCall(ProgressionService, "isOpenOnClock", { level }) === true;
}

/**
 * The marks part of the status line, and the terms under a new task (erratum J31: a line of its own, kind `task`).
 *
 * @param ctx - The context.
 * @param resident - The resident that is activated.
 * @returns The lines.
 */
export function marksLines(ctx: MarksCtx, resident: string): readonly InputLine[] {
	const book = bookOf(ctx);
	const status = statusOf(ctx.state, book, resident);
	const lines: InputLine[] = status === undefined ? [] : [{ kind: "status", order: STATUS_ORDER, text: ctx.prompt("marks/status/marks", { remaining: status.remaining, budget: status.budget }) }];
	const level = book.levelOf(resident);
	const terms = taskShown(ctx, resident, level) ? termsLine(ctx, level) : null;
	return terms === null ? lines : [...lines, { kind: "task", order: TASK_ORDER, text: terms }];
}

/**
 * Puts the terms of every level under the task of the progression's door-open notice (old `withAddenda`, erratum
 * J211); without a provider of `progression` there is no task and nothing to add.
 *
 * @param ctx - The context.
 */
export function addTermsToTasks(ctx: MarksCtx): void {
	const bounds = ctx.tryCall(ProgressionService, "bounds", {});
	if (bounds === undefined) return;
	for (let level = bounds.startLevel; level <= bounds.lastLevel; level++) {
		const text = termsLine(ctx, level);
		if (text !== null) ctx.tryCall(TaskLinesService, "add", { order: TASK_ORDER, text, level });
	}
}
