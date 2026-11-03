/**
 * The `receipts` mechanic (carve step 5, team T1, docs/design/carve-team-T1.md): city-verified
 * receipts (`ReceiptsApi`, copied from packages/engine/src/receipts.ts and the receipt code of
 * world.ts), the tool `showReceipt`, the blame desk with the tool `blame` (the judge answers through
 * the consult stage), and the "receipts" status part. It listens to `transfer` and issues the
 * receipt at once; other receipts (level-ups, delivered DMs, escrow, treasuries) are issued by their
 * mechanics through `ReceiptsApi.issue`. Lost blames are charged by the progression mechanic.
 */
import { Parse } from "typebox/value";
import { Type } from "typebox";
import { defineMechanic } from "@swarmtales/kernel";
import { ChannelsApi, HOOK_ORDER, INPUT_KINDS, LedgerEvents, ReceiptsApi, STATUS_ORDER } from "@swarmtales/mechanic-shared";
import { blameTool } from "./blame-tool.ts";
import { describeReceipt, nextId, partiesOf, receiptById, receiptsOf, toShared, type Receipt } from "./book.ts";
import { LegacySlice, Slice, receiptsHead } from "./head.ts";
import { CITY, issue, showTool } from "./issue.ts";

export { receiptsHead };
/** The receipt book's rules as functions over a list of receipts, for tests of the rules alone. */
export { describeReceipt, nextId, normalizeReceiptId, partiesOf, receiptsOf, showable, type Receipt } from "./book.ts";
export { check as checkBlame, recordQuote, type Facts as BlameFacts } from "./blame.ts";

/** The snapshot's receipts must run R-0001, R-0002, ... as issued (old `restore`). */
function inOrder(receipts: readonly Receipt[]): Receipt[] {
	receipts.forEach((receipt, index) => {
		const expected = `R-${String(index + 1).padStart(4, "0")}`;
		if (receipt.id !== expected) throw new Error(`Receipt snapshot: receipt ${String(index + 1)} has id ${receipt.id}, expected ${expected}`);
	});
	return receipts.map((receipt) => ({ ...receipt }));
}

export const receipts = defineMechanic(receiptsHead, (kit) => ({
	services: [
		kit.provide(ReceiptsApi, {
			issue: (input, ctx) => {
				const { receipt, text } = issue(ctx, input.body);
				return { id: receipt.id, text };
			},
			count: (input, ctx) => receiptsOf(ctx.state.receipts, input.resident).length,
			memoTransfers: (input, ctx) => ctx.state.receipts.filter((receipt) => receipt.kind === "transfer" && receipt.from === input.resident && receipt.memo.length > 0 && receipt.minute >= input.since).length,
			// The body carries no id or minute: the line is the one the next receipt would get, now.
			describe: (input, ctx) => describeReceipt({ ...input.body, id: nextId(ctx.state.receipts), minute: ctx.minute, parties: partiesOf(input.body) }),
			get: (input, ctx) => {
				const found = receiptById(ctx.state.receipts, input.id);
				return found === undefined ? null : toShared(found);
			},
			list: (input, ctx) => receiptsOf(ctx.state.receipts, input.resident).map(toShared),
			ofTransfer: (input, ctx) => ctx.state.transfers.get(input.txId) ?? null,
		}),
	],
	listeners: [
		kit.listen(
			LedgerEvents,
			"transfer",
			(payload, ctx) => {
				const { receipt, text } = issue(ctx, { kind: "transfer", from: payload.from, to: payload.to, amount: payload.amount, memo: payload.memo });
				ctx.state.transfers.set(payload.txId, receipt.id);
				ctx.call(ChannelsApi, "notify", { to: payload.to, author: CITY, text });
			},
			{ immediate: true },
		),
	],
	tools: [showTool(kit), blameTool(kit)],
	hooks: {
		turnInputs: {
			order: HOOK_ORDER.turnInputs.status,
			run: (resident, ctx) => {
				const count = receiptsOf(ctx.state.receipts, resident).length;
				if (count === 0) return [];
				const text = count === 1 ? ctx.prompt("competitor/status/receipt-one", {}) : ctx.prompt("competitor/status/receipts-many", { count });
				return [{ kind: INPUT_KINDS[1].kind, order: STATUS_ORDER.receipts, text }];
			},
		},
	},
	facts: {
		issued: kit.fact(Type.Integer(), (view) => view.state.receipts.length),
	},
	snapshot: kit.snapshot({
		version: 1,
		schema: Slice,
		save: (state) => ({
			receipts: state.receipts.map((receipt) => ({ ...receipt, parties: [...receipt.parties] })),
			pairs: state.pairs.map((pair) => ({ ...pair })),
			transfers: [...state.transfers].map(([txId, receipt]) => ({ txId, receipt })),
		}),
		load: (data) => ({
			receipts: inOrder(data.receipts),
			pairs: data.pairs.map((pair) => ({ ...pair })),
			transfers: new Map(data.transfers.map((entry): [string, string] => [entry.txId, entry.receipt])),
		}),
		migrations: {
			// The old snapshot keeps the receipts and the settled blame pairs; the delivery of a DM is the channels' record now.
			0: (old) => {
				const legacy = Parse(LegacySlice, old);
				return { receipts: legacy.receipts, pairs: legacy.blames?.pairs ?? [], transfers: [] };
			},
		},
	}),
}));

