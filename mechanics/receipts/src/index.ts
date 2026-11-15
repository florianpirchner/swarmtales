// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The `receipts` mechanic: receipts the city verifies. It listens to the transfers of `ledger`, the treasury
 * movements and delivered direct messages of `channels` and the correct submissions of `progression`, and issues a
 * numbered receipt for each (`receipt_issued`); the receiver of a transfer or a withdrawal is told its line. It
 * provides `receipt-source`, through which those mechanics name the receipt in their replies, and the tool
 * `showReceipt`. The tool `blame` and its judge come with the second half of the port (M5-22).
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { ChannelsEvents } from "@swarmtales/mechanic-channels/contract";
import { LedgerEvents } from "@swarmtales/mechanic-ledger/contract";
import { ProgressionEvents } from "@swarmtales/mechanic-progression/contract";
import { defineMechanic } from "@swarmtales/sdk";
import { describeReceipt, receiptsOf } from "./book.ts";
import { receiptsHead } from "./head.ts";
import { idFor, issue, issueDm, tell } from "./issue.ts";
import { checkShowReceipt, sampleShow, showReceipt } from "./show.ts";

export { describeReceipt, partiesOf, receiptId, ReceiptSchema, type BodyOf, type Receipt, type ReceiptBody } from "./book.ts";
export { ReceiptsEvents } from "./contract.ts";
export { receiptsHead, type ReceiptsCtx, type ReceiptsToolCtx } from "./head.ts";

/** The order of the receipts' part of the status line (old `STATUS_ORDER.receipts`). */
const STATUS_ORDER = 600;

/**
 * The receipts: issued in the listeners, named through `receipt-source`, shown with `showReceipt`.
 *
 * @example
 * ```ts
 * const game = defineGame({ id: "city", residents: 6, mechanics: [ledger(), channels(), receipts({ quoteDms: true })], end: { ticks: 12 } });
 * ```
 *
 * @public
 */
export const receipts = defineMechanic(receiptsHead, {
	tools: {
		showReceipt: { check: checkShowReceipt, run: showReceipt, sample: sampleShow },
	},
	services: {
		"receipt-source": {
			ofTransfer: ({ txId }, ctx) => idFor(ctx.state, `tx:${txId}`),
			ofMessage: ({ number }, ctx) => idFor(ctx.state, `dm:${String(number)}`),
			ofLevel: ({ resident, level }, ctx) => idFor(ctx.state, `level:${resident}:${String(level)}`),
			textsOf: ({ resident }, ctx) => receiptsOf(ctx.state.receipts, resident).map(describeReceipt),
		},
	},
	listeners: (kit) => [
		kit.listen(LedgerEvents, "transfer", ({ from, to, amount, memo, txId }, ctx) => {
			tell(ctx, to, issue(ctx, { key: `tx:${txId}` }, { kind: "transfer", from, to, amount, memo }));
		}),
		kit.listen(ChannelsEvents, "treasury_deposit", ({ group, agent, amount, receipt }, ctx) => {
			issue(ctx, { id: receipt }, { kind: "deposit", from: agent, group, amount });
		}),
		kit.listen(ChannelsEvents, "treasury_withdrawal", ({ group, treasurer, to, amount, receipt }, ctx) => {
			const text = issue(ctx, { id: receipt }, { kind: "withdrawal", group, treasurer, to, amount });
			if (to !== treasurer) tell(ctx, to, text);
		}),
		kit.listen(ChannelsEvents, "dm_delivered", (delivered, ctx) => {
			issueDm(ctx, delivered);
		}),
		kit.listen(ProgressionEvents, "submission", ({ agent, level, outcome, deltaPoints }, ctx) => {
			if (outcome === "correct") issue(ctx, { key: `level:${agent}:${String(level)}` }, { kind: "levelUp", agent, level, reward: deltaPoints });
		}),
	],
	hooks: {
		turnInputs: (resident, ctx) => {
			const count = receiptsOf(ctx.state.receipts, resident).length;
			if (count === 0) return [];
			const text = count === 1 ? ctx.prompt("receipts/status/receipt-one", {}) : ctx.prompt("receipts/status/receipts-many", { count });
			return [{ kind: "status", order: STATUS_ORDER, text }];
		},
	},
	facts: {
		issued: { output: Type.Integer({ description: "The receipts issued" }), compute: (view) => view.state.receipts.length },
	},
});
