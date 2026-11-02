/**
 * The `ledger` mechanic (carve step 2, team T1, docs/design/carve-team-T1.md): double-entry points
 * (copied from packages/kernel/src/ledger.ts, which stays until step 18), the `LedgerApi` other
 * mechanics book through, and the tool `transferPoints` (old `World#checkTransfer`/`transfer` and
 * tools/transfer.ts). Events: `ledger_entry` for every booking; a resident's transfer writes
 * `ledger_entry` and then `transfer`, whose receipt the receipts mechanic issues.
 */
import { Type } from "typebox";
import { Parse } from "typebox/value";
import type { ContextOf } from "@swarmtales/contracts";
import { defineHead, defineMechanic, refuse, reply } from "@swarmtales/kernel";
import { ChannelsApi, ExileApi, HOOK_ORDER, INPUT_KINDS, LedgerApi, LedgerEvents, ReceiptsApi, STATUS_ORDER } from "@swarmtales/mechanic-shared";
import { balanceOf, book, memoCarriesDigits, restored, SYSTEM_ACCOUNT, type LedgerState } from "./book.ts";

const Entry = Type.Object({
	txId: Type.String(),
	debit: Type.String(),
	credit: Type.String(),
	amount: Type.Number(),
	reason: Type.String(),
	minute: Type.Integer(),
	idempotencyKey: Type.Optional(Type.String()),
});
const Slice = Type.Object({ balances: Type.Array(Type.Object({ account: Type.String(), balance: Type.Number() })), entries: Type.Array(Entry), txSeq: Type.Integer() });
/** The version-0 slice the legacy converter cuts out of the old world: `{ ledger }`. */
const LegacySlice = Type.Object({ ledger: Slice });

export const ledgerHead = defineHead({
	id: "ledger",
	summary: "Points per account and bookings between accounts.",
	options: Type.Object({
		startPoints: Type.Integer({ minimum: 0, default: 0, description: "Points every resident starts with, minted from the system account when the run starts (reason `start points`)." }),
		strictAccounts: Type.Boolean({
			default: true,
			description: "Refuse a booking on an account nobody opened (old `UNKNOWN_ACCOUNT`, always on in the old ledger); accounts open with `LedgerApi.open` (round 2, R2-D1).",
		}),
	}),
	state: ({ residents }): LedgerState => ({ balances: new Map([[SYSTEM_ACCOUNT, 0], ...residents.map((id): [string, number] => [id, 0])]), entries: [], keys: new Map(), txSeq: 0 }),
	events: { ...LedgerEvents.events },
	prompts: { "tools/transferPoints": [], "replies/transfer-ok": ["amount", "target", "balance", "receipt"], "competitor/status/points": ["points"] },
	provides: [LedgerApi],
	// The exile and the DM cap are checked before a transfer (old checkTransfer); the receipt's id is named in the reply.
	uses: [ExileApi, ChannelsApi, ReceiptsApi],
});

type Ctx = ContextOf<typeof ledgerHead>;

/** The refusals of a transfer in the old order (World#checkTransfer); undefined when nothing stands in the way. */
function checkTransfer(ctx: Ctx, from: string, to: string, amount: number, memo: string) {
	if (!ctx.residents.has(to)) return refuse("UNKNOWN_AGENT", to);
	if (from === to) return refuse("SELF_TRANSFER");
	if (ctx.tryCall(ExileApi, "isExiled", { resident: to }) === true) return refuse("EXILED", `${to} was exiled`);
	if (!Number.isInteger(amount) || amount <= 0) return refuse("INVALID_AMOUNT");
	if (memoCarriesDigits(memo)) return refuse("MEMO_DIGITS", "memos may not carry numbers of 4+ digits; send codes by message");
	if (balanceOf(ctx.state, from) < amount) return refuse("INSUFFICIENT_FUNDS");
	// A memo is a message too: it counts toward the DM cap (SPEC 20).
	const window = memo.length > 0 ? ctx.tryCall(ChannelsApi, "dmWindow", { resident: from }) : undefined;
	if (window !== undefined && window !== null && window.sent >= window.limit) {
		return refuse("DM_LIMIT", `${String(window.sent)} DMs and memos sent since minute ${String(window.from)}; send a memo again from minute ${String(window.until)}, or transfer without one`);
	}
	return undefined;
}

function bookEntry(ctx: Ctx, debit: string, credit: string, amount: number, reason: string, allowNegative: boolean, idempotencyKey?: string) {
	return book(ctx.state, debit, credit, amount, reason, ctx.minute, { allowNegative, strict: ctx.options.strictAccounts, idempotencyKey }, (entry) => {
		ctx.emit("ledger_entry", { txId: entry.txId, debit: entry.debit, credit: entry.credit, amount: entry.amount, reason: entry.reason });
	});
}

export { book, LedgerError, restored, SYSTEM_ACCOUNT, type LedgerState } from "./book.ts";

export const ledger = defineMechanic(ledgerHead, (kit) => ({
	services: [
		kit.provide(LedgerApi, {
			balance: (input, ctx) => balanceOf(ctx.state, input.account),
			balances: (_input, ctx) => Object.fromEntries(ctx.residents.ids.map((id) => [id, balanceOf(ctx.state, id)])),
			// Old `ledger.open`: an account at 0, an open one untouched; no event (the old ledger wrote none).
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
				if (repeated !== undefined) return { ok: true, txId: repeated.txId };
				if (balanceOf(ctx.state, input.from) < input.amount) return { ok: false, code: "INSUFFICIENT_FUNDS" };
				const entry = bookEntry(ctx, input.from, input.to, input.amount, input.reason, false, input.idempotencyKey);
				return { ok: true, txId: entry.txId };
			},
		}),
	],
	tools: [
		kit.tool({
			name: "transferPoints",
			description: "tools/transferPoints",
			parameters: Type.Object({
				target: Type.String({ description: "Recipient name or ID" }),
				amount: Type.Integer({ description: "Positive integer", minimum: 1 }),
				memo: Type.Optional(Type.String({ description: "Purpose, without numbers of 4+ digits", maxLength: 120 })),
			}),
			suggest: ["resident"],
			rule: ({ target, amount, memo }, ctx) => (ctx.resident === undefined ? refuse("UNKNOWN_AGENT") : checkTransfer(ctx, ctx.resident, target, amount, memo ?? "")),
			guardText: ({ memo }) => memo,
			execute: ({ target, amount, memo }, ctx) => {
				const from = ctx.resident;
				if (from === undefined) return refuse("UNKNOWN_AGENT");
				const refused = checkTransfer(ctx, from, target, amount, memo ?? "");
				if (refused !== undefined) return refused;
				const text = memo ?? "";
				const entry = bookEntry(ctx, from, target, amount, text.length > 0 ? text : "transfer", false);
				ctx.emit("transfer", { from, to: target, amount, memo: text, txId: entry.txId });
				const receipt = ctx.tryCall(ReceiptsApi, "ofTransfer", { txId: entry.txId }) ?? "none";
				return reply(ctx.prompt("replies/transfer-ok", { amount, target, balance: balanceOf(ctx.state, from), receipt }));
			},
		}),
	],
	hooks: {
		// After the whisperer is chosen, before the cast's escrow (the old constructor's order).
		runStarted: {
			order: HOOK_ORDER.runStarted.ledger,
			run: (ctx) => {
				if (ctx.options.startPoints <= 0) return;
				for (const id of ctx.residents.ids) bookEntry(ctx, SYSTEM_ACCOUNT, id, ctx.options.startPoints, "start points", true);
			},
		},
		turnInputs: { order: HOOK_ORDER.turnInputs.status, run: (resident, ctx) => [{ kind: INPUT_KINDS[1].kind, order: STATUS_ORDER.points, text: ctx.prompt("competitor/status/points", { points: balanceOf(ctx.state, resident) }) }] },
	},
	facts: {
		balances: kit.fact(Type.Record(Type.String(), Type.Number()), (view) => Object.fromEntries(view.residents.ids.map((id) => [id, balanceOf(view.state, id)]))),
		entries: kit.fact(Type.Integer(), (view) => view.state.entries.length),
	},
	limits: [kit.limit("zero-sum", "The balances of all accounts add up to 0.", (view) => ([...view.state.balances.values()].reduce((sum, balance) => sum + balance, 0) === 0 ? undefined : "the ledger is no longer zero-sum"))],
	snapshot: kit.snapshot({
		version: 1,
		schema: Slice,
		save: (state) => ({ balances: [...state.balances].map(([account, balance]) => ({ account, balance })), entries: state.entries.map((entry) => ({ ...entry })), txSeq: state.txSeq }),
		load: (data) => restored(data),
		migrations: { 0: (old) => Parse(LegacySlice, old).ledger },
	}),
}));
