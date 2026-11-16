// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The head of the `receipts` mechanic: its options, its state, its events, services, prompts and tools. */
import { Type } from "typebox";
import { AllowanceService, IdentityService, ReceiptSourceService } from "@swarmtales/mechanic-contracts";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { LedgerService } from "@swarmtales/mechanic-ledger/contract";
import { ProgressionService } from "@swarmtales/mechanic-progression/contract";
import { PuzzlesService } from "@swarmtales/mechanic-puzzles/contract";
import { defineHead, type CtxOf, type ToolCtxOf } from "@swarmtales/sdk";
import { ReceiptSchema } from "./book.ts";
import { ReceiptsEvents } from "./contract.ts";
import { receiptsMetrics } from "./metrics.ts";

/**
 * The head of the receipts: everything that can be read without running a handler.
 *
 * @public
 */
export const receiptsHead = defineHead({
	id: "receipts",
	package: "@swarmtales/mechanic-receipts",
	summary: "Receipts the city verifies, for transfers, treasuries, solved levels and delivered direct messages, showReceipt, and blame with a judge.",
	options: Type.Object({
		quoteDms: Type.Boolean({ default: false, description: "A DM receipt quotes the DM's text, so showing it proves what was written (Whispers); otherwise it never carries the text." }),
		minRun: Type.Optional(Type.Integer({ minimum: 1, description: "A board show is refused when the receipt quotes this many characters in a row of a fragment the resident holds." })),
	}),
	state: Type.Object(
		{
			receipts: Type.Array(ReceiptSchema, { description: "Every receipt issued, in the order of the ids" }),
			coming: Type.Array(
				Type.Object({ key: Type.String({ description: "What it will be the receipt of" }), id: Type.String({ description: "The id it gets" }) }, { description: "An id named before its receipt was issued" }),
				{ description: "The ids `receipt-source` named for receipts its listeners have not issued yet (decision A64)" },
			),
			pairs: Type.Array(
				Type.Object({ dm: Type.Integer({ description: "The blamed DM" }), claim: Type.Integer({ description: "The accused's message" }) }, { description: "One settled blame" }),
				{ description: "The (DM, claim) pairs blamed already: one blame each" },
			),
		},
		{ description: "The receipt book" },
	),
	start: () => ({ receipts: [], coming: [], pairs: [] }),
	events: ReceiptsEvents.events,
	metrics: receiptsMetrics(),
	prompts: {
		"receipts/tools/showReceipt": [],
		"receipts/replies/shown-board": ["seq", "text"],
		"receipts/replies/shown-private": ["to", "receipt"],
		"receipts/replies/marks-left": ["remaining", "budget"],
		"receipts/status/receipt-one": [],
		"receipts/status/receipts-many": ["count"],
		"receipts/notices/receipt-shown": ["by", "line"],
		"receipts/records/receipt-verified": ["city", "line", "by"],
		"receipts/tools/blame": [],
		"receipts/replies/blame-upheld": ["accused", "penalty", "post"],
		"receipts/replies/blame-rejected": ["reason", "penalty", "next", "post"],
		"receipts/replies/judge-absent": [],
		"receipts/replies/judge-failed": [],
		"receipts/replies/receipt-fragment": [],
		"receipts/notices/blame-upheld": ["caller", "dm", "penalty", "tail", "post"],
		"receipts/notices/blame-wrong": ["accused", "reason", "penalty", "tail", "post"],
		"receipts/notices/blame-next": ["next"],
		"receipts/records/blame-liar": ["accused", "caller", "place", "dm", "minute", "dmQuote", "claimQuote", "penalty", "judge"],
		"receipts/records/blame-false": ["caller", "accused", "dm", "claim", "reason", "penalty", "judge"],
		"receipts/records/blame-judge": ["words"],
	},
	// The board post and the notices of the city, the records a blame checks; the burn of a lost blame.
	requires: [ChannelsService, LedgerService],
	// Names in the texts, the marks left after a show, who is banished, the price and the ranking of a blame, and the fragments a board show must not quote: each when a provider is loaded.
	uses: [IdentityService, AllowanceService, ExileService, ProgressionService, PuzzlesService],
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
		blame: {
			description: "receipts/tools/blame",
			params: Type.Object({
				dm: Type.Integer({ description: "Number of your DM, e.g. 41 for DM #41", minimum: 1 }),
				accused: Type.String({ description: "Name or ID of the receiver, e.g. A02" }),
				claim: Type.Integer({ description: "Number of their message that denies receiving it, e.g. 57", minimum: 1 }),
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
