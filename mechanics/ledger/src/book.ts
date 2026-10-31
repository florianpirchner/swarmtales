/**
 * The double-entry bookkeeping, copied from packages/kernel/src/ledger.ts (`PointsLedger`) as
 * functions over the mechanic's state. Rewards and penalties flow through the system account,
 * which may go negative; the sum of all balances is always 0. Unlike the old class, an account is
 * opened by its first booking (escrow and treasury accounts are other mechanics').
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
	txSeq: number;
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

/**
 * Books `amount` from `debit` to `credit` and tells `written` the entry. The old ledger threw for
 * a non-positive or non-integer amount, equal accounts and (without `allowNegative`) too little
 * in the debited account; callers check funds first, so these are bugs and throw here too.
 */
export function book(
	state: LedgerState,
	debit: string,
	credit: string,
	amount: number,
	reason: string,
	minute: number,
	allowNegative: boolean,
	written: (entry: LedgerEntry) => void,
): LedgerEntry {
	if (!Number.isInteger(amount) || amount <= 0) throw new Error(`ledger: amount must be a positive integer, got ${String(amount)}`);
	if (debit === credit) throw new Error("ledger: debit and credit must differ");
	const available = balanceOf(state, debit);
	if (available < amount && !allowNegative) throw new Error(`ledger: insufficient funds: ${String(available)} < ${String(amount)}`);
	state.txSeq += 1;
	const entry: LedgerEntry = { txId: `TX${String(state.txSeq)}`, debit, credit, amount, reason, minute };
	state.balances.set(debit, available - amount);
	state.balances.set(credit, balanceOf(state, credit) + amount);
	state.entries.push(entry);
	written(entry);
	return entry;
}
