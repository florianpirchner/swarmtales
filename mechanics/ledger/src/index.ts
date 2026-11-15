// SPDX-License-Identifier: Apache-2.0
/**
 * The `ledger` mechanic: double-entry points. Every resident has an account, every change of points is a booking
 * between two accounts (`ledger_entry`), other mechanics book through the service `ledger`, and residents pay each
 * other with `transferPoints`, which writes `ledger_entry` and then `transfer`. It listens to the event `exiled` of
 * the mechanic `exile` and burns what the banished resident has left. With a provider of `identity` a resident reads
 * names in place of ids and may name the target by its name; with a provider of `receipt-source` the reply names the
 * receipt of the transfer. Without them the ids stay and the receipt is `none`.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import type { RandomSource, Refusal } from "@swarmtales/contracts";
import { IdentityService, ReceiptSourceService } from "@swarmtales/mechanic-contracts";
import { clearsAway, ExileEvents } from "@swarmtales/mechanic-exile/contract";
import { defineMechanic, refuse, reply, RosterService } from "@swarmtales/sdk";
import { balanceOf, book, memoCarriesDigits, SYSTEM_ACCOUNT, type LedgerEntry } from "./book.ts";
import { ledgerHead, type LedgerCtx, type LedgerToolCtx } from "./head.ts";

export { book, LedgerError, memoCarriesDigits, restored, SYSTEM_ACCOUNT, type BookOptions, type LedgerEntry, type LedgerErrorCode, type LedgerState } from "./book.ts";
export { ledgerHead, type LedgerCtx, type LedgerToolCtx } from "./head.ts";

const SAMPLE_RATE = 0.125;
const SAMPLE_MOST = 5;

// A text as the resident reads it: every id replaced by the resident's name (old `display` of `names`, which the old
// platform applied to every reply and every refusal's detail); as written without a provider of `identity`.
function shown(ctx: LedgerToolCtx, text: string): string {
	return ctx.tryCall(IdentityService, "display", { text }) ?? text;
}

function shownRefusal(ctx: LedgerToolCtx, refusal: Refusal | undefined): Refusal | undefined {
	return refusal?.detail === undefined ? refusal : { ...refusal, detail: shown(ctx, refusal.detail) };
}

// The id a target stands for: a resident may write a name where an id goes (old `resolve` of `names`).
function resolved(ctx: LedgerToolCtx, target: string): string {
	return ctx.tryCall(IdentityService, "resolve", { text: target }) ?? target;
}

// The refusals of a transfer in the old order; undefined when nothing stands in the way. `to` is resolved.
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

// A transfer the fake driver may make, about one activation in eight: 1 to 5 points that the balance covers, to
// another resident that may act.
function sampleTransfer(ctx: LedgerToolCtx, random: RandomSource): { target: string; amount: number } | undefined {
	const from = ctx.resident;
	if (from === undefined || random.next() >= SAMPLE_RATE) return undefined;
	const others = ctx.residents.ids.filter((id) => id !== from && ctx.residents.mayAct(id));
	const most = Math.min(SAMPLE_MOST, balanceOf(ctx.state, from));
	return others.length === 0 || most < 1 ? undefined : { target: random.pick(others), amount: random.int(1, most) };
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
			check: ({ target, amount, memo }, ctx) => shownRefusal(ctx, checkTransfer(ctx, resolved(ctx, target), amount, memo ?? "")),
			sample: sampleTransfer,
			run: ({ target, amount, memo }, ctx) => {
				const from = ctx.resident;
				const to = resolved(ctx, target);
				const refused = shownRefusal(ctx, checkTransfer(ctx, to, amount, memo ?? ""));
				if (from === undefined || refused !== undefined) return refused ?? refuse("UNKNOWN_AGENT");
				const text = memo ?? "";
				const entry = bookEntry(ctx, from, to, amount, text.length > 0 ? text : "transfer", false);
				ctx.emit("transfer", { from, to, amount, memo: text, txId: entry.txId });
				const receipt = ctx.tryCall(ReceiptSourceService, "ofTransfer", { txId: entry.txId }) ?? "none";
				return reply(shown(ctx, ctx.prompt("ledger/replies/transfer-ok", { amount, target: to, balance: balanceOf(ctx.state, from), receipt })));
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
		"exile-purse": {
			balance: (input, ctx) => balanceOf(ctx.state, input.account),
			burn: (input, ctx) => {
				bookEntry(ctx, input.account, SYSTEM_ACCOUNT, input.amount, input.reason, true);
				return null;
			},
			move: (input, ctx) => {
				bookEntry(ctx, input.from, input.to, input.amount, input.reason, false);
				return null;
			},
		},
	},
	listeners: (kit) => [
		// The points of a banished resident are gone: its whole balance is burned, as the old exile did. Nothing is
		// booked for a balance of 0 or less, nor for a strike that keeps (the holdout trial: the points stay).
		kit.listen(ExileEvents, "exiled", (exiled, ctx) => {
			const agent = exiled.agent;
			const balance = clearsAway(exiled) ? balanceOf(ctx.state, agent) : 0;
			if (balance > 0) bookEntry(ctx, agent, SYSTEM_ACCOUNT, balance, `exiled ${agent}`, true);
		}),
	],
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
