/** The price others pay for a ransom, from the median points of the register (old tribunal-rules.ts `ransomPrices`). */
export interface RansomRule {
	readonly share: number;
	readonly selfShare: number;
	readonly minimum: number;
}

/** What others pay in full for a ransom opening now. */
export function ransomPrice(rule: RansomRule, points: readonly number[]): number {
	const sorted = [...points].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	const median = sorted.length === 0 ? 0 : sorted.length % 2 === 1 ? (sorted[middle] ?? 0) : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
	return Math.max(rule.minimum, Math.round(median * rule.share));
}
