/** Unordered pairs of residents, keyed as `A01|A02`. */
export function pairKey(a: string, b: string): string {
	return a.localeCompare(b) <= 0 ? `${a}|${b}` : `${b}|${a}`;
}

export function sortedPair(a: string, b: string): readonly [string, string] {
	return a.localeCompare(b) <= 0 ? [a, b] : [b, a];
}
