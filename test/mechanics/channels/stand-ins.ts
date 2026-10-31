/**
 * Stand-ins of other teams' providers for the T2 mechanics' tests: each provides the frozen API
 * of `mechanics/shared` with simple, scripted answers (named so in the tests that use them).
 * Their legacy slices keep the version-0 data of an old snapshot unchanged.
 */
import { Type } from "typebox";
import type { ContextOf } from "@swarmtales/contracts";
import { defineHead, defineMechanic } from "@swarmtales/kernel";
import { LedgerApi, LedgerEvents, MarksApi, NamesApi, ReceiptsApi } from "@swarmtales/mechanic-shared";

const Old = Type.Object({ old: Type.Unknown() });

interface LedgerState {
	readonly balances: Map<string, number>;
	tx: number;
	old: unknown;
}

const ledgerHead = defineHead({
	id: "ledger",
	summary: "Stand-in ledger: balances and moves.",
	options: Type.Object({}),
	state: (): LedgerState => ({ balances: new Map(), tx: 0, old: null }),
	events: { ...LedgerEvents.events },
	provides: [LedgerApi],
});

type LedgerContext = ContextOf<typeof ledgerHead>;

function entry(ctx: LedgerContext, debit: string, credit: string, amount: number, reason: string): string {
	ctx.state.tx += 1;
	const txId = `TX${String(ctx.state.tx)}`;
	ctx.emit("ledger_entry", { txId, debit, credit, amount, reason });
	return txId;
}

/** A ledger with real balances: residents start with `start` points, `move` refuses a poor payer. */
export function ledgerStandIn(start: number) {
	return defineMechanic(ledgerHead, (kit) => ({
		services: [
			kit.provide(LedgerApi, {
				balance: (input, ctx) => ctx.state.balances.get(input.account) ?? 0,
				balances: (_input, ctx) => Object.fromEntries(ctx.state.balances),
				mint: (input, ctx) => {
					ctx.state.balances.set(input.account, (ctx.state.balances.get(input.account) ?? 0) + input.amount);
					entry(ctx, "SYSTEM_MINT_BURN", input.account, input.amount, input.reason);
					return null;
				},
				burn: (input, ctx) => {
					ctx.state.balances.set(input.account, (ctx.state.balances.get(input.account) ?? 0) - input.amount);
					entry(ctx, input.account, "SYSTEM_MINT_BURN", input.amount, input.reason);
					return null;
				},
				move: (input, ctx) => {
					const have = ctx.state.balances.get(input.from) ?? 0;
					if (have < input.amount) return { ok: false, code: "INSUFFICIENT_FUNDS" };
					ctx.state.balances.set(input.from, have - input.amount);
					ctx.state.balances.set(input.to, (ctx.state.balances.get(input.to) ?? 0) + input.amount);
					return { ok: true, txId: entry(ctx, input.from, input.to, input.amount, input.reason) };
				},
			}),
		],
		hooks: {
			runStarted: (ctx) => {
				for (const id of ctx.residents.ids) ctx.state.balances.set(id, start);
			},
		},
		snapshot: kit.snapshot({
			version: 1,
			schema: Type.Object({ old: Type.Unknown(), balances: Type.Record(Type.String(), Type.Number()), tx: Type.Integer() }),
			save: (state) => ({ old: state.old, balances: Object.fromEntries(state.balances), tx: state.tx }),
			load: (data) => ({ balances: new Map(Object.entries(data.balances)), tx: data.tx, old: data.old }),
			migrations: { 0: (old) => ({ old, balances: {}, tx: 0 }) },
		}),
	}));
}

/** What a marks stand-in answers: whether a message is affordable, and what is left after paying. */
export interface MarksScript {
	canAfford(resident: string, channel: string): boolean;
	spend(resident: string, channel: string): { readonly remaining: number; readonly budget: number } | null;
	left(resident: string): { readonly remaining: number; readonly budget: number } | null;
}

export const NO_MARKS_SCRIPT: MarksScript = { canAfford: () => true, spend: () => null, left: () => null };

const keepOld = { version: 1, schema: Old, migrations: { 0: (old: unknown) => ({ old }) } } as const;

export function marksStandIn(script: MarksScript = NO_MARKS_SCRIPT) {
	return defineMechanic(
		{
			id: "marks",
			summary: "Stand-in marks: scripted answers.",
			options: Type.Object({}),
			state: (): { old: unknown } => ({ old: null }),
			events: {},
			provides: [MarksApi],
		},
		(kit) => ({
			services: [
				kit.provide(MarksApi, {
					canAfford: (input) => script.canAfford(input.resident, input.channel),
					left: (input) => script.left(input.resident),
					spend: (input) => script.spend(input.resident, input.channel),
				}),
			],
			snapshot: kit.snapshot({ ...keepOld, save: (state) => ({ old: state.old }), load: (data) => ({ old: data.old }) }),
		}),
	);
}

/** Names: ids become names in every text, names become ids in the arguments `target`, `agent` and `to`. */
export function namesStandIn(names: Map<string, string>) {
	const idOf = (text: string): string => [...names].find(([, name]) => name === text)?.[0] ?? text;
	return defineMechanic(
		{
			id: "names",
			summary: "Stand-in names: a book the test fills.",
			options: Type.Object({}),
			state: (): { old: unknown } => ({ old: null }),
			events: {},
			provides: [NamesApi],
		},
		(kit) => ({
			services: [
				kit.provide(NamesApi, {
					hasNames: () => names.size > 0,
					nameOf: (input) => names.get(input.resident) ?? null,
					labelOf: (input) => names.get(input.resident) ?? input.resident,
					resolve: (input) => idOf(input.text),
				}),
			],
			presentation: {
				resolve: (call) => {
					const params = call.params;
					if (typeof params !== "object" || params === null || Array.isArray(params)) return params;
					return Object.fromEntries(Object.entries(params).map(([key, value]: [string, unknown]) => [key, typeof value === "string" && ["target", "agent", "to"].includes(key) ? idOf(value) : value]));
				},
				// The old rule: an id that is being announced ("A01 is now called ...") stays an id.
				display: (text) => (names.size === 0 ? text : text.replace(/\bA\d\d\b/g, (id, offset: number) => (text.startsWith(" is now called ", offset + id.length) ? id : (names.get(id) ?? id)))),
			},
			snapshot: kit.snapshot({ ...keepOld, save: (state) => ({ old: state.old }), load: (data) => ({ old: data.old }) }),
		}),
	);
}

export interface ReceiptsScript {
	/** The id of the next receipt, when a test dictates them (else R-0001, R-0002, ... counted in the slice). */
	nextId?(): string;
	/** Transfers with a memo the resident sent since a minute. */
	memoTransfers(resident: string, since: number): number;
}

export function receiptsStandIn(script: ReceiptsScript = { memoTransfers: () => 0 }) {
	return defineMechanic(
		{
			id: "receipts",
			summary: "Stand-in receipts: scripted ids.",
			options: Type.Object({}),
			state: (): { old: unknown; issued: number } => ({ old: null, issued: 0 }),
			events: {},
			provides: [ReceiptsApi],
		},
		(kit) => ({
			services: [
				kit.provide(ReceiptsApi, {
					issue: (input, ctx) => {
						ctx.state.issued += 1;
						const id = script.nextId?.() ?? `R-${String(ctx.state.issued).padStart(4, "0")}`;
						return { id, text: `${id}: ${input.body.kind}` };
					},
					count: () => 0,
					memoTransfers: (input) => script.memoTransfers(input.resident, input.since),
					describe: (input) => input.body.kind,
				}),
			],
			snapshot: kit.snapshot({
				version: 1,
				schema: Type.Object({ old: Type.Unknown(), issued: Type.Integer() }),
				save: (state) => ({ old: state.old, issued: state.issued }),
				load: (data) => ({ old: data.old, issued: data.issued }),
				migrations: { 0: (old: unknown) => ({ old, issued: 0 }) },
			}),
		}),
	);
}
