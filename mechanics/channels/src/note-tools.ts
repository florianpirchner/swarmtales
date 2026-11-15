// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The Director tools of the note desk (old `gamemaker.ts`): a numbered private note to one resident (`notify`) and a
 * post on the board signed with the note author's name (`boardNote`; the old tool was called `postBoard`, which a
 * game shows again with `as`). The checks keep the old order where they can: the reader exists and is not exiled,
 * the length and the repeat as the tool's own rule, then the rules of the owners of game facts, and the budget last
 * in `execute`.
 */
import type { RandomSource, Refusal, ToolOutcome } from "@swarmtales/contracts";
import { refuse, reply } from "@swarmtales/sdk";
import type { ToolCtx } from "./head.ts";
import { note, postToBoard } from "./messages.ts";
import { budgetRefusal, checkNote, noteBudget, recordNote, refusalFor, refusalOfText } from "./notes.ts";

/** The share of the times a sample is asked in which it gives a call. */
const RATE = 0.25;

/**
 * The rule of `notify`: the reader, then its text.
 *
 * @param ctx - The context of the tool call.
 * @param agent - The reader as the Director wrote it.
 * @param text - The text.
 * @returns `UNKNOWN_AGENT`, `EXILED`, `INVALID_TEXT` or `REPEATED`, or undefined.
 */
export function checkNotify(ctx: ToolCtx, agent: string, text: string): Refusal | undefined {
	if (!ctx.residents.has(agent)) return refuse("UNKNOWN_AGENT", agent);
	if (!ctx.residents.mayAct(agent)) return refusalOfText(ctx.prompt("channels/notes/exiled", { agent }));
	const checked = checkNote(ctx, text, agent);
	return checked.ok ? undefined : refusalFor(checked);
}

/**
 * Runs `notify` after the rules: the budget, then the note with its number and `gamemaker_note`.
 *
 * @param ctx - The context of the tool call.
 * @param agent - The reader.
 * @param text - The text.
 * @returns `delivered to A02 as #12`, or `BUDGET`.
 */
export function runNotify(ctx: ToolCtx, agent: string, text: string): ToolOutcome {
	const checked = checkNote(ctx, text, agent);
	if (!checked.ok) return refusalFor(checked);
	const spent = budgetRefusal(ctx, agent);
	if (spent !== undefined) return spent;
	const number = note(ctx, agent, ctx.options.noteAuthor, checked.text);
	recordNote(ctx, agent, checked.text, number);
	return reply(ctx.prompt("channels/notes/delivered", { agent, number }));
}

/**
 * The rule of `boardNote`: its text.
 *
 * @param ctx - The context of the tool call.
 * @param text - The text.
 * @returns `INVALID_TEXT` or `REPEATED`, or undefined.
 */
export function checkBoardNote(ctx: ToolCtx, text: string): Refusal | undefined {
	const checked = checkNote(ctx, text, "board");
	return checked.ok ? undefined : refusalFor(checked);
}

/**
 * Runs `boardNote` after the rules: the budget, then the city's post and `gamemaker_note`.
 *
 * @param ctx - The context of the tool call.
 * @param text - The text.
 * @returns `posted as #12`, or `BUDGET`.
 */
export function runBoardNote(ctx: ToolCtx, text: string): ToolOutcome {
	const checked = checkNote(ctx, text, "board");
	if (!checked.ok) return refusalFor(checked);
	const spent = budgetRefusal(ctx, "board");
	if (spent !== undefined) return spent;
	const post = postToBoard(ctx, ctx.options.noteAuthor, checked.text, "city");
	recordNote(ctx, "board", checked.text, post.seq);
	return reply(ctx.prompt("channels/notes/posted", { number: post.seq }));
}

// A fresh line: its number is the next message number, so it is no repeat of an earlier note.
const lineOf = (ctx: ToolCtx): string => `Note ${String(ctx.state.numbers.last + 1)}.`;
const open = (ctx: ToolCtx, to: string): boolean => noteBudget(ctx, to).used < noteBudget(ctx, to).limit;

/**
 * A note to a resident that may act and whose budget holds, for the fake driver.
 *
 * @param ctx - The context of the tool call.
 * @param random - The fake driver's random stream.
 * @returns The params, or undefined now and then and when no reader is open.
 */
export function sampleNotify(ctx: ToolCtx, random: RandomSource): { agent: string; text: string } | undefined {
	if (random.next() >= RATE) return undefined;
	const readers = ctx.residents.ids.filter((id) => ctx.residents.mayAct(id) && open(ctx, id));
	return readers.length === 0 ? undefined : { agent: random.pick(readers), text: lineOf(ctx) };
}

/**
 * A post on the board while the budget holds, for the fake driver.
 *
 * @param ctx - The context of the tool call.
 * @param random - The fake driver's random stream.
 * @returns The params, or undefined now and then and while the budget is spent.
 */
export function sampleBoardNote(ctx: ToolCtx, random: RandomSource): { text: string } | undefined {
	return random.next() >= RATE || !open(ctx, "board") ? undefined : { text: lineOf(ctx) };
}
