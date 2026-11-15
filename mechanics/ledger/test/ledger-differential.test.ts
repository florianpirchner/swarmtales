// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Differential test of the ledger's book against the old kernel's `PointsLedger` (carried in
 * `old-points-ledger.ts`): random bookings, every error code, idempotency keys, strict accounts, the snapshot and
 * its zero-sum check. Ported from the old `test/mechanics/ledger/ledger-differential.test.ts`; its second half
 * played `transferPoints` against the old `World`, which is not carried, so `ledger.test.ts` holds those cases.
 */
import { describe, expect, it } from "vitest";
import { book, LedgerError as NewLedgerError, restored, SYSTEM_ACCOUNT, type LedgerState } from "../src/index.ts";
import { LedgerError, PointsLedger } from "./old-points-ledger.ts";

/** A small deterministic generator, so a failing sequence can be replayed. */
function lcg(seed: number): () => number {
	let state = seed;
	return () => {
		state = (state * 1664525 + 1013904223) % 4294967296;
		return state / 4294967296;
	};
}

const ACCOUNTS = ["A01", "A02", "A03", "ESCROW:X", "GROUP:G1", "NOWHERE"] as const;
// The new entry names its time `tick`; the old one `minute`.
const oldShape = (entry: { readonly tick: number }): unknown => JSON.parse(JSON.stringify(entry).replace('"tick":', '"minute":'));

// The code of the error a booking throws, or undefined when it books.
function codeOf(kind: typeof LedgerError | typeof NewLedgerError, run: () => unknown): string | undefined {
	try {
		run();
		return undefined;
	} catch (error) {
		return error instanceof kind ? error.code : "other";
	}
}

function freshState(): LedgerState {
	return { balances: new Map<string, number>([[SYSTEM_ACCOUNT, 0], ["A01", 0], ["A02", 0], ["A03", 0], ["ESCROW:X", 0], ["GROUP:G1", 0]]), entries: [], keys: new Map(), txSeq: 0 };
}

describe("the book against PointsLedger", () => {
	it.each([1, 2, 3, 4, 5])("books 300 random bookings alike (seed %i): same entries, same errors, same snapshot", (seed) => {
		const random = lcg(seed);
		const state = freshState();
		const written: unknown[] = [];
		const oldWritten: unknown[] = [];
		const oldBook = new PointsLedger((entry) => oldWritten.push({ ...entry }));
		for (const account of ACCOUNTS.slice(0, 5)) oldBook.open(account);
		for (let step = 0; step < 300; step++) {
			const pick = (): string => ACCOUNTS[Math.floor(random() * ACCOUNTS.length)] ?? "A01";
			const debit = random() < 0.3 ? SYSTEM_ACCOUNT : pick();
			const credit = random() < 0.3 ? SYSTEM_ACCOUNT : pick();
			const amount = Math.floor(random() * 9) - 1 + (random() < 0.1 ? 0.5 : 0);
			const allowNegative = random() < 0.4;
			const key = random() < 0.25 ? `k${String(Math.floor(random() * 6))}` : undefined;
			const options = key === undefined ? {} : { idempotencyKey: key };
			const oldCode = codeOf(LedgerError, () => oldBook.transfer(debit, credit, amount, `r${String(step)}`, step, { allowNegativeDebit: allowNegative, ...options }));
			const newCode = codeOf(NewLedgerError, () => book(state, debit, credit, amount, `r${String(step)}`, step, { allowNegative, strict: true, ...options }, (entry) => written.push(oldShape(entry))));
			expect(newCode, `step ${String(step)}`).toBe(oldCode);
			expect([...state.balances.values()].reduce((sum, balance) => sum + balance, 0), `step ${String(step)}`).toBe(0);
		}
		expect(written.length).toBeGreaterThan(50);
		expect(written).toEqual(oldWritten);
		const snapshot = oldBook.snapshot();
		expect([...state.balances].map(([account, balance]) => ({ account, balance }))).toEqual(snapshot.balances);
		expect(state.entries.map(oldShape)).toEqual(snapshot.entries.map((entry) => ({ ...entry })));
		expect(state.txSeq).toBe(snapshot.txSeq);
		// The snapshot round trip keeps the order of the accounts and the idempotency keys.
		const again = restored({ balances: snapshot.balances, entries: state.entries, txSeq: snapshot.txSeq });
		expect([...again.balances.keys()]).toEqual(snapshot.balances.map((entry) => entry.account));
		expect(again.keys.size).toBe(state.keys.size);
	});

	it("restores in the saved order, adds a missing system account last and refuses a snapshot that is not zero-sum (old restore)", () => {
		const data = { balances: [{ account: "A01", balance: 5 }, { account: SYSTEM_ACCOUNT, balance: -5 }, { account: "ESCROW:X", balance: 0 }], entries: [], txSeq: 0 };
		expect([...restored(data).balances.keys()]).toEqual(["A01", SYSTEM_ACCOUNT, "ESCROW:X"]);
		const withoutSystem = restored({ ...data, balances: [{ account: "A01", balance: 0 }] });
		expect([...withoutSystem.balances.keys()]).toEqual(["A01", SYSTEM_ACCOUNT]);
		const broken = { ...data, balances: [{ account: "A01", balance: 5 }] };
		expect(() => restored(broken)).toThrow(/sum to 5, not 0/);
		expect(() => {
			new PointsLedger().restore(broken);
		}).toThrow(/sum to 5, not 0/);
	});
});
