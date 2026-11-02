/**
 * Issuing a receipt and the shows of one: the parts of the mechanic that write `receipt_issued`
 * and `receipt_shown`, shared by the services, the transfer listener and the tool `showReceipt`.
 */
import { Type } from "typebox";
import type { MechanicKit, ShapeOf } from "@swarmtales/contracts";
import { refuse, reply } from "@swarmtales/kernel";
import { ChannelsApi, ExileApi, MarksApi, PuzzlesApi, type ReceiptBody } from "@swarmtales/mechanic-shared";
import { describeReceipt, nextId, partiesOf, showable, type Receipt } from "./book.ts";
import type { Ctx, ToolCtx, receiptsHead } from "./head.ts";

export const CITY = "CITY";

type Kit = MechanicKit<ShapeOf<typeof receiptsHead>>;

/** A receipt of `body` now: stored, announced by `receipt_issued`; a DM receipt quotes the text only where `quoteDms` says so. */
export function issue(ctx: Ctx, body: ReceiptBody): { readonly receipt: Receipt; readonly text: string } {
	const kept: ReceiptBody = ctx.options.quoteDms || body.kind !== "dm" ? body : { kind: "dm", from: body.from, to: body.to, number: body.number };
	const receipt: Receipt = { ...kept, id: nextId(ctx.state.receipts), minute: ctx.minute, parties: partiesOf(kept) };
	ctx.state.receipts.push(receipt);
	const text = describeReceipt(receipt);
	ctx.emit("receipt_issued", { receipt: receipt.id, kind: receipt.kind, parties: [...receipt.parties], text });
	return { receipt, text };
}

/** ` · marks 7/8 left`, or nothing where marks do not apply. */
export function marksSuffix(ctx: Ctx, resident: string): string {
	const left = ctx.tryCall(MarksApi, "left", { resident });
	return left === undefined || left === null ? "" : ` · ${ctx.prompt("replies/marks-left", { remaining: left.remaining, budget: left.budget })}`;
}

/** The refusals of a show in the old order (World#showReceipt, after the guard's fragment check). */
function checkShow(ctx: ToolCtx, self: string, receiptId: string, to: string | undefined) {
	const minRun = to === undefined ? ctx.options.minRun : undefined;
	const found = showable(ctx.state.receipts, receiptId, self);
	if (minRun !== undefined && found.ok && ctx.tryCall(PuzzlesApi, "carriesSecret", { resident: self, text: describeReceipt(found.receipt), minRun }) === true) {
		return refuse("RECEIPT_CARRIES_FRAGMENT", ctx.prompt("replies/receipt-fragment", {}));
	}
	if (!found.ok) return refuse(found.error, receiptId);
	if (to !== undefined) {
		if (!ctx.residents.has(to)) return refuse("UNKNOWN_AGENT", to);
		if (to === self) return refuse("SELF_TARGET", "show it to another resident, or on the board");
		if (ctx.tryCall(ExileApi, "isExiled", { resident: to }) === true) return refuse("EXILED", `${to} was exiled`);
	}
	if (ctx.tryCall(MarksApi, "canAfford", { resident: self, channel: "receipt" }) === false) return refuse("NO_MARKS");
	return found.receipt;
}

export function showTool(kit: Kit) {
	return kit.tool({
		name: "showReceipt",
		description: {
			prompt: "tools/showReceipt",
			variables: (options) => ({ dmReceipt: { prompt: options.quoteDms ? "tools/showReceipt-receipt-quoted" : "tools/showReceipt-receipt-plain" } }),
		},
		parameters: Type.Object({
			receiptId: Type.String({ description: "Receipt ID, e.g. R-0042", minLength: 1, maxLength: 16 }),
			to: Type.Optional(Type.String({ description: "Show it privately to this resident only (name or ID), e.g. A03; leave out for the board", minLength: 1, maxLength: 16 })),
		}),
		suggest: ["resident"],
		rule: ({ receiptId, to }, ctx) => {
			const self = ctx.resident;
			if (self === undefined) return refuse("UNKNOWN_AGENT");
			const checked = checkShow(ctx, self, receiptId, to);
			return "ok" in checked ? checked : undefined;
		},
		execute: ({ receiptId, to }, ctx) => {
			const self = ctx.resident;
			if (self === undefined) return refuse("UNKNOWN_AGENT");
			const checked = checkShow(ctx, self, receiptId, to);
			if ("ok" in checked) return checked;
			const line = describeReceipt(checked);
			if (to === undefined) {
				const text = ctx.prompt("records/receipt-verified", { city: CITY, line, by: self });
				const { postSeq } = ctx.call(ChannelsApi, "post", { author: CITY, text });
				ctx.emit("receipt_shown", { receipt: checked.id, by: self, postSeq });
				ctx.tryCall(MarksApi, "spend", { resident: self, channel: "receipt" });
				return reply(`${ctx.prompt("replies/receipt-shown-board", { seq: postSeq, text })}${marksSuffix(ctx, self)}`);
			}
			ctx.call(ChannelsApi, "notify", { to, author: CITY, text: ctx.prompt("notices/receipt-shown", { by: self, line }) });
			ctx.emit("receipt_shown", { receipt: checked.id, by: self, to });
			ctx.tryCall(MarksApi, "spend", { resident: self, channel: "receipt" });
			return reply(`${ctx.prompt("replies/receipt-shown-private", { to, receipt: checked.id })}${marksSuffix(ctx, self)}`);
		},
	});
}

