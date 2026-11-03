/**
 * Proof mechanic `ledger` (wave 2a): points per resident, a `transferPoints` tool with a rule and a
 * limit, the `ledger` API (balance, transfer, charge) for other mechanics, two facts, a referee
 * limit and a versioned snapshot slice with a migration from version 1.
 */
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { defineApi, defineHead, defineMechanic, refuse, reply } from "@swarmtales/kernel";
import type { ContextOf } from "@swarmtales/contracts";

const Moved = Type.Union([Type.Object({ ok: Type.Literal(true), balance: Type.Integer() }), Type.Object({ ok: Type.Literal(false), reason: Type.String() })]);

export const LedgerApi = defineApi({
	name: "ledger",
	summary: "Points per resident and moves between them.",
	methods: {
		balance: { kind: "query", summary: "A resident's points.", input: Type.Object({ resident: Type.String() }), output: Type.Integer() },
		transfer: {
			kind: "command",
			summary: "Moves points from one resident to another.",
			input: Type.Object({ from: Type.String(), to: Type.String(), amount: Type.Integer({ minimum: 1 }), memo: Type.String() }),
			output: Moved,
		},
		charge: {
			kind: "command",
			summary: "Takes points from a resident (paid to nobody).",
			input: Type.Object({ resident: Type.String(), amount: Type.Integer({ minimum: 0 }), memo: Type.String() }),
			output: Moved,
		},
	},
});

const Balances = Type.Record(Type.String(), Type.Integer());

/** Version 1 stored the balances as pairs. */
const V1 = Type.Object({ points: Type.Array(Type.Tuple([Type.String(), Type.Integer()])) });

const options = Type.Object({
	start: Type.Integer({ minimum: 0, default: 10, description: "Points every resident starts with." }),
	maxTransfer: Type.Integer({ minimum: 1, default: 5, description: "The largest single transfer with transferPoints." }),
});

interface LedgerState {
	readonly balances: Map<string, number>;
}

const events = {
	points_transferred: Type.Object({ from: Type.String(), to: Type.String(), amount: Type.Integer(), memo: Type.String() }),
	points_charged: Type.Object({ resident: Type.String(), amount: Type.Integer(), memo: Type.String() }),
};

const prompts = {
	"ledger/tools/transferPoints": [],
	"ledger/transfer-ok": ["amount", "to", "balance"],
} as const;

/** Declared apart from the body, so the helper below can name its context. */
const head = defineHead({
	id: "ledger",
	summary: "Points per resident and transfers between residents.",
	provides: [LedgerApi],
	options,
	state: ({ options: chosen, residents }): LedgerState => ({ balances: new Map(residents.map((id) => [id, chosen.start])) }),
	events,
	prompts,
});

type Ctx = ContextOf<typeof head>;

function transfer(ctx: Ctx, from: string, to: string, amount: number, memo: string): { ok: true; balance: number } | { ok: false; reason: string } {
	const balances = ctx.state.balances;
	const have = balances.get(from);
	if (have === undefined || !balances.has(to)) return { ok: false, reason: "unknown resident" };
	if (have < amount) return { ok: false, reason: `only ${String(have)} points` };
	balances.set(from, have - amount);
	balances.set(to, (balances.get(to) ?? 0) + amount);
	ctx.emit("points_transferred", { from, to, amount, memo });
	return { ok: true, balance: have - amount };
}

export const ledger = defineMechanic(head, (kit) => ({
	services: [
		kit.provide(LedgerApi, {
			balance: (input, ctx) => ctx.state.balances.get(input.resident) ?? 0,
			transfer: (input, ctx) => transfer(ctx, input.from, input.to, input.amount, input.memo),
			charge: (input, ctx) => {
				const have = ctx.state.balances.get(input.resident) ?? 0;
				if (have < input.amount) return { ok: false, reason: `only ${String(have)} points` };
				ctx.state.balances.set(input.resident, have - input.amount);
				ctx.emit("points_charged", { resident: input.resident, amount: input.amount, memo: input.memo });
				return { ok: true, balance: have - input.amount };
			},
		}),
	],
	tools: [
		kit.tool({
			name: "transferPoints",
			description: "ledger/tools/transferPoints",
			parameters: Type.Object({ to: Type.String(), amount: Type.Integer({ minimum: 1 }) }),
			limit: { max: 2, per: "minute" },
			suggest: ["resident"],
			rule: (params, ctx) => {
				if (params.to === ctx.resident) return refuse("SELF_TRANSFER");
				if (params.amount > ctx.options.maxTransfer) return refuse("TOO_MUCH", `at most ${String(ctx.options.maxTransfer)}`);
				return undefined;
			},
			execute: (params, ctx) => {
				const moved = transfer(ctx, ctx.resident ?? "", params.to, params.amount, "transferPoints");
				return moved.ok ? reply(ctx.prompt("ledger/transfer-ok", { amount: params.amount, to: params.to, balance: moved.balance })) : refuse("INSUFFICIENT_POINTS", moved.reason);
			},
		}),
	],
	facts: {
		balances: kit.fact(Balances, (view) => Object.fromEntries(view.state.balances)),
		transfers: kit.fact(Type.Integer(), (view) => view.log.ofType("ledger", "points_transferred").length),
	},
	limits: [kit.limit("non-negative", "No balance is ever below zero.", (view) => ([...view.state.balances.values()].some((points) => points < 0) ? "a balance fell below zero" : undefined))],
	snapshot: kit.snapshot({
		version: 2,
		schema: Type.Object({ balances: Balances }),
		save: (state) => ({ balances: Object.fromEntries(state.balances) }),
		load: (data) => ({ balances: new Map(Object.entries(data.balances)) }),
		/** Version 1 stored pairs; version 2 a record. */
		migrations: { 1: (old) => ({ balances: Object.fromEntries(Parse(V1, old).points) }) },
	}),
}));
