// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Double-entry points ledger: the old kernel's `PointsLedger`, carried from the old platform
 * (`test/core/points-ledger.ts`) as the reference the differential test books against. Two changes of form only: the
 * constructor of `LedgerError` has no parameter property, and the first checks of `transfer` moved into `#check`.
 *
 * Invariant: transfers between accounts are zero-sum. Rewards and penalties
 * flow through {@link SYSTEM_ACCOUNT}, which may go negative. The sum of all
 * balances is always 0.
 */

export const SYSTEM_ACCOUNT = "SYSTEM_MINT_BURN";
export type AccountId = string;

export interface LedgerEntry {
	readonly txId: string;
	readonly debit: AccountId;
	readonly credit: AccountId;
	readonly amount: number;
	readonly reason: string;
	readonly minute: number;
	readonly idempotencyKey?: string;
}

export type LedgerErrorCode = "INVALID_AMOUNT" | "SAME_ACCOUNT" | "INSUFFICIENT_FUNDS" | "UNKNOWN_ACCOUNT";

/** Every balance and entry of a ledger, for run snapshots (SPEC 17). */
export interface LedgerSnapshot {
	readonly balances: readonly { readonly account: AccountId; readonly balance: number }[];
	readonly entries: readonly LedgerEntry[];
	readonly txSeq: number;
}

export class LedgerError extends Error {
	override readonly name = "LedgerError";
	readonly code: LedgerErrorCode;

	constructor(code: LedgerErrorCode, message: string) {
		super(message);
		this.code = code;
	}
}

export interface TransferOptions {
	/** Allows the debited account to go negative (penalties, system account). */
	readonly allowNegativeDebit?: boolean;
	/** Repeated calls with the same key book exactly once. */
	readonly idempotencyKey?: string;
}

export class PointsLedger {
	readonly #balances = new Map<AccountId, number>();
	readonly #entries: LedgerEntry[] = [];
	readonly #byIdempotencyKey = new Map<string, LedgerEntry>();
	readonly #onEntry: ((entry: LedgerEntry) => void) | undefined;
	#txSeq = 0;

	constructor(onEntry?: (entry: LedgerEntry) => void) {
		this.#onEntry = onEntry;
		this.#balances.set(SYSTEM_ACCOUNT, 0);
	}

	/** Opens an account with balance 0; an existing account is left untouched. */
	open(account: AccountId): void {
		if (!this.#balances.has(account)) this.#balances.set(account, 0);
	}

	has(account: AccountId): boolean {
		return this.#balances.has(account);
	}

	balance(account: AccountId): number {
		return this.#balances.get(account) ?? 0;
	}

	entries(): readonly LedgerEntry[] {
		return this.#entries;
	}

	snapshot(): LedgerSnapshot {
		return {
			balances: [...this.#balances].map(([account, balance]) => ({ account, balance })),
			entries: [...this.#entries],
			txSeq: this.#txSeq,
		};
	}

	/** Replaces every balance and entry with a snapshot's; emits nothing. Throws when the snapshot breaks zero-sum. */
	restore(state: LedgerSnapshot): void {
		const sum = state.balances.reduce((total, entry) => total + entry.balance, 0);
		if (sum !== 0) throw new LedgerError("INVALID_AMOUNT", `Snapshot balances sum to ${sum}, not 0`);
		this.#balances.clear();
		this.#entries.length = 0;
		this.#byIdempotencyKey.clear();
		for (const entry of state.balances) this.#balances.set(entry.account, entry.balance);
		if (!this.#balances.has(SYSTEM_ACCOUNT)) this.#balances.set(SYSTEM_ACCOUNT, 0);
		for (const entry of state.entries) {
			this.#entries.push(entry);
			if (entry.idempotencyKey !== undefined) this.#byIdempotencyKey.set(entry.idempotencyKey, entry);
		}
		this.#txSeq = state.txSeq;
	}

	/** Sum of all balances; always 0. */
	total(): number {
		let sum = 0;
		for (const amount of this.#balances.values()) sum += amount;
		return sum;
	}

	#check(debit: AccountId, credit: AccountId, amount: number): void {
		if (!Number.isInteger(amount) || amount <= 0) {
			throw new LedgerError("INVALID_AMOUNT", `Amount must be a positive integer, got ${amount}`);
		}
		if (debit === credit) throw new LedgerError("SAME_ACCOUNT", "Debit and credit must differ");
		for (const account of [debit, credit]) {
			if (!this.#balances.has(account)) throw new LedgerError("UNKNOWN_ACCOUNT", `Unknown account: ${account}`);
		}
	}

	transfer(
		debit: AccountId,
		credit: AccountId,
		amount: number,
		reason: string,
		minute: number,
		options: TransferOptions = {},
	): LedgerEntry {
		this.#check(debit, credit, amount);

		const key = options.idempotencyKey;
		if (key !== undefined) {
			const previous = this.#byIdempotencyKey.get(key);
			if (previous !== undefined) return previous;
		}

		const available = this.balance(debit);
		if (available < amount && options.allowNegativeDebit !== true) {
			throw new LedgerError("INSUFFICIENT_FUNDS", `Insufficient funds: ${available} < ${amount}`);
		}

		this.#txSeq += 1;
		const entry: LedgerEntry = {
			txId: `TX${this.#txSeq}`,
			debit,
			credit,
			amount,
			reason,
			minute,
			...(key === undefined ? {} : { idempotencyKey: key }),
		};

		this.#balances.set(debit, available - amount);
		this.#balances.set(credit, this.balance(credit) + amount);
		this.#entries.push(entry);
		if (key !== undefined) this.#byIdempotencyKey.set(key, entry);
		this.#onEntry?.(entry);
		return entry;
	}

	/** Creates points from the system account (start points, rewards). */
	mint(account: AccountId, amount: number, reason: string, minute: number): LedgerEntry {
		return this.transfer(SYSTEM_ACCOUNT, account, amount, reason, minute, { allowNegativeDebit: true });
	}

	/** Destroys points into the system account (penalties); the balance may go negative. */
	burn(account: AccountId, amount: number, reason: string, minute: number): LedgerEntry {
		return this.transfer(account, SYSTEM_ACCOUNT, amount, reason, minute, { allowNegativeDebit: true });
	}
}
