// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The tool `showReceipt`, carried from the old `mechanics/receipts/src/issue.ts`: a party shows a receipt as a line
 * the city verifies, on the board or privately to one resident. The refusals come in the old order. The price of a
 * show is the business of `marks`, in its own stage handlers by the bare tool name; the reply names the marks left
 * once it is paid. With a provider of `identity` the resident may name `to` by a name and reads names in place of ids.
 * With `minRun` a board show of a receipt that quotes part of a fragment the resident holds is refused first (old
 * `checkShow`); a private show is not.
 */
import type { RandomSource, Refusal, ToolOutcome } from "@swarmtales/contracts";
import { AllowanceService, IdentityService } from "@swarmtales/mechanic-contracts";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { PuzzlesService } from "@swarmtales/mechanic-puzzles/contract";
import { refuse, reply } from "@swarmtales/sdk";
import { describeReceipt, receiptsOf, showable, type Receipt } from "./book.ts";
import type { ReceiptsToolCtx } from "./head.ts";
import { CITY } from "./issue.ts";

const SAMPLE_RATE = 0.125;

function shown(ctx: ReceiptsToolCtx, text: string): string {
	return ctx.tryCall(IdentityService, "display", { text }) ?? text;
}

function shownRefusal(ctx: ReceiptsToolCtx, refusal: Refusal): Refusal {
	return refusal.detail === undefined ? refusal : { ...refusal, detail: shown(ctx, refusal.detail) };
}

/**
 * A tool's outcome as the caller reads it: names in place of ids in the reply or the refusal's detail, with a
 * provider of `identity` (old `names`, which displayed every reply).
 *
 * @param ctx - The context of the tool call.
 * @param outcome - The outcome in ids.
 * @returns The outcome as shown.
 */
export function shownOutcome(ctx: ReceiptsToolCtx, outcome: ToolOutcome): ToolOutcome {
	return outcome.ok ? { ...outcome, reply: shown(ctx, outcome.reply) } : shownRefusal(ctx, outcome);
}

/**
 * The resident id a name or an id stands for (old `RESIDENT_PARAMS` of `names`: `to`, `accused`).
 *
 * @param ctx - The context of the tool call.
 * @param to - The name or id as written; undefined when left out.
 * @returns The id, or the text as written when no provider of `identity` knows it.
 */
export function resolved(ctx: ReceiptsToolCtx, to: string | undefined): string | undefined {
	return to === undefined ? undefined : (ctx.tryCall(IdentityService, "resolve", { text: to }) ?? to);
}

// A board show of a receipt that quotes part of a fragment the resident holds, where `minRun` guards the board.
function carriesFragment(ctx: ReceiptsToolCtx, self: string, receipt: Receipt, to: string | undefined): boolean {
	const minRun = to === undefined ? ctx.options.minRun : undefined;
	return minRun !== undefined && ctx.tryCall(PuzzlesService, "carriesSecret", { resident: self, text: describeReceipt(receipt), minRun }) === true;
}

// The refusals of a show in the old order (the guard's fragment check first), or the receipt; `to` is resolved.
function checkShow(ctx: ReceiptsToolCtx, receiptId: string, to: string | undefined): Receipt | Refusal {
	const self = ctx.resident;
	if (self === undefined) return refuse("UNKNOWN_AGENT");
	const found = showable(ctx.state.receipts, receiptId, self);
	if (found.ok && carriesFragment(ctx, self, found.receipt, to)) return refuse("RECEIPT_CARRIES_FRAGMENT", ctx.prompt("receipts/replies/receipt-fragment", {}));
	if (!found.ok) return refuse(found.error, receiptId);
	if (to !== undefined) {
		if (!ctx.residents.has(to)) return refuse("UNKNOWN_AGENT", to);
		if (to === self) return refuse("SELF_TARGET", "show it to another resident, or on the board");
		if (ctx.tryCall(ExileService, "isExiled", { resident: to }) === true) return refuse("EXILED", `${to} was exiled`);
	}
	return found.receipt;
}

// ` · marks 7/8 left` once the show is paid, or nothing where marks do not apply.
function marksPart(ctx: ReceiptsToolCtx, resident: string): string {
	const left = ctx.tryCall(AllowanceService, "left", { resident });
	if (left === undefined || left === null) return "";
	const price = ctx.tryCall(AllowanceService, "priceOf", { resident, channel: "receipt" }) ?? 0;
	return ` · ${ctx.prompt("receipts/replies/marks-left", { remaining: left.remaining - price, budget: left.budget })}`;
}

/**
 * The check of `showReceipt`: the refusal of the old order, or nothing.
 *
 * @param params - The parameters.
 * @param params.receiptId - The receipt, as the resident wrote its id.
 * @param params.to - The resident to show it to; the board when left out.
 * @param ctx - The context of the tool call.
 * @returns The refusal, or undefined.
 */
export function checkShowReceipt(params: { readonly receiptId: string; readonly to?: string }, ctx: ReceiptsToolCtx): Refusal | undefined {
	const checked = checkShow(ctx, params.receiptId, resolved(ctx, params.to));
	return "ok" in checked ? shownRefusal(ctx, checked) : undefined;
}

/**
 * Runs `showReceipt`: the city posts the verified line on the board, or tells the one resident.
 *
 * @param params - The parameters.
 * @param params.receiptId - The receipt, as the resident wrote its id.
 * @param params.to - The resident to show it to; the board when left out.
 * @param ctx - The context of the tool call.
 * @returns The reply, or the refusal.
 */
export function showReceipt(params: { readonly receiptId: string; readonly to?: string }, ctx: ReceiptsToolCtx): ToolOutcome {
	const to = resolved(ctx, params.to);
	const checked = checkShow(ctx, params.receiptId, to);
	const self = ctx.resident;
	if ("ok" in checked || self === undefined) return "ok" in checked ? shownRefusal(ctx, checked) : refuse("UNKNOWN_AGENT");
	const line = describeReceipt(checked);
	if (to === undefined) {
		const text = ctx.prompt("receipts/records/receipt-verified", { city: CITY, line, by: self });
		const { postSeq } = ctx.call(ChannelsService, "post", { author: CITY, text });
		ctx.emit("receipt_shown", { receipt: checked.id, by: self, postSeq });
		return reply(shown(ctx, `${ctx.prompt("receipts/replies/shown-board", { seq: postSeq, text })}${marksPart(ctx, self)}`));
	}
	ctx.call(ChannelsService, "notify", { to, author: CITY, text: ctx.prompt("receipts/notices/receipt-shown", { by: self, line }) });
	ctx.emit("receipt_shown", { receipt: checked.id, by: self, to });
	return reply(shown(ctx, `${ctx.prompt("receipts/replies/shown-private", { to, receipt: checked.id })}${marksPart(ctx, self)}`));
}

/**
 * A show the fake driver may make, about one activation in eight: one of the caller's receipts, on the board or to
 * another resident that may act.
 *
 * @param ctx - The context of the tool call.
 * @param random - The fake driver's random stream.
 * @returns The params, or undefined most of the time and for a resident without receipts.
 */
export function sampleShow(ctx: ReceiptsToolCtx, random: RandomSource): { receiptId: string; to?: string } | undefined {
	const self = ctx.resident;
	if (self === undefined || random.next() >= SAMPLE_RATE) return undefined;
	const own = receiptsOf(ctx.state.receipts, self);
	if (own.length === 0) return undefined;
	const receiptId = random.pick(own).id;
	const others = ctx.residents.ids.filter((id) => id !== self && ctx.residents.mayAct(id));
	return others.length === 0 || random.next() < 0.5 ? { receiptId } : { receiptId, to: random.pick(others) };
}
