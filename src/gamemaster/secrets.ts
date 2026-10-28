/**
 * Keeps passwords and factors away from the game master (SPEC 10.4).
 *
 * The game master never sees a password, fragment, factor or code: every word
 * of the text it reads that is part of one is replaced with `[code]`, and
 * every text it wants to send is checked the same way before it reaches anyone.
 */

/** Shortest password piece that counts as a secret (the shortest fragment). */
export const MIN_SECRET_LENGTH = 3;
/** An ordinary word counts as a secret once it contains a password piece of this length. */
const MIN_PROSE_PIECE = 4;
export const REDACTED = "[code]";
/**
 * An all-digit word counts as a factor once it shares this many digits with
 * one, so "15 points" or "minute 120" stay readable.
 */
export const MIN_NUMBER_PIECE = 4;

const WORD = /[A-Za-z0-9]+/g;
/** Single characters split by separators, e.g. `H-X-G` or `h x g`. */
const SPELLED = /(?<![A-Za-z0-9])[A-Za-z0-9](?:[\s\-_.·/]+[A-Za-z0-9](?![A-Za-z0-9])){2,}/g;
/** Digit groups split by separators, e.g. `559 102` or `55-91-02`. */
const GROUPED = /(?<![A-Za-z0-9])\d+(?:[\s,.'\-_/]{1,2}\d+)+(?![A-Za-z0-9])/g;

export class SecretGuard {
	readonly #passwords: readonly string[];
	readonly #numbers: readonly string[];

	/** `numbers` are all-digit secrets (factors, salts, codes); they match from {@link MIN_NUMBER_PIECE} digits. */
	constructor(passwords: readonly string[], numbers: readonly string[] = []) {
		this.#passwords = passwords.map((password) => password.toUpperCase());
		this.#numbers = numbers;
	}

	/** Replaces every word or spelled-out run that is (or contains) a password or factor piece with `[code]`. */
	redact(text: string): string {
		return text
			.replace(GROUPED, (run) => (this.#isGroupedSecret(run) ? REDACTED : run))
			.replace(SPELLED, (run) => (this.#isSecret(run.replace(/[^A-Za-z0-9]/g, "")) ? REDACTED : run))
			.replace(WORD, (word) => (this.#isSecret(word) ? REDACTED : word));
	}

	/**
	 * Password pieces in an outgoing text, in any case. Three-letter lowercase
	 * words are left alone: the game master never saw a secret, so such a word
	 * (e.g. "the") can only match by chance.
	 */
	leaks(text: string): readonly string[] {
		const grouped = [...text.matchAll(GROUPED)].map((match) => match[0]).filter((run) => this.#isGroupedSecret(run));
		const spelled = [...text.matchAll(SPELLED)].map((match) => match[0]).filter((run) => this.#isSecret(run.replace(/[^A-Za-z0-9]/g, "")));
		const words = [...text.matchAll(WORD)]
			.map((match) => match[0])
			.filter((word) => (isCodeLike(word) || word.length > MIN_SECRET_LENGTH) && this.#isSecret(word));
		return [...grouped, ...spelled, ...words];
	}

	/** A digit group run counts once its digits together are longer than a factor piece. */
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

/** A word with a digit or at least two capitals. */
function isCodeLike(word: string): boolean {
	return /\d/.test(word) || (word.match(/[A-Z]/g)?.length ?? 0) >= 2;
}

/** Whether `word` contains a substring of `password` of `size` characters. */
function containsPiece(word: string, password: string, size: number): boolean {
	if (word.length < size) return false;
	for (let start = 0; start + size <= password.length; start++) {
		if (word.includes(password.slice(start, start + size))) return true;
	}
	return false;
}
