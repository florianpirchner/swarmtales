// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The head of the `receipts` mechanic: its options, its state, its events, services, prompts and tool. */
import { Type } from "typebox";
import { AllowanceService, IdentityService, ReceiptSourceService } from "@swarmtales/mechanic-contracts";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { defineHead, type CtxOf, type ToolCtxOf } from "@swarmtales/sdk";
import { ReceiptSchema } from "./book.ts";
import { ReceiptsEvents } from "./contract.ts";

/**
 * The head of the receipts: everything that can be read without running a handler.
 *
 * @public
 */
export const receiptsHead = defineHead({
	id: "receipts",
	package: "@swarmtales/mechanic-receipts",
	summary: "Receipts the city verifies, for transfers, treasuries, solved levels and delivered direct messages, and showReceipt.",
	options: Type.Object({
		quoteDms: Type.Boolean({ default: false, description: "A DM receipt quotes the DM's text, so showing it proves what was written (Whispers); otherwise it never carries the text." }),
	}),
	state: Type.Object(
		{
			receipts: Type.Array(ReceiptSchema, { description: "Every receipt issued, in the order of the ids" }),
			coming: Type.Array(
				Type.Object({ key: Type.String({ description: "What it will be the receipt of" }), id: Type.String({ description: "The id it gets" }) }, { description: "An id named before its receipt was issued" }),
				{ description: "The ids `receipt-source` named for receipts its listeners have not issued yet (decision A64)" },
			),
		},
		{ description: "The receipt book" },
	),
	start: () => ({ receipts: [], coming: [] }),
	events: ReceiptsEvents.events,
	prompts: {
		"receipts/tools/showReceipt": [],
		"receipts/replies/shown-board": ["seq", "text"],
		"receipts/replies/shown-private": ["to", "receipt"],
		"receipts/replies/marks-left": ["remaining", "budget"],
		"receipts/status/receipt-one": [],
		"receipts/status/receipts-many": ["count"],
		"receipts/notices/receipt-shown": ["by", "line"],
		"receipts/records/receipt-verified": ["city", "line", "by"],
	},
	// The board post and the notices of the city, and the text of a delivered message.
	requires: [ChannelsService],
	// Names in the texts, the marks left after a show, and who is banished: each when a provider is loaded.
	uses: [IdentityService, AllowanceService, ExileService],
	provides: [ReceiptSourceService],
	tools: {
		showReceipt: {
			description: "receipts/tools/showReceipt",
			params: Type.Object({
				receiptId: Type.String({ description: "Receipt ID, e.g. R-0042", minLength: 1, maxLength: 16 }),
				to: Type.Optional(Type.String({ description: "Show it privately to this resident only (name or ID), e.g. A03; leave out for the board", minLength: 1, maxLength: 16 })),
			}),
			for: ["resident"],
		},
	},
});

/**
 * The context of the receipts' hooks, listeners and services.
 *
 * @public
 */
export type ReceiptsCtx = CtxOf<typeof receiptsHead>;

/**
 * The context of the receipts' tool.
 *
 * @public
 */
export type ReceiptsToolCtx = ToolCtxOf<typeof receiptsHead>;
