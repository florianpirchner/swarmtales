// SPDX-License-Identifier: Apache-2.0
/** The head of the `ledger` mechanic: its options, its state with the snapshot, its events, service, prompts and tool. */
import { Type } from "typebox";
import { IdentityService, ReceiptSourceService } from "@swarmtales/mechanic-contracts";
import { defineHead, RosterService, type CtxOf, type ToolCtxOf } from "@swarmtales/sdk";
import { restored, SYSTEM_ACCOUNT, type LedgerState } from "./book.ts";
import { LedgerEvents, LedgerService } from "./contract.ts";

const Entry = Type.Object(
	{
		txId: Type.String({ description: "The id of the booking." }),
		debit: Type.String({ description: "The account that pays." }),
		credit: Type.String({ description: "The account that receives." }),
		amount: Type.Number({ description: "The points booked." }),
		reason: Type.String({ description: "Why the booking was made." }),
		tick: Type.Integer({ description: "The tick of the booking." }),
		idempotencyKey: Type.Optional(Type.String({ description: "The key the booking was made under." })),
	},
	{ description: "One booking." },
);
const Slice = Type.Object(
	{
		balances: Type.Array(Type.Object({ account: Type.String({ description: "The account." }), balance: Type.Number({ description: "Its points." }) }, { description: "One account." }), { description: "Every open account, in the order opened." }),
		entries: Type.Array(Entry, { description: "Every booking, in order." }),
		txSeq: Type.Integer({ description: "The number of the last booking." }),
	},
	{ description: "The saved state of the ledger." },
);

/**
 * The head of the ledger: everything that can be read without running a handler.
 *
 * @public
 */
export const ledgerHead = defineHead({
	id: "ledger",
	package: "@swarmtales/mechanic-ledger",
	summary: "Points per account and bookings between accounts.",
	options: Type.Object({
		startPoints: Type.Integer({ minimum: 0, default: 0, description: "Points every resident starts with, minted from the system account when the run starts (reason `start points`)." }),
		strictAccounts: Type.Boolean({ default: true, description: "Refuse a booking on an account nobody opened (`UNKNOWN_ACCOUNT`); accounts open with the service method `open`." }),
	}),
	state: Slice,
	start: ({ residents }): LedgerState => ({ balances: new Map([[SYSTEM_ACCOUNT, 0], ...residents.map((id): [string, number] => [id, 0])]), entries: [], keys: new Map(), txSeq: 0 }),
	snapshot: {
		save: (state: LedgerState) => ({ balances: [...state.balances].map(([account, balance]) => ({ account, balance })), entries: state.entries.map((entry) => ({ ...entry })), txSeq: state.txSeq }),
		load: (data): LedgerState => restored(data),
	},
	events: LedgerEvents.events,
	prompts: { "ledger/tools/transferPoints": [], "ledger/replies/transfer-ok": ["amount", "target", "balance", "receipt"], "ledger/status/points": ["points"] },
	// A transfer to a resident that may not act is refused: at M3 only the exile suspends a resident.
	requires: [RosterService],
	// A name in place of an id in the texts and the target, and the receipt in the reply, when a provider is loaded.
	uses: [IdentityService, ReceiptSourceService],
	provides: [LedgerService],
	tools: {
		transferPoints: {
			description: "ledger/tools/transferPoints",
			params: Type.Object({
				target: Type.String({ description: "Recipient name or ID" }),
				amount: Type.Integer({ description: "Positive integer", minimum: 1 }),
				memo: Type.Optional(Type.String({ description: "Purpose, without numbers of 4+ digits", maxLength: 120 })),
			}),
			for: ["resident"],
		},
	},
});

/**
 * The context of the ledger's hooks and services.
 *
 * @public
 */
export type LedgerCtx = CtxOf<typeof ledgerHead>;

/**
 * The context of the ledger's tool.
 *
 * @public
 */
export type LedgerToolCtx = ToolCtxOf<typeof ledgerHead>;
