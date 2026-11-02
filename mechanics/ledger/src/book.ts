/**
 * The double-entry bookkeeping, copied from packages/kernel/src/ledger.ts (`PointsLedger`) as
 * functions over the mechanic's state. Rewards and penalties flow through the system account,
 * which may go negative; the sum of all balances is always 0. The checks and their order are the
 * old class's: amount, same account, unknown account, the idempotency key, the funds.
 */

export const SYSTEM_ACCOUNT = "SYSTEM_MINT_BURN";

export interface LedgerEntry {
	readonly txId: string;
	readonly debit: string;
	readonly credit: string;
	readonly amount: number;
	readonly reason: string;
	readonly minute: number;
	readonly idempotencyKey?: string;
}

export interface LedgerState {
	readonly balances: Map<string, number>;
	readonly entries: LedgerEntry[];
	/** The entry each idempotency key booked; a repeated key books nothing. */
	readonly keys: Map<string, LedgerEntry>;
	txSeq: number;
}

export type LedgerErrorCode = "INVALID_AMOUNT" | "SAME_ACCOUNT" | "INSUFFICIENT_FUNDS" | "UNKNOWN_ACCOUNT";

/** What the old class threw (`LedgerError`): a bug of the caller, never a refusal to a resident. */
export class LedgerError extends Error {
	override readonly name = "LedgerError";

	constructor(
		readonly code: LedgerErrorCode,
		message: string,
	) {
		super(message);
	}
}

export interface BookOptions {
	/** Allows the debited account to go negative (penalties, the system account). */
	readonly allowNegative: boolean;
	/** Repeated calls with the same key book exactly once. */
	readonly idempotencyKey?: string | undefined;
	/** Refuses an account nobody opened (old `UNKNOWN_ACCOUNT`); otherwise the first booking opens it. */
	readonly strict: boolean;
}

/**
 * A run of 4 or more digits in a transfer memo, also when spaces, dashes, dots, commas, slashes or
 * underscores separate them ("559 102"). Memos may not carry codes: a receipt would make them
 * city-verified (SPEC 6).
 */
const MEMO_DIGIT_RUN = /\d(?:[\s\-.,_/]*\d){3}/;

export function memoCarriesDigits(memo: string): boolean {
	return MEMO_DIGIT_RUN.test(memo);
}

export function balanceOf(state: LedgerState, account: string): number {
	return state.balances.get(account) ?? 0;
}

/** Books `amount` from `debit` to `credit` and tells `written` the entry (not for a repeated key). */
export function book(state: LedgerState, debit: string, credit: string, amount: number, reason: string, minute: number, options: BookOptions, written: (entry: LedgerEntry) => void): LedgerEntry {
	if (!Number.isInteger(amount) || amount <= 0) throw new LedgerError("INVALID_AMOUNT", `Amount must be a positive integer, got ${String(amount)}`);
	if (debit === credit) throw new LedgerError("SAME_ACCOUNT", "Debit and credit must differ");
	if (options.strict) {
		for (const account of [debit, credit]) {
			if (!state.balances.has(account)) throw new LedgerError("UNKNOWN_ACCOUNT", `Unknown account: ${account}`);
		}
	}
	const key = options.idempotencyKey;
	if (key !== undefined) {
		const previous = state.keys.get(key);
		if (previous !== undefined) return previous;
	}
	const available = balanceOf(state, debit);
	if (available < amount && !options.allowNegative) throw new LedgerError("INSUFFICIENT_FUNDS", `Insufficient funds: ${String(available)} < ${String(amount)}`);
	state.txSeq += 1;
	const entry: LedgerEntry = { txId: `TX${String(state.txSeq)}`, debit, credit, amount, reason, minute, ...(key === undefined ? {} : { idempotencyKey: key }) };
	state.balances.set(debit, available - amount);
	state.balances.set(credit, balanceOf(state, credit) + amount);
	state.entries.push(entry);
	if (key !== undefined) state.keys.set(key, entry);
	written(entry);
	return entry;
}

/** The state of a snapshot: balances in the saved order (the system account last when the file lacks it); throws when they do not add up to 0 (old `restore`). */
export function restored(data: { readonly balances: readonly { readonly account: string; readonly balance: number }[]; readonly entries: readonly LedgerEntry[]; readonly txSeq: number }): LedgerState {
	const sum = data.balances.reduce((total, entry) => total + entry.balance, 0);
	if (sum !== 0) throw new LedgerError("INVALID_AMOUNT", `Snapshot balances sum to ${String(sum)}, not 0`);
	const balances = new Map<string, number>(data.balances.map((entry): [string, number] => [entry.account, entry.balance]));
	if (!balances.has(SYSTEM_ACCOUNT)) balances.set(SYSTEM_ACCOUNT, 0);
	const entries = data.entries.map((entry) => ({ ...entry }));
	const keys = new Map<string, LedgerEntry>(entries.flatMap((entry): [string, LedgerEntry][] => (entry.idempotencyKey === undefined ? [] : [[entry.idempotencyKey, entry]])));
	return { balances, entries, keys, txSeq: data.txSeq };
}
