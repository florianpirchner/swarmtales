// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Keeps passwords and factors away from the gamemaker (SPEC 10.4), carried from old
 * `packages/roles/src/gamemaker/secrets.ts` (its `redact` half; `leaks`, the check of an outgoing note, is
 * `puzzles`' now). Every word of the text it reads that is part of a dealt password, fragment, factor or code is
 * replaced with `[code]`. The secrets are the fact `puzzles.secrets`.
 */

/** Shortest password piece that counts as a secret (the shortest fragment). */
const MIN_SECRET_LENGTH = 3;
/** An ordinary word counts as a secret once it contains a password piece of this length. */
const MIN_PROSE_PIECE = 4;
/**
 * What a secret is replaced with.
 *
 * @public
 */
export const REDACTED = "[code]";
/** An all-digit word counts as a factor once it shares this many digits with one, so "15 points" or "minute 120" stay readable. */
const MIN_NUMBER_PIECE = 4;

const WORD = /[A-Za-z0-9]+/g;
/** Single characters split by separators, e.g. `H-X-G` or `h x g`. */
const SPELLED = /(?<![A-Za-z0-9])[A-Za-z0-9](?:[\s\-_.·/]+[A-Za-z0-9](?![A-Za-z0-9])){2,}/g;
/** Digit groups split by separators, e.g. `559 102` or `55-91-02`. */
const GROUPED = /(?<![A-Za-z0-9])\d+(?:[\s,.'\-_/]{1,2}\d+)+(?![A-Za-z0-9])/g;

// A word with a digit or at least two capitals.
function isCodeLike(word: string): boolean {
	return /\d/.test(word) || (word.match(/[A-Z]/g)?.length ?? 0) >= 2;
}

// Whether `word` contains a substring of `password` of `size` characters.
function containsPiece(word: string, password: string, size: number): boolean {
	if (word.length < size) return false;
	for (let start = 0; start + size <= password.length; start++) {
		if (word.includes(password.slice(start, start + size))) return true;
	}
	return false;
}

/**
 * The guard of the text the gamemaker reads (old `SecretGuard`, its `redact`).
 *
 * @public
 */
export class SecretGuard {
	readonly #passwords: readonly string[];
	readonly #numbers: readonly string[];

	/**
	 * A guard of the dealt secrets.
	 *
	 * @param passwords - The dealt passwords.
	 * @param numbers - The all-digit secrets (factors, salts, codes); they match from four digits.
	 */
	constructor(passwords: readonly string[], numbers: readonly string[] = []) {
		this.#passwords = passwords.map((password) => password.toUpperCase());
		this.#numbers = numbers;
	}

	/**
	 * Replaces every word or spelled-out run that is (or contains) a password or factor piece with `[code]`.
	 *
	 * @param text - The text.
	 * @returns The text with every secret replaced.
	 */
	redact(text: string): string {
		return text
			.replace(GROUPED, (run) => (this.#isGroupedSecret(run) ? REDACTED : run))
			.replace(SPELLED, (run) => (this.#isSecret(run.replace(/[^A-Za-z0-9]/g, "")) ? REDACTED : run))
			.replace(WORD, (word) => (this.#isSecret(word) ? REDACTED : word));
	}

	// A digit group run counts once its digits together are longer than a factor piece.
	#isGroupedSecret(run: string): boolean {
		const digits = run.replace(/\D/g, "");
		return digits.length > MIN_NUMBER_PIECE && this.#isNumberSecret(digits);
	}

	#isNumberSecret(digits: string): boolean {
		if (digits.length < MIN_NUMBER_PIECE) return false;
		return this.#numbers.some((number) => number.includes(digits) || containsPiece(digits, number, MIN_NUMBER_PIECE));
	}

	#isSecret(word: string): boolean {
		// Digits glued to letters ("CF559102", "559102pts") hide a factor as well as bare digits do.
		if ((word.match(/\d+/g) ?? []).some((digits) => this.#isNumberSecret(digits))) return true;
		if (word.length < MIN_SECRET_LENGTH) return false;
		const upper = word.toUpperCase();
		// Code-like words ("HXGs", "G5MD2") hide a fragment more easily than prose does.
		const piece = isCodeLike(word) ? MIN_SECRET_LENGTH : MIN_PROSE_PIECE;
		return this.#passwords.some((password) => password.includes(upper) || containsPiece(upper, password, piece));
	}
}
