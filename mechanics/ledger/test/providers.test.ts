// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The parts of the old `test/mechanics/ledger/ledger.test.ts` that need other mechanics, played with stand-ins: the
 * names of `identity` in the replies and the target, the receipt of `receipt-source` in the reply, and the cap on
 * direct messages, which `channels` owns and enforces in its own `rule` handler on `transferPoints` (12-m5-spec.md
 * 2.3). Without the providers the ids stay and the receipt is `none` (`ledger.test.ts`).
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import type { Activation } from "@swarmtales/contracts";
import { IdentityService, ReceiptSourceService } from "@swarmtales/mechanic-contracts";
import { defineEvents, defineHead, defineMechanic, refuse, type MechanicUse } from "@swarmtales/sdk";
import { checkDeterminism, checkSnapshotRoundTrip, play, scriptedDriver, type CallRecord, type PlannedCall } from "@swarmtales/testkit";
import { LedgerEvents } from "../src/contract.ts";
import { exileStandIn, ledgerGame, written } from "./support.ts";

const NAMES: Readonly<Record<string, string>> = { A01: "Mira", A02: "Rook", A03: "Wren", A04: "Ash" };

/** Stands in for `names`: every resident has a name, every id in a text is shown by it, a name resolves to its id. */
const identity = defineMechanic(defineHead({ id: "names", package: "@test/names", summary: "Test: stands in for the provider of identity.", provides: [IdentityService] }), {
	services: {
		identity: {
			nameOf: ({ resident }) => NAMES[resident] ?? null,
			display: ({ text }) => text.replace(/\bA0\d\b/g, (id) => NAMES[id] ?? id),
			resolve: ({ text }) => Object.keys(NAMES).find((id) => NAMES[id] === text) ?? text,
		},
	},
});

const ReceiptEvents = defineEvents("receipts", { receipt_issued: Type.Object({ receipt: Type.String({ description: "The receipt." }), txId: Type.String({ description: "The booking." }) }, { description: "Test: a receipt was issued." }) });
const receiptsHead = defineHead({
	id: "receipts",
	package: "@test/receipts",
	summary: "Test: stands in for the provider of receipt-source.",
	options: Type.Object({ ahead: Type.Boolean({ default: true, description: "Answer the id of the receipt the listener will issue for a booking it has not seen yet." }) }),
	state: Type.Object({ issued: Type.Array(Type.String({ description: "A booking with a receipt." }), { description: "The bookings, in the order of their receipts." }) }),
	start: () => ({ issued: [] }),
	events: ReceiptEvents.events,
	provides: [ReceiptSourceService],
});
const receiptId = (number: number): string => `R-${String(number).padStart(4, "0")}`;

/** Stands in for `receipts`: it issues the receipt of a transfer in its listener of `transfer`, as the old one did. */
const receipts = defineMechanic(receiptsHead, {
	services: {
		"receipt-source": {
			ofTransfer: ({ txId }, ctx) => {
				const at = ctx.state.issued.indexOf(txId);
				if (at >= 0) return receiptId(at + 1);
				return ctx.options.ahead ? receiptId(ctx.state.issued.length + 1) : null;
			},
			ofMessage: () => null,
			ofLevel: () => null,
			textsOf: () => [],
		},
	},
	listeners: (kit) => [
		kit.listen(LedgerEvents, "transfer", ({ txId }, ctx) => {
			ctx.state.issued.push(txId);
			ctx.emit("receipt_issued", { receipt: receiptId(ctx.state.issued.length), txId });
		}),
	],
});

const WINDOW = { sent: 8, limit: 8, from: 0, until: 4 };
const carriesMemo = (params: unknown): boolean => typeof params === "object" && params !== null && String(Reflect.get(params, "memo") ?? "").length > 0;

/** Stands in for the window of `channels`: the window is full, and a transfer with a memo is a message too. */
const window = defineMechanic(defineHead({ id: "channels", package: "@test/channels", summary: "Test: stands in for the cap on direct messages." }), {
	pipeline: {
		rule: (call) =>
			call.tool === "transferPoints" && carriesMemo(call.params) && WINDOW.sent >= WINDOW.limit
				? refuse("DM_LIMIT", `${String(WINDOW.sent)} DMs and memos sent since minute ${String(WINDOW.from)}; send a memo again from minute ${String(WINDOW.until)}, or transfer without one`)
				: undefined,
	},
});

const give = (target: string, amount: number, memo?: string): PlannedCall => ({ tool: "transferPoints", params: memo === undefined ? { target, amount } : { target, amount, memo } });
const plan = (turn: Activation): readonly PlannedCall[] => {
	if (turn.tick === 0 && turn.actor === "resident:A01") return [give("Rook", 3, "thanks"), give("A01", 1), give("Z99", 1), give("Ash", 1), give("A02", 1, "code 559 102"), give("Rook", 50)];
	if (turn.tick === 0 && turn.actor === "resident:A03") return [give("A02", 1, "hello"), give("Rook", 2)];
	if (turn.tick === 1 && turn.actor === "resident:A02") return [give("Mira", 13)];
	return [];
};
const answers = (records: readonly CallRecord[], actor: string): readonly string[] => records.filter((record) => record.actor === actor).map((record) => (record.outcome.ok ? record.outcome.reply : `${record.outcome.code}: ${record.outcome.detail ?? ""}`));
const providers = (ahead = true): readonly MechanicUse[] => [exileStandIn(["A04"]), identity(), receipts({ ahead })];

describe("transferPoints with the providers of identity and receipt-source", () => {
	it("takes a name for the target, shows names in its replies and details, and names the receipt", async () => {
		const records: CallRecord[] = [];
		const run = await play(ledgerGame(providers()), { drivers: { resident: scriptedDriver(plan, records) } });
		expect(answers(records, "resident:A01")).toEqual([
			"ok · 3 points to Rook · your balance: 7 · receipt R-0001",
			"SELF_TRANSFER: ",
			"UNKNOWN_AGENT: Z99",
			"EXILED: Ash was exiled",
			"MEMO_DIGITS: memos may not carry numbers of 4+ digits; send codes by message",
			"INSUFFICIENT_FUNDS: ",
		]);
		expect(answers(records, "resident:A03")).toEqual(["ok · 1 points to Rook · your balance: 9 · receipt R-0002", "ok · 2 points to Rook · your balance: 7 · receipt R-0003"]);
		expect(answers(records, "resident:A02")).toEqual(["ok · 13 points to Mira · your balance: 3 · receipt R-0004"]);
		// Ids stay the keys of the events.
		expect(written(run.events).filter(([type]) => type === "transfer")).toEqual([
			["transfer", { from: "A01", to: "A02", amount: 3, memo: "thanks", txId: "TX5" }],
			["transfer", { from: "A03", to: "A02", amount: 1, memo: "hello", txId: "TX6" }],
			["transfer", { from: "A03", to: "A02", amount: 2, memo: "", txId: "TX7" }],
			["transfer", { from: "A02", to: "A01", amount: 13, memo: "", txId: "TX8" }],
		]);
		expect(run.kernel.fact("ledger.balances")).toEqual({ A01: 20, A02: 3, A03: 7, A04: 10 });
	});

	it("asks for the receipt after the step that writes transfer: a provider that only issues in its listener is too late", async () => {
		const records: CallRecord[] = [];
		const run = await play(ledgerGame(providers(false)), { ticks: 1, drivers: { resident: scriptedDriver(plan, records) } });
		expect(answers(records, "resident:A01")[0]).toBe("ok · 3 points to Rook · your balance: 7 · receipt none");
		// The receipt is issued all the same, after `transfer` and before the call's result, as the old immediate listener did.
		const types = run.events.map((event) => event.type);
		const at = types.indexOf("transfer");
		expect(types.slice(at, at + 3)).toEqual(["transfer", "receipt_issued", "tool_result"]);
	});

	it("is deterministic and survives snapshot round trips with the providers", async () => {
		expect(await checkDeterminism(ledgerGame(providers()), () => scriptedDriver(plan))).toEqual([]);
		for (const cut of [1, 2]) expect(await checkSnapshotRoundTrip(ledgerGame(providers()), () => scriptedDriver(plan), cut)).toEqual([]);
	});
});

describe("the cap on direct messages", () => {
	it("refuses a memo past the window of channels, not a transfer without one, and only after the ledger's own refusals", async () => {
		const records: CallRecord[] = [];
		const capped = (turn: Activation): readonly PlannedCall[] => (turn.tick === 0 && turn.actor === "resident:A03" ? [give("A02", 1, "hello"), give("A02", 2), give("A02", 50, "too much"), give("A04", 1, "late")] : []);
		await play(ledgerGame([exileStandIn(["A04"]), window()]), { ticks: 1, drivers: { resident: scriptedDriver(capped, records) } });
		expect(answers(records, "resident:A03")).toEqual([
			"DM_LIMIT: 8 DMs and memos sent since minute 0; send a memo again from minute 4, or transfer without one",
			"ok · 2 points to A02 · your balance: 8 · receipt none",
			"INSUFFICIENT_FUNDS: ",
			"EXILED: A04 was exiled",
		]);
	});
});
