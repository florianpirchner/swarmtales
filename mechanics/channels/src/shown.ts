// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * What a resident reads of `channels` with the providers of two contracts: names in place of ids (`identity`) and
 * the marks it has left (`allowance`). Without a provider the ids stay and a reply carries no marks part.
 */
import type { InputLine, Refusal, ToolOutcome } from "@swarmtales/contracts";
import { AllowanceService, IdentityService } from "@swarmtales/mechanic-contracts";
import type { Ctx, ToolCtx } from "./head.ts";

/**
 * Shows a text as the residents read it: every id replaced by its resident's name (old `display` of `names`).
 *
 * @param ctx - The context.
 * @param text - The text.
 * @returns The text with names, or unchanged without a provider of `identity`.
 */
export function shown(ctx: Ctx, text: string): string {
	return ctx.tryCall(IdentityService, "display", { text }) ?? text;
}

/**
 * Shows an outcome as its caller reads it: every reply, and the detail of a refusal to a resident (the old platform
 * showed a Director its refusals with ids).
 *
 * @param ctx - The context of the tool call.
 * @param outcome - The outcome as `channels` wrote it.
 * @returns The outcome as the caller reads it.
 */
export function shownOutcome(ctx: ToolCtx, outcome: ToolOutcome): ToolOutcome {
	return outcome.ok ? { ...outcome, reply: shown(ctx, outcome.reply) } : (shownRefusal(ctx, outcome) ?? outcome);
}

/**
 * Shows the detail of a refusal to a resident with names, as {@link shownOutcome}.
 *
 * @param ctx - The context of the tool call.
 * @param refusal - The refusal, or none.
 * @returns The refusal as the caller reads it, or undefined.
 */
export function shownRefusal(ctx: ToolCtx, refusal: Refusal | undefined): Refusal | undefined {
	return refusal?.detail === undefined || ctx.resident === undefined ? refusal : { ...refusal, detail: shown(ctx, refusal.detail) };
}

/**
 * Shows input lines as the resident reads them.
 *
 * @param ctx - The context.
 * @param lines - The lines.
 * @returns The lines with names.
 */
export function shownLines(ctx: Ctx, lines: readonly InputLine[]): readonly InputLine[] {
	return lines.map((line) => (typeof line === "string" ? shown(ctx, line) : { ...line, text: shown(ctx, line.text) }));
}

/**
 * The resident id a name or an id stands for: a resident may write a name where an id goes (old `resolve` of `names`).
 *
 * @param ctx - The context.
 * @param value - What the resident wrote.
 * @returns The id, or the value unchanged.
 */
export function resolved(ctx: Ctx, value: string): string {
	return ctx.tryCall(IdentityService, "resolve", { text: value }) ?? value;
}

/**
 * The marks part of a reply (` · marks 7/8 left`): what the resident has left once the message is paid. `marks`
 * charges the price in its own `after` handler, so the price is taken off here; a post in a group of the city is free.
 *
 * @param ctx - The context of the tool call.
 * @param channel - What the message is sent on.
 * @param free - Whether the message costs nothing.
 * @returns The part with its separator, or nothing while marks do not apply.
 */
export function marksPart(ctx: ToolCtx, channel: "board" | "group" | "dm", free = false): string {
	const resident = ctx.resident;
	if (resident === undefined) return "";
	const left = ctx.tryCall(AllowanceService, "left", { resident });
	if (left === undefined || left === null) return "";
	const price = free ? 0 : (ctx.tryCall(AllowanceService, "priceOf", { resident, channel }) ?? 0);
	return ` · ${ctx.prompt("channels/replies/marks-left", { remaining: left.remaining - price, budget: left.budget })}`;
}
