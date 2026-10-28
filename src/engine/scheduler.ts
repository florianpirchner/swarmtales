/**
 * Fair activation order (SPEC §3): a fresh seeded permutation in every pass
 * of every round, so nobody is systematically first or last.
 */
import type { CompetitorId } from "../core/ids.ts";
import { rngFor } from "../core/random.ts";

export function activationOrder(seed: number, round: number, pass: number, competitors: readonly CompetitorId[]): readonly CompetitorId[] {
	return rngFor(seed, "order", round, pass).shuffle(competitors);
}

/** Cuts an order into consecutive blocks of `size`; the last block may be shorter. */
export function blocksOf<T>(order: readonly T[], size: number): readonly (readonly T[])[] {
	if (!Number.isInteger(size) || size < 1) throw new RangeError(`Block size must be a positive integer, got ${size}`);
	const blocks: T[][] = [];
	for (let start = 0; start < order.length; start += size) blocks.push(order.slice(start, start + size));
	return blocks;
}
