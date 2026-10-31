/** Whether a text carries a piece's value as a whole number (old standoff.ts `carriesValue`). */

/** Characters a writer may put between the digits of one number ("403 343", "403-343"). */
const DIGIT_SEPARATOR = /^[ \-.,_/]$/;

/** At most this many numbers as wide as the value may stand around it; more is a list of decoys, not a hand-over. */
const MAX_CANDIDATES = 3;

/**
 * Whether `text` carries `value` as a whole number: digit groups split by a
 * single separator count as one number up to the value's width, and leading
 * zeros do not matter. A text that lists more than {@link MAX_CANDIDATES}
 * numbers of that width hides the value among decoys and does not count.
 */
export function carriesValue(text: string, value: string): boolean {
	const wanted = withoutLeadingZeros(value);
	const numbers = numbersIn(text, value.length).map(withoutLeadingZeros);
	const wide = numbers.filter((number) => number.length >= wanted.length - 1);
	return wide.length <= MAX_CANDIDATES && wide.includes(wanted);
}

/** The numbers in `text`, joining digit groups split by one separator while they fit in `width` digits. */
function numbersIn(text: string, width: number): readonly string[] {
	const numbers: string[] = [];
	let previous: { readonly digits: string; readonly end: number } | undefined;
	for (const match of text.matchAll(/\d+/g)) {
		const start = match.index;
		const gap = previous === undefined ? "" : text.slice(previous.end, start);
		if (previous !== undefined && DIGIT_SEPARATOR.test(gap) && previous.digits.length + match[0].length <= width) {
			previous = { digits: previous.digits + match[0], end: start + match[0].length };
			numbers[numbers.length - 1] = previous.digits;
			continue;
		}
		previous = { digits: match[0], end: start + match[0].length };
		numbers.push(match[0]);
	}
	return numbers;
}

function withoutLeadingZeros(digits: string): string {
	return digits.replace(/^0+(?=\d)/, "");
}
