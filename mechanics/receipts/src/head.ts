/**
 * The head of the `receipts` mechanic: options, state, events, prompts and the types its helpers
 * share. The slice, its legacy shape and the migration live here too.
 */
import { Type } from "typebox";
import type { ContextOf, ToolContextOf } from "@swarmtales/contracts";
import { defineHead } from "@swarmtales/kernel";
import { ChannelsApi, ExileApi, LedgerApi, MarksApi, ProgressionApi, PuzzlesApi, ReceiptBody, ReceiptsApi } from "@swarmtales/mechanic-shared";
import type { Receipt } from "./book.ts";

const Stored = Type.Intersect([ReceiptBody, Type.Object({ id: Type.String(), minute: Type.Integer(), parties: Type.Array(Type.String()) })]);
const Pair = Type.Object({ dm: Type.Integer(), claim: Type.Integer() });

/** The slice (version 1): the receipts, the settled blame pairs and which receipt each transfer got. */
export const Slice = Type.Object({ receipts: Type.Array(Stored), pairs: Type.Array(Pair), transfers: Type.Array(Type.Object({ txId: Type.String(), receipt: Type.String() })) });

/** The version-0 slice the legacy converter cuts out of the old world: `{ receipts, blames }`. */
export const LegacySlice = Type.Object({ receipts: Type.Array(Stored), blames: Type.Optional(Type.Object({ pairs: Type.Array(Pair) })) });

export interface ReceiptsState {
	receipts: Receipt[];
	/** Settled (DM, claim) pairs: one blame each. */
	pairs: { dm: number; claim: number }[];
	/** The receipt issued for each transfer, by the ledger's transaction id (`ReceiptsApi.ofTransfer`). */
	transfers: Map<string, string>;
}

export const receiptsHead = defineHead({
	id: "receipts",
	summary: "City-verified receipts and blame.",
	options: Type.Object({
		quoteDms: Type.Boolean({ default: false, description: "A DM receipt quotes the DM's text, so showing it proves what was written (Whispers); otherwise it never carries the text." }),
		minRun: Type.Optional(Type.Integer({ minimum: 1, description: "A board show is refused when the receipt quotes this many characters in a row of a fragment the resident holds." })),
	}),
	state: (): ReceiptsState => ({ receipts: [], pairs: [], transfers: new Map<string, string>() }),
	events: {
		receipt_issued: Type.Object({ receipt: Type.String(), kind: Type.String(), parties: Type.Array(Type.String()), text: Type.String() }),
		receipt_shown: Type.Object({ receipt: Type.String(), by: Type.String(), postSeq: Type.Optional(Type.Integer()), to: Type.Optional(Type.String()) }),
		blame: Type.Object({
			caller: Type.String(),
			accused: Type.String(),
			dm: Type.Integer(),
			claim: Type.Integer(),
			outcome: Type.Union([Type.Literal("upheld"), Type.Literal("rejected")]),
			payer: Type.String(),
			penalty: Type.Number(),
			reason: Type.Optional(Type.String()),
			post: Type.Integer(),
			judge: Type.Optional(Type.String()),
			whisper: Type.Optional(Type.String()),
		}),
	},
	prompts: {
		"tools/showReceipt": ["dmReceipt"],
		"tools/showReceipt-receipt-plain": [],
		"tools/showReceipt-receipt-quoted": [],
		"tools/blame": [],
		"replies/receipt-shown-board": ["seq", "text"],
		"replies/receipt-shown-private": ["to", "receipt"],
		"replies/receipt-fragment": [],
		"replies/marks-left": ["remaining", "budget"],
		"replies/blame-upheld": ["accused", "penalty", "post"],
		"replies/blame-rejected": ["reason", "penalty", "next", "post"],
		"replies/judge-absent": [],
		"replies/judge-failed": [],
		"competitor/status/receipt-one": [],
		"competitor/status/receipts-many": ["count"],
		"notices/blame-upheld": ["caller", "dm", "penalty", "tail", "post"],
		"notices/blame-wrong": ["accused", "reason", "penalty", "tail", "post"],
		"notices/blame-next": ["next"],
		"notices/receipt-shown": ["by", "line"],
		"records/blame-liar": ["accused", "caller", "place", "dm", "minute", "dmQuote", "claimQuote", "penalty", "judge"],
		"records/blame-false": ["caller", "accused", "dm", "claim", "reason", "penalty", "judge"],
		"records/blame-judge": ["words"],
		"records/receipt-verified": ["city", "line", "by"],
	},
	provides: [ReceiptsApi],
	requires: [ChannelsApi, LedgerApi],
	uses: [MarksApi, ExileApi, PuzzlesApi, ProgressionApi],
});

export type Ctx = ContextOf<typeof receiptsHead>;
export type ToolCtx = ToolContextOf<typeof receiptsHead>;
