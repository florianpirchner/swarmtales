// SPDX-License-Identifier: Apache-2.0
/**
 * The contract of the mechanic `ledger`: its service, its events and the name of the system account. The only file
 * another mechanic imports.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { defineEvents, defineService } from "@swarmtales/sdk";

export { SYSTEM_ACCOUNT } from "./book.ts";

const Id = Type.String({ description: "A resident id." });
const TxId = Type.String({ description: "The id of the booking: `TX1`, `TX2`, in the order booked." });
const Account = Type.String({ description: "A resident id or another account (escrow, a treasury, `SYSTEM_MINT_BURN`)." });
const Amount = Type.Number({ exclusiveMinimum: 0, description: "The points, a positive integer." });
const Reason = Type.String({ description: "Why the booking is made." });
const Key = Type.Optional(Type.String({ description: "Books once per key; a repeat returns the first booking." }));
const Nothing = Type.Null({ description: "Nothing." });
const OfAccount = Type.Object({ account: Account }, { description: "The account asked about." });
const Booking = Type.Object({ account: Account, amount: Amount, reason: Reason, idempotencyKey: Key }, { description: "One booking between the account and the system account." });

/**
 * The events of the ledger, declared apart so a listener needs no value import of the mechanic.
 *
 * @public
 */
export const LedgerEvents = defineEvents("ledger", {
	ledger_entry: Type.Object({ txId: TxId, debit: Account, credit: Account, amount: Type.Number({ description: "The points booked." }), reason: Reason }, { description: "One booking of the ledger: `debit` pays `credit` (`SYSTEM_MINT_BURN` mints and burns)." }),
	transfer: Type.Object(
		{ from: Id, to: Id, amount: Type.Number({ description: "The points transferred." }), memo: Type.String({ description: "The memo; empty when none was given." }), txId: TxId },
		{ description: "A resident's transfer (`transferPoints`); its `ledger_entry` comes first." },
	),
});

/**
 * The service of the ledger: what other mechanics read of the points and how they book.
 *
 * @public
 */
export const LedgerService = defineService({
	name: "ledger",
	summary: "Points per account and bookings between accounts.",
	methods: {
		balance: { kind: "query", summary: "An account's points; 0 for an account nobody opened.", input: OfAccount, output: Type.Number({ description: "The balance." }) },
		balances: { kind: "query", summary: "Every resident's points, for rankings and standings.", input: Type.Object({}, { description: "No input." }), output: Type.Record(Type.String({ description: "A resident id." }), Type.Number({ description: "The balance." }), { description: "The balance of every resident." }) },
		open: { kind: "command", summary: "Opens an account at 0; an open account is left as it is; writes no event.", input: OfAccount, output: Nothing },
		has: { kind: "query", summary: "Whether the account is open.", input: OfAccount, output: Type.Boolean({ description: "True for an open account." }) },
		mint: { kind: "command", summary: "Creates points: start points, rewards, grants; writes `ledger_entry`.", input: Booking, output: Nothing },
		burn: { kind: "command", summary: "Destroys points: fines, penalties, an exile; the account may go negative; writes `ledger_entry`.", input: Booking, output: Nothing },
		move: {
			kind: "command",
			summary: "Books points between accounts without the resident checks: escrow, treasuries, bids; writes `ledger_entry` only, never `transfer`.",
			input: Type.Object({ from: Account, to: Account, amount: Amount, reason: Reason, idempotencyKey: Key }, { description: "One booking between two accounts." }),
			output: Type.Union([Type.Object({ ok: Type.Literal(true), txId: TxId }), Type.Object({ ok: Type.Literal(false), code: Type.Literal("INSUFFICIENT_FUNDS") })], { description: "The id of the booking, or why nothing was booked." }),
		},
	},
});
