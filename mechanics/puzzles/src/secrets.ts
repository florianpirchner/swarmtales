// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Runs of secret characters in a text (SPEC 20): the tool guard's own check
 * and the board's refusal of a receipt that quotes a fragment. Passwords use
 * an upper-case alphabet, so a text is matched as written and in its
 * code-like forms: upper-cased tokens that hold a digit ("ab3k" -> "AB3K")
 * and single characters joined across spaces, dashes or dots ("a-b-3" ->
 * "AB3"). Plain words are never upper-cased, so "have" does not match "HAVE".
 */

/** Single characters separated by spaces, dashes or dots: "a b c", "A-B-3", "x.y.z". */
const SPELLED = /(?<![A-Za-z0-9])[A-Za-z0-9](?:[ .-]+[A-Za-z0-9](?![A-Za-z0-9]))+/g;
const TOKEN = /[A-Za-z0-9]+/g;

/**
 * `text` and its code-like forms, the forms a fragment could be hidden in.
 *
 * @param text - The text.
 * @returns The text, then its upper-cased tokens with a digit, then its spelled runs joined.
 *
 * @public
 */
export function codeForms(text: string): readonly string[] {
	const tokens = (text.match(TOKEN) ?? []).filter((token) => /\d/.test(token)).map((token) => token.toUpperCase());
	const spelled = (text.match(SPELLED) ?? []).map((run) => run.replace(/[ .-]+/g, "").toUpperCase());
	return [text, ...tokens, ...spelled];
}

/**
 * Whether `text` (or one of its code-like forms) carries `minRun` characters in a row of `secret`.
 *
 * @param text - The text.
 * @param secret - The secret.
 * @param minRun - The shortest run that counts.
 * @returns True when it does.
 *
 * @public
 */
export function carriesRun(text: string, secret: string, minRun: number): boolean {
	const forms = codeForms(text);
	for (let start = 0; start + minRun <= secret.length; start++) {
		const run = secret.slice(start, start + minRun);
		if (forms.some((form) => form.includes(run))) return true;
	}
	return false;
}

/**
 * The maximal runs of at least `minRun` characters that `text` (or one of
 * its code-like forms) shares with `secret`: what a reader of `text` learned
 * of `secret`.
 *
 * @param text - The text.
 * @param secret - The secret.
 * @param minRun - The shortest run that counts.
 * @returns The runs, each once.
 *
 * @public
 */
export function sharedRuns(text: string, secret: string, minRun: number): readonly string[] {
	const runs = new Set<string>();
	for (const form of codeForms(text)) {
		let start = 0;
		while (start < form.length) {
			let end = start;
			while (end < form.length && secret.includes(form.slice(start, end + 1))) end += 1;
			if (end - start >= minRun) {
				runs.add(form.slice(start, end));
				start = end;
			} else start += 1;
		}
	}
	return [...runs];
}
