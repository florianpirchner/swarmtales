// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The double-entry bookkeeping of the ledger, carried from the old platform (`mechanics/ledger/src/book.ts`, there a
 * copy of the old kernel's `PointsLedger`) as functions over the mechanic's state. Rewards and penalties flow through
 * the system account, which may go negative; the sum of all balances is always 0. The checks and their order are the
 * old ones: amount, same account, unknown account, the idempotency key, the funds.
 */

/**
 * The account that points are minted from and burned into; it holds the minus of every point in play.
 *
 * @public
 */
export const SYSTEM_ACCOUNT = "SYSTEM_MINT_BURN";

/**
 * One booking of the ledger: `debit` pays `credit`.
 *
 * @public
 */
export interface LedgerEntry {
	/** The id of the booking: `TX1`, `TX2`, in the order booked. */
	readonly txId: string;
	/** The account that pays. */
	readonly debit: string;
	/** The account that receives. */
	readonly credit: string;
	/** The points booked, a positive integer. */
	readonly amount: number;
	/** Why the booking was made. */
	readonly reason: string;
	/** The tick of the booking. */
	readonly tick: number;
	/** The key the booking was made under; a repeated key books nothing. */
	readonly idempotencyKey?: string;
}

/**
 * The state of the ledger in a run.
 *
 * @public
 */
export interface LedgerState {
	/** The points of every open account, in the order the accounts were opened. */
	readonly balances: Map<string, number>;
	/** Every booking, in order. */
	readonly entries: LedgerEntry[];
	/** The entry each idempotency key booked; a repeated key books nothing. */
	readonly keys: Map<string, LedgerEntry>;
	/** The number of the last booking. */
	txSeq: number;
}

/**
 * Why a booking was refused as a bug of its caller.
 *
 * @public
 */
export type LedgerErrorCode = "INVALID_AMOUNT" | "SAME_ACCOUNT" | "INSUFFICIENT_FUNDS" | "UNKNOWN_ACCOUNT";

/**
 * What the book throws: a bug of the calling mechanic, never a refusal to a resident.
 *
 * @public
 */
export class LedgerError extends Error {
	/** The name of the error class. */
	override readonly name = "LedgerError";
	/** Why the booking was refused. */
	readonly code: LedgerErrorCode;

	/**
	 * Creates the error of one refused booking.
	 *
	 * @param code - Why the booking was refused.
	 * @param message - The text for the developer.
	 */
	constructor(code: LedgerErrorCode, message: string) {
		super(message);
		this.code = code;
	}
}

/**
 * How one booking is made.
 *
 * @public
 */
export interface BookOptions {
	/** Allows the debited account to go negative (penalties, the system account). */
	readonly allowNegative: boolean;
	/** Repeated calls with the same key book exactly once. */
	readonly idempotencyKey?: string | undefined;
	/** Refuses an account nobody opened (`UNKNOWN_ACCOUNT`); otherwise the first booking opens it. */
	readonly strict: boolean;
}

/**
 * A run of 4 or more digits in a transfer memo, also when spaces, dashes, dots, commas, slashes or underscores
 * separate them ("559 102"). Memos may not carry codes: a receipt would make them verified by the city.
 */
const MEMO_DIGIT_RUN = /\d(?:[\s\-.,_/]*\d){3}/;

/**
 * Says whether a memo carries a number of 4 or more digits.
 *
 * @param memo - The memo of a transfer.
 * @returns True when the memo holds such a run of digits.
 *
 * @public
 */
export function memoCarriesDigits(memo: string): boolean {
	return MEMO_DIGIT_RUN.test(memo);
}

/**
 * Reads the points of an account.
 *
 * @param state - The state of the ledger.
 * @param account - The account.
 * @returns Its balance; 0 for an account nobody opened.
 *
 * @public
 */
export function balanceOf(state: LedgerState, account: string): number {
	return state.balances.get(account) ?? 0;
}

// The checks that come before the idempotency key: the amount, the two accounts, and with `strict` that both are open.
function checkAccounts(state: LedgerState, debit: string, credit: string, amount: number, strict: boolean): void {
	if (!Number.isInteger(amount) || amount <= 0) throw new LedgerError("INVALID_AMOUNT", `Amount must be a positive integer, got ${String(amount)}`);
	if (debit === credit) throw new LedgerError("SAME_ACCOUNT", "Debit and credit must differ");
	if (!strict) return;
	for (const account of [debit, credit]) {
		if (!state.balances.has(account)) throw new LedgerError("UNKNOWN_ACCOUNT", `Unknown account: ${account}`);
	}
}

/**
 * Books `amount` from `debit` to `credit` and tells `written` the entry (not for a repeated key).
 *
 * @param state - The state of the ledger; it is changed.
 * @param debit - The account that pays.
 * @param credit - The account that receives.
 * @param amount - The points, a positive integer.
 * @param reason - Why the booking is made.
 * @param tick - The tick of the booking.
 * @param options - Whether the payer may go negative, the idempotency key, strict accounts.
 * @param written - Called with the new entry.
 * @returns The entry, or the first entry of a repeated key.
 * @throws LedgerError `INVALID_AMOUNT`, `SAME_ACCOUNT`, `UNKNOWN_ACCOUNT` or `INSUFFICIENT_FUNDS`, checked in this order.
 *
 * @public
 */
export function book(state: LedgerState, debit: string, credit: string, amount: number, reason: string, tick: number, options: BookOptions, written: (entry: LedgerEntry) => void): LedgerEntry {
	checkAccounts(state, debit, credit, amount, options.strict);
	const key = options.idempotencyKey;
	if (key !== undefined) {
		const previous = state.keys.get(key);
		if (previous !== undefined) return previous;
	}
	const available = balanceOf(state, debit);
	if (available < amount && !options.allowNegative) throw new LedgerError("INSUFFICIENT_FUNDS", `Insufficient funds: ${String(available)} < ${String(amount)}`);
	state.txSeq += 1;
	const entry: LedgerEntry = { txId: `TX${String(state.txSeq)}`, debit, credit, amount, reason, tick, ...(key === undefined ? {} : { idempotencyKey: key }) };
	state.balances.set(debit, available - amount);
	state.balances.set(credit, balanceOf(state, credit) + amount);
	state.entries.push(entry);
	if (key !== undefined) state.keys.set(key, entry);
	written(entry);
	return entry;
}

/**
 * Builds the state from a snapshot slice: balances in the saved order, the system account last when the slice lacks it.
 *
 * @param data - The saved slice.
 * @param data.balances - The balance of every account, in the saved order.
 * @param data.entries - Every booking.
 * @param data.txSeq - The number of the last booking.
 * @returns The state, with the idempotency keys rebuilt from the entries.
 * @throws LedgerError `INVALID_AMOUNT` when the balances do not add up to 0.
 *
 * @public
 */
export function restored(data: { readonly balances: readonly { readonly account: string; readonly balance: number }[]; readonly entries: readonly LedgerEntry[]; readonly txSeq: number }): LedgerState {
	const sum = data.balances.reduce((total, entry) => total + entry.balance, 0);
	if (sum !== 0) throw new LedgerError("INVALID_AMOUNT", `Snapshot balances sum to ${String(sum)}, not 0`);
	const balances = new Map<string, number>(data.balances.map((entry): [string, number] => [entry.account, entry.balance]));
	if (!balances.has(SYSTEM_ACCOUNT)) balances.set(SYSTEM_ACCOUNT, 0);
	const entries = data.entries.map((entry) => ({ ...entry }));
	const keys = new Map<string, LedgerEntry>(entries.flatMap((entry): [string, LedgerEntry][] => (entry.idempotencyKey === undefined ? [] : [[entry.idempotencyKey, entry]])));
	return { balances, entries, keys, txSeq: data.txSeq };
}
