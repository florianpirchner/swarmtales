// SPDX-License-Identifier: Apache-2.0
/**
 * The smallest vocabulary shared by every package: what a value may be, where randomness comes from and how a run
 * ends.
 */

/**
 * A value that survives `JSON.stringify` unchanged: what options, job data and shared attributes hold.
 *
 * @public
 */
export type JsonValue = string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue };

/**
 * A label of a seeded random stream, for example `rng("deal", 3)`.
 *
 * @public
 */
export type RandomLabel = string | number;

/**
 * Seeded randomness handed out by the kernel. Every stream is derived from the run seed and its labels, so the
 * same run draws the same numbers.
 *
 * @public
 */
export interface RandomSource {
	/** Uniform in [0, 1). */
	next(): number;
	/** An integer in [min, max], both inclusive. */
	int(min: number, max: number): number;
	/** One element; throws on an empty list. */
	pick<T>(items: readonly T[]): T;
	/** A shuffled copy. */
	shuffle<T>(items: readonly T[]): T[];
}

/**
 * How a run ended: the tick limit was reached, a run limit of a plugin was reached, or the run failed.
 *
 * @public
 */
export interface RunEnd {
	/** Why the run ended. */
	readonly reason: "ticks" | "limit" | "error";
	/** The tick the run ended in. */
	readonly tick: number;
	/** The id of the run limit that was reached, `<plugin id>.<limit id>`; set when `reason` is `limit`. */
	readonly limit?: string;
}
