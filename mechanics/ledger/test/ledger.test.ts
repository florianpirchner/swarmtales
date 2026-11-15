// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The ledger mechanic: the transfer tool's checks and replies as the old platform gave them (check order, codes,
 * texts), the events, the service, the limit `zero-sum` and the conformance checks. Ported from the old
 * `test/mechanics/ledger/ledger.test.ts`, played without the providers of `identity` and `receipt-source` (ids stay,
 * the receipt is `none`); `providers.test.ts` plays the names, the receipt and the cap on direct messages. The golden
 * gate is the oracle proof (`oracle.test.ts`); the legacy snapshot has no counterpart on this platform.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Activation } from "@swarmtales/contracts";
import { defineHead, defineMechanic } from "@swarmtales/sdk";
import { checkDeterminism, checkOptionsDocumented, checkPackage, checkSnapshotRoundTrip, play, scriptedDriver, testKernel, type CallRecord, type PlannedCall } from "@swarmtales/testkit";
import { LedgerService, SYSTEM_ACCOUNT } from "../src/contract.ts";
import { ledger } from "../src/index.ts";
import { ledgerGame, total, written } from "./support.ts";

const give = (target: string, amount: number, memo?: string): PlannedCall => ({ tool: "transferPoints", params: memo === undefined ? { target, amount } : { target, amount, memo } });
const plan = (turn: Activation): readonly PlannedCall[] => {
	if (turn.tick === 0 && turn.actor === "resident:A01") return [give("A02", 3, "thanks"), give("A01", 1), give("Z99", 1), give("A04", 1), give("A02", 1, "code 559 102"), give("A02", 50)];
	if (turn.tick === 0 && turn.actor === "resident:A03") return [give("A02", 1, "hello"), give("A02", 2)];
	if (turn.tick === 1 && turn.actor === "resident:A02") return [give("A01", 13)];
	return [];
};

describe("transferPoints", () => {
	it("books the transfer, writes ledger_entry then transfer, and refuses in the old order", async () => {
		const records: CallRecord[] = [];
		const run = await play(ledgerGame(), { drivers: { resident: scriptedDriver(plan, records) } });
		const answers = records.filter((record) => record.actor === "resident:A01").map((record) => (record.outcome.ok ? record.outcome.reply : `${record.outcome.code}: ${record.outcome.detail ?? ""}`));
		expect(answers).toEqual([
			"ok · 3 points to A02 · your balance: 7 · receipt none",
			"SELF_TRANSFER: ",
			"UNKNOWN_AGENT: Z99",
			"EXILED: A04 was exiled",
			"MEMO_DIGITS: memos may not carry numbers of 4+ digits; send codes by message",
			"INSUFFICIENT_FUNDS: ",
		]);
		expect(written(run.events)).toEqual([
			["ledger_entry", { txId: "TX5", debit: "A01", credit: "A02", amount: 3, reason: "thanks" }],
			["transfer", { from: "A01", to: "A02", amount: 3, memo: "thanks", txId: "TX5" }],
			["ledger_entry", { txId: "TX6", debit: "A03", credit: "A02", amount: 1, reason: "hello" }],
			["transfer", { from: "A03", to: "A02", amount: 1, memo: "hello", txId: "TX6" }],
			// A transfer without a memo is booked as `transfer`.
			["ledger_entry", { txId: "TX7", debit: "A03", credit: "A02", amount: 2, reason: "transfer" }],
			["transfer", { from: "A03", to: "A02", amount: 2, memo: "", txId: "TX7" }],
			["ledger_entry", { txId: "TX8", debit: "A02", credit: "A01", amount: 13, reason: "transfer" }],
			["transfer", { from: "A02", to: "A01", amount: 13, memo: "", txId: "TX8" }],
		]);
		expect(run.kernel.fact("ledger.balances")).toEqual({ A01: 10 - 3 + 13, A02: 10 + 3 + 2 - 13 + 1, A03: 7, A04: 10 });
		expect(run.kernel.fact("ledger.entries")).toBe(8);
		expect(run.end).toMatchObject({ reason: "ticks" });
	});

	it("keeps the limit zero-sum after every call, refused or not", async () => {
		const test = testKernel(ledgerGame());
		expect(total(test.kernel)).toBe(0);
		for (const call of [give("A02", 3, "thanks"), give("A01", 1), give("A04", 1), give("A02", 50), give("A03", 7)]) {
			await test.call("A01", call.tool, call.params);
			expect(total(test.kernel)).toBe(0);
		}
		expect(test.fact("ledger.balances")).toEqual({ A01: 0, A02: 13, A03: 17, A04: 10 });
	});

	it("tells every resident its points in the status line", async () => {
		const seen: string[] = [];
		await play(ledgerGame([]), { ticks: 1, drivers: { resident: (turn) => (seen.push(turn.inputs.map((line) => `${line.kind}|${line.text}`).join()), Promise.resolve()) } });
		expect(seen).toEqual(["status|10 points", "status|10 points", "status|10 points", "status|10 points"]);
	});

	it("is deterministic, survives snapshot round trips and conforms", async () => {
		expect(await checkDeterminism(ledgerGame(), () => scriptedDriver(plan))).toEqual([]);
		for (const cut of [1, 2]) expect(await checkSnapshotRoundTrip(ledgerGame(), () => scriptedDriver(plan), cut)).toEqual([]);
		expect(checkOptionsDocumented(ledger)).toEqual([]);
		expect(checkPackage(ledger, JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")))).toEqual([]);
	});

	it("carries the three prompt texts of the old platform; only the ids and one retired word differ", () => {
		// The sha256 of the old files `library/prompts/tools/transferPoints.md`, `library/prompts/replies/transfer-ok.md`
		// and `mechanics/ledger/prompts/competitor/status/points.md`.
		const old: readonly (readonly [string, string, string])[] = [
			["ledger/tools/transferPoints", "tools/transferPoints", "6404a08a54456e8b1cdcc355481b218c076943baae8d4e57cd10be2631a84ceb"],
			["ledger/replies/transfer-ok", "replies/transfer-ok", "7860546194ec7d4b770943f875403723af900123d8b15405a68dcf846d238b24"],
			["ledger/status/points", "competitor/status/points", "14ec0ecc18e79b65844c4735f8a45b94753259c033050af0d50c36f37abeb8e3"],
		];
		for (const [id, oldId, sha256] of old) {
			const text = readFileSync(new URL(`../prompts/${id}.md`, import.meta.url), "utf8").replace(`id: ${id}`, `id: ${oldId}`).replace("another resident", "another competitor");
			expect([id, createHash("sha256").update(text).digest("hex")]).toEqual([id, sha256]);
		}
		expect(Object.keys(ledger.head.prompts).sort()).toEqual(old.map(([id]) => id).sort());
		expect(ledger.head.tools.map((tool) => [tool.name, tool.description, tool.for])).toEqual([["transferPoints", "ledger/tools/transferPoints", ["resident"]]]);
	});
});

describe("the ledger service", () => {
	// Books through the service when the run starts, after the ledger minted the start points (TX1 to TX4).
	function booked(strictAccounts: boolean) {
		const seen: unknown[] = [];
		const probe = defineMechanic(defineHead({ id: "probe", package: "@test/probe", summary: "Test: books through the ledger service.", requires: [LedgerService] }), {
			hooks: {
				runStarted: {
					after: ["ledger"],
					run: (ctx) => {
						const move = (amount: number, idempotencyKey?: string) => ctx.call(LedgerService, "move", { from: "A01", to: "ESCROW:X", amount, reason: "escrow", ...(idempotencyKey === undefined ? {} : { idempotencyKey }) });
						seen.push(ctx.call(LedgerService, "has", { account: "ESCROW:X" }));
						try {
							ctx.call(LedgerService, "mint", { account: "ESCROW:X", amount: 1, reason: "unopened" });
							seen.push("booked");
						} catch (error) {
							seen.push(error instanceof Error ? error.message : "other");
						}
						ctx.call(LedgerService, "open", { account: "ESCROW:X" });
						seen.push(ctx.call(LedgerService, "has", { account: "ESCROW:X" }));
						for (let repeat = 0; repeat < 2; repeat++) ctx.call(LedgerService, "mint", { account: "A01", amount: 5, reason: "reward", idempotencyKey: "k1" });
						ctx.call(LedgerService, "burn", { account: "A02", amount: 15, reason: "fine" });
						seen.push(move(100), move(4, "m1"), move(4, "m1"), ctx.call(LedgerService, "balance", { account: "ESCROW:X" }), ctx.call(LedgerService, "balance", { account: SYSTEM_ACCOUNT }), ctx.call(LedgerService, "balances", {}));
					},
				},
			},
		});
		const test = testKernel(ledgerGame([probe()], { strictAccounts }));
		return { seen, test, events: written(test.kernel.log.all()) };
	}

	it("opens accounts, mints and burns past zero, moves without overdraft and books once per key", () => {
		const { seen, test, events } = booked(true);
		// A throw of the book is a bug of the calling mechanic: the kernel reports it as SWT-R003.
		expect(seen).toEqual([false, expect.stringContaining("SWT-R003: ledger: Unknown account: ESCROW:X"), true, { ok: false, code: "INSUFFICIENT_FUNDS" }, { ok: true, txId: "TX7" }, { ok: true, txId: "TX7" }, 4, -30, { A01: 11, A02: -5, A03: 10, A04: 10 }]);
		expect(events).toEqual([
			["ledger_entry", { txId: "TX5", debit: SYSTEM_ACCOUNT, credit: "A01", amount: 5, reason: "reward" }],
			["ledger_entry", { txId: "TX6", debit: "A02", credit: SYSTEM_ACCOUNT, amount: 15, reason: "fine" }],
			["ledger_entry", { txId: "TX7", debit: "A01", credit: "ESCROW:X", amount: 4, reason: "escrow" }],
		]);
		expect(total(test.kernel)).toBe(0);
	});

	it("lets the first booking open an account when strictAccounts is off", () => {
		const { seen, test } = booked(false);
		expect(seen.slice(0, 3)).toEqual([false, "booked", true]);
		expect(total(test.kernel)).toBe(0);
	});
});
