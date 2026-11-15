// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Issuing receipts. The old mechanics called `ReceiptsApi.issue` inside the call; here `receipts` issues every
 * receipt in its own listener of the event it is the receipt of, and the kernel runs a listener after the step that
 * wrote the event. A caller that names the receipt in its reply asks `receipt-source` before the listener ran; the
 * book then names the id the receipt will get and keeps it as `coming`, so a second coming receipt of the same step
 * gets the next one (decision A64). Numbers follow the log order of the events the callers asked about.
 */
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { describeReceipt, partiesOf, receiptId, type Receipt, type ReceiptBody } from "./book.ts";
import type { ReceiptsCtx } from "./head.ts";

/** The author of the city's notices. */
export const CITY = "CITY";

/** What a receipt is claimed by when it is issued: the key of its event, or the id a caller was named for it. */
export type Claim = { readonly key: string } | { readonly id: string };

type Book = ReceiptsCtx["state"];

// The number of ids handed out: issued, or named and coming.
const handedOut = (book: Book): number => book.receipts.length + book.coming.length;

/**
 * The id of the receipt of `key`: the issued one, the coming one, or the next id, which the book then keeps for it.
 *
 * @param book - The state of the receipts.
 * @param key - What it is the receipt of, for example `tx:TX5`.
 * @returns The id.
 */
export function idFor(book: Book, key: string): string {
	const known = book.receipts.find((receipt) => receipt.key === key) ?? book.coming.find((entry) => entry.key === key);
	if (known !== undefined) return known.id;
	const id = receiptId(handedOut(book) + 1);
	book.coming.push({ key, id });
	return id;
}

// Takes the coming entry of the claim off the list, or hands out the next id.
function settle(book: Book, claim: Claim): { readonly key: string; readonly id: string } {
	const at = book.coming.findIndex((entry) => ("key" in claim ? entry.key === claim.key : entry.id === claim.id));
	const entry = book.coming[at];
	if (entry !== undefined) {
		book.coming.splice(at, 1);
		return entry;
	}
	const id = receiptId(handedOut(book) + 1);
	return { key: "key" in claim ? claim.key : `receipt:${id}`, id };
}

/**
 * Issues a receipt now: it is kept in the order of the ids and announced by `receipt_issued`.
 *
 * @param ctx - The context of the listener.
 * @param claim - The event's key, or the id the caller was named.
 * @param body - What the receipt says.
 * @returns Its line.
 */
export function issue(ctx: ReceiptsCtx, claim: Claim, body: ReceiptBody): string {
	const { key, id } = settle(ctx.state, claim);
	const receipt: Receipt = { ...body, id, minute: ctx.tick, parties: [...partiesOf(body)], key };
	const after = ctx.state.receipts.findIndex((other) => other.id > id);
	ctx.state.receipts.splice(after < 0 ? ctx.state.receipts.length : after, 0, receipt);
	const text = describeReceipt(receipt);
	ctx.emit("receipt_issued", { receipt: id, kind: receipt.kind, parties: [...receipt.parties], text });
	return text;
}

/**
 * Issues the receipt of a delivered direct message; it quotes the text only where `quoteDms` says so.
 *
 * @param ctx - The context of the listener.
 * @param delivered - The payload of `dm_delivered`.
 * @param delivered.number - The message's number.
 * @param delivered.from - Its sender.
 * @param delivered.to - Its receiver.
 */
export function issueDm(ctx: ReceiptsCtx, delivered: { readonly number: number; readonly from: string; readonly to: string }): void {
	const { number, from, to } = delivered;
	const text = ctx.options.quoteDms ? ctx.call(ChannelsService, "dmRecords", {}).find((record) => record.number === number)?.text : undefined;
	issue(ctx, { key: `dm:${String(number)}` }, text === undefined ? { kind: "dm", from, to, number } : { kind: "dm", from, to, number, text });
}

/**
 * Tells a resident the line of its receipt, as the city did for the receiver of a transfer or a withdrawal.
 *
 * @param ctx - The context of the listener.
 * @param to - The resident.
 * @param text - The line.
 */
export function tell(ctx: ReceiptsCtx, to: string, text: string): void {
	ctx.call(ChannelsService, "notify", { to, author: CITY, text });
}
