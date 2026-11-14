// SPDX-License-Identifier: Apache-2.0
/**
 * The `ledger` mechanic: double-entry points. Every resident has an account, every change of points is a booking
 * between two accounts (`ledger_entry`), other mechanics book through the service `ledger`, and residents pay each
 * other with `transferPoints`, which writes `ledger_entry` and then `transfer`.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import type { Refusal } from "@swarmtales/contracts";
import { defineMechanic, refuse, reply, RosterService } from "@swarmtales/sdk";
import { balanceOf, book, memoCarriesDigits, SYSTEM_ACCOUNT, type LedgerEntry } from "./book.ts";
import { ledgerHead, type LedgerCtx, type LedgerToolCtx } from "./head.ts";

export { book, LedgerError, memoCarriesDigits, restored, SYSTEM_ACCOUNT, type BookOptions, type LedgerEntry, type LedgerErrorCode, type LedgerState } from "./book.ts";
export { ledgerHead, type LedgerCtx, type LedgerToolCtx } from "./head.ts";

// The refusals of a transfer in the old order; undefined when nothing stands in the way.
function checkTransfer(ctx: LedgerToolCtx, to: string, amount: number, memo: string): Refusal | undefined {
	const from = ctx.resident;
	if (from === undefined) return refuse("UNKNOWN_AGENT");
	if (!ctx.residents.has(to)) return refuse("UNKNOWN_AGENT", to);
	if (from === to) return refuse("SELF_TRANSFER");
	if (!ctx.call(RosterService, "present", { resident: to })) return refuse("EXILED", `${to} was exiled`);
	if (!Number.isInteger(amount) || amount <= 0) return refuse("INVALID_AMOUNT");
	if (memoCarriesDigits(memo)) return refuse("MEMO_DIGITS", "memos may not carry numbers of 4+ digits; send codes by message");
	if (balanceOf(ctx.state, from) < amount) return refuse("INSUFFICIENT_FUNDS");
	return undefined;
}

function bookEntry(ctx: LedgerCtx, debit: string, credit: string, amount: number, reason: string, allowNegative: boolean, idempotencyKey?: string): LedgerEntry {
	return book(ctx.state, debit, credit, amount, reason, ctx.tick, { allowNegative, strict: ctx.options.strictAccounts, idempotencyKey }, (entry) => {
		ctx.emit("ledger_entry", { txId: entry.txId, debit: entry.debit, credit: entry.credit, amount: entry.amount, reason: entry.reason });
	});
}

/**
 * The ledger: points per account, booked double-entry, and the transfer between residents.
 *
 * @example
 * ```ts
 * const game = defineGame({ id: "city", residents: 6, mechanics: [ledger({ startPoints: 10 })], end: { ticks: 12 } });
 * ```
 *
 * @public
 */
export const ledger = defineMechanic(ledgerHead, {
	tools: {
		transferPoints: {
			check: ({ target, amount, memo }, ctx) => checkTransfer(ctx, target, amount, memo ?? ""),
			run: ({ target, amount, memo }, ctx) => {
				const from = ctx.resident;
				const refused = checkTransfer(ctx, target, amount, memo ?? "");
				if (from === undefined || refused !== undefined) return refused ?? refuse("UNKNOWN_AGENT");
				const text = memo ?? "";
				const entry = bookEntry(ctx, from, target, amount, text.length > 0 ? text : "transfer", false);
				ctx.emit("transfer", { from, to: target, amount, memo: text, txId: entry.txId });
				// The receipt of a transfer comes back with the receipts mechanic; until then the reply names none.
				return reply(ctx.prompt("ledger/replies/transfer-ok", { amount, target, balance: balanceOf(ctx.state, from), receipt: "none" }));
			},
		},
	},
	services: {
		ledger: {
			balance: (input, ctx) => balanceOf(ctx.state, input.account),
			balances: (_input, ctx) => Object.fromEntries(ctx.residents.ids.map((id) => [id, balanceOf(ctx.state, id)])),
			open: (input, ctx) => {
				if (!ctx.state.balances.has(input.account)) ctx.state.balances.set(input.account, 0);
				return null;
			},
			has: (input, ctx) => ctx.state.balances.has(input.account),
			mint: (input, ctx) => {
				bookEntry(ctx, SYSTEM_ACCOUNT, input.account, input.amount, input.reason, true, input.idempotencyKey);
				return null;
			},
			burn: (input, ctx) => {
				bookEntry(ctx, input.account, SYSTEM_ACCOUNT, input.amount, input.reason, true, input.idempotencyKey);
				return null;
			},
			move: (input, ctx) => {
				const repeated = input.idempotencyKey === undefined ? undefined : ctx.state.keys.get(input.idempotencyKey);
				if (repeated !== undefined) return { ok: true as const, txId: repeated.txId };
				if (balanceOf(ctx.state, input.from) < input.amount) return { ok: false as const, code: "INSUFFICIENT_FUNDS" as const };
				return { ok: true as const, txId: bookEntry(ctx, input.from, input.to, input.amount, input.reason, false, input.idempotencyKey).txId };
			},
		},
	},
	hooks: {
		runStarted: (ctx) => {
			if (ctx.options.startPoints <= 0) return;
			for (const id of ctx.residents.ids) bookEntry(ctx, SYSTEM_ACCOUNT, id, ctx.options.startPoints, "start points", true);
		},
		turnInputs: (resident, ctx) => [{ kind: "status", order: 300, text: ctx.prompt("ledger/status/points", { points: balanceOf(ctx.state, resident) }) }],
	},
	facts: {
		balances: { output: Type.Record(Type.String(), Type.Number()), compute: (view) => Object.fromEntries(view.residents.ids.map((id) => [id, balanceOf(view.state, id)])) },
		entries: { output: Type.Integer(), compute: (view) => view.state.entries.length },
	},
	limits: {
		"zero-sum": { summary: "The balances of all accounts add up to 0.", breached: (view) => ([...view.state.balances.values()].reduce((sum, balance) => sum + balance, 0) === 0 ? undefined : "the ledger is no longer zero-sum") },
	},
});
