import { describe, expect, it } from "vitest";
import { LedgerError, PointsLedger, SYSTEM_ACCOUNT, type LedgerEntry } from "../../src/core/ledger.ts";

function ledgerWith(...accounts: readonly string[]): PointsLedger {
	const ledger = new PointsLedger();
	for (const account of accounts) ledger.open(account);
	return ledger;
}

function codeOf(action: () => void): string | undefined {
	try {
		action();
	} catch (error) {
		if (error instanceof LedgerError) return error.code;
		throw error;
	}
	return undefined;
}

describe("PointsLedger", () => {
	it("transfers atomically and stays zero-sum", () => {
		const ledger = ledgerWith("A01", "A02");
		ledger.mint("A01", 15, "start points", 0);
		ledger.transfer("A01", "A02", 4, "deal", 3);
		expect(ledger.balance("A01")).toBe(11);
		expect(ledger.balance("A02")).toBe(4);
		expect(ledger.balance(SYSTEM_ACCOUNT)).toBe(-15);
		expect(ledger.total()).toBe(0);
	});

	it("rejects transfers without cover and leaves balances unchanged", () => {
		const ledger = ledgerWith("A01", "A02");
		ledger.mint("A01", 3, "start", 0);
		expect(codeOf(() => ledger.transfer("A01", "A02", 4, "too much", 0))).toBe("INSUFFICIENT_FUNDS");
		expect(ledger.balance("A01")).toBe(3);
		expect(ledger.balance("A02")).toBe(0);
	});

	it("lets penalties push a balance below zero", () => {
		const ledger = ledgerWith("A01");
		ledger.mint("A01", 3, "start", 0);
		ledger.burn("A01", 5, "wrong code", 1);
		expect(ledger.balance("A01")).toBe(-2);
		expect(ledger.total()).toBe(0);
	});

	it("books exactly once per idempotency key", () => {
		const ledger = ledgerWith("A01", "A02");
		ledger.mint("A01", 10, "start", 0);
		const first = ledger.transfer("A01", "A02", 4, "deal", 2, { idempotencyKey: "tx-1" });
		const second = ledger.transfer("A01", "A02", 4, "deal", 2, { idempotencyKey: "tx-1" });
		expect(second.txId).toBe(first.txId);
		expect(ledger.balance("A02")).toBe(4);
	});

	it("rejects invalid amounts, self transfers and unknown accounts", () => {
		const ledger = ledgerWith("A01");
		ledger.mint("A01", 10, "start", 0);
		expect(codeOf(() => ledger.transfer("A01", "A01", 1, "self", 0))).toBe("SAME_ACCOUNT");
		expect(codeOf(() => ledger.transfer("A01", "A02", 1, "nobody", 0))).toBe("UNKNOWN_ACCOUNT");
		expect(codeOf(() => ledger.mint("A01", 0, "zero", 0))).toBe("INVALID_AMOUNT");
		expect(codeOf(() => ledger.mint("A01", 1.5, "fraction", 0))).toBe("INVALID_AMOUNT");
	});

	it("reports every entry to its listener", () => {
		const seen: LedgerEntry[] = [];
		const ledger = new PointsLedger((entry) => seen.push(entry));
		ledger.open("A01");
		ledger.mint("A01", 5, "reward", 2);
		expect(seen).toEqual([
			{ txId: "TX1", debit: SYSTEM_ACCOUNT, credit: "A01", amount: 5, reason: "reward", minute: 2 },
		]);
	});
});
