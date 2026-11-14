// SPDX-License-Identifier: Apache-2.0
/**
 * The estimate of an experiment: the difference of two arms with its standard error, t interval and a permutation
 * p value, and a share with its Wilson interval. The permutation tests enumerate every assignment while that is
 * feasible and draw from a seeded generator above; nothing here is random between two calls.
 */
import { BOOTSTRAP_SEED, mean, mulberry32, RESAMPLES, sd, sum, t95 } from "./summary.ts";

/** A sign-flip test enumerates all 2^n assignments up to this many pairs (65536 assignments). */
export const EXACT_SIGN_FLIP_PAIRS = 16;
/** A label permutation test enumerates every split up to this many runs in both arms together (2.7 million splits). */
export const EXACT_PERMUTATION_RUNS = 24;
const Z95 = 1.96;

/**
 * An estimated effect.
 *
 * @public
 */
export interface Effect {
	/** The estimate: the mean of the differences b - a, or the difference of the means b - a. */
	readonly estimate: number;
	/** The standard error of the estimate. */
	readonly se: number;
	/** The number of pairs, or of runs in both arms together. */
	readonly n: number;
	/** The 95 % t interval of the estimate. */
	readonly interval95: readonly [number, number];
	/** The two-sided p value of the permutation test. */
	readonly p: number;
	/** The test behind `p`: "sign-flip" or "label-permutation", then "exact" or "sampled". */
	readonly test: string;
}

// A statistic counts as at least the observed one when it is not smaller by more than rounding.
const reaches = (value: number, observed: number): boolean => Math.abs(value) >= Math.abs(observed) * (1 - 1e-12);

function signFlip(differences: readonly number[], seed: number): { p: number; test: string } {
	const observed = sum(differences);
	const flipped = (negative: (index: number) => boolean) => sum(differences.map((value, index) => (negative(index) ? -value : value)));
	let hits = 0;
	if (differences.length <= EXACT_SIGN_FLIP_PAIRS) {
		const total = 2 ** differences.length;
		for (let mask = 0; mask < total; mask++) if (reaches(flipped((index) => ((mask >> index) & 1) === 1), observed)) hits++;
		return { p: hits / total, test: "sign-flip exact" };
	}
	const next = mulberry32(seed);
	for (let i = 0; i < RESAMPLES; i++) if (reaches(flipped(() => next() < 0.5), observed)) hits++;
	return { p: (hits + 1) / (RESAMPLES + 1), test: "sign-flip sampled" };
}

function labelPermutation(a: readonly number[], b: readonly number[], seed: number): { p: number; test: string } {
	const pooled = [...a, ...b];
	const whole = sum(pooled);
	const difference = (sumA: number) => (whole - sumA) / b.length - sumA / a.length;
	const observed = difference(sum(a));
	let hits = 0;
	let total = 0;
	if (pooled.length <= EXACT_PERMUTATION_RUNS) {
		const walk = (index: number, left: number, sumA: number): void => {
			if (left === 0) {
				total++;
				if (reaches(difference(sumA), observed)) hits++;
			} else if (pooled.length - index >= left) {
				walk(index + 1, left - 1, sumA + (pooled[index] ?? 0));
				walk(index + 1, left, sumA);
			}
		};
		walk(0, a.length, 0);
		return { p: hits / total, test: "label-permutation exact" };
	}
	const next = mulberry32(seed);
	for (let i = 0; i < RESAMPLES; i++) {
		let sumA = 0;
		for (let k = 0; k < a.length; k++) {
			const j = k + Math.floor(next() * (pooled.length - k));
			const picked = pooled[j] ?? 0;
			pooled[j] = pooled[k] ?? 0;
			pooled[k] = picked;
			sumA += picked;
		}
		if (reaches(difference(sumA), observed)) hits++;
	}
	return { p: (hits + 1) / (RESAMPLES + 1), test: "label-permutation sampled" };
}

/**
 * The effect of paired runs: the mean of the differences b - a.
 *
 * @remarks
 * The interval is Student's t with n - 1 degrees of freedom. The p value is the sign-flip permutation test: the
 * share of sign assignments whose mean is at least as far from 0 as the observed one. It is exact up to 16 pairs
 * (65536 assignments; 12 pairs are 4096) and sampled above (10000 seeded draws, (hits + 1) / 10001).
 *
 * @param a - The values of the first arm, one per block.
 * @param b - The values of the second arm, in the same block order.
 * @param seed - The seed of a sampled test; `BOOTSTRAP_SEED` when left out.
 * @returns The effect.
 * @throws RangeError when the lists differ in length or hold fewer than two pairs.
 * @public
 */
export function pairedEffect(a: readonly number[], b: readonly number[], seed: number = BOOTSTRAP_SEED): Effect {
	if (a.length !== b.length || a.length < 2) throw new RangeError(`a paired effect needs two lists of the same length of at least 2, got ${a.length} and ${b.length}`);
	const differences = b.map((value, index) => value - (a[index] ?? 0));
	const estimate = mean(differences);
	const se = sd(differences) / Math.sqrt(differences.length);
	const half = t95(differences.length - 1) * se;
	return { estimate, se, n: differences.length, interval95: [estimate - half, estimate + half], ...signFlip(differences, seed) };
}

/**
 * The effect of unpaired runs: the difference of the means b - a.
 *
 * @remarks
 * The standard error and the degrees of freedom of the t interval are Welch's. The p value is the label
 * permutation test on the difference of means: exact up to 24 runs in both arms together, sampled above (10000
 * seeded draws, (hits + 1) / 10001).
 *
 * @param a - The values of the first arm.
 * @param b - The values of the second arm.
 * @param seed - The seed of a sampled test; `BOOTSTRAP_SEED` when left out.
 * @returns The effect.
 * @throws RangeError when an arm holds fewer than two values.
 * @public
 */
export function unpairedEffect(a: readonly number[], b: readonly number[], seed: number = BOOTSTRAP_SEED): Effect {
	if (a.length < 2 || b.length < 2) throw new RangeError(`an unpaired effect needs at least 2 values in each arm, got ${a.length} and ${b.length}`);
	const estimate = mean(b) - mean(a);
	const varA = sd(a) ** 2 / a.length;
	const varB = sd(b) ** 2 / b.length;
	const se = Math.sqrt(varA + varB);
	const degrees = se === 0 ? a.length + b.length - 2 : (varA + varB) ** 2 / (varA ** 2 / (a.length - 1) + varB ** 2 / (b.length - 1));
	const half = t95(degrees) * se;
	return { estimate, se, n: a.length + b.length, interval95: [estimate - half, estimate + half], ...labelPermutation(a, b, seed) };
}

/**
 * A share with its 95 % Wilson interval.
 *
 * @param hits - The number of runs that count.
 * @param n - The number of runs.
 * @returns The share and its interval, inside 0 to 1.
 * @throws RangeError when the counts are not whole numbers with 0 at most `hits` at most `n` and `n` at least 1.
 * @public
 */
export function share(hits: number, n: number): { readonly share: number; readonly interval95: readonly [number, number] } {
	if (!Number.isInteger(hits) || !Number.isInteger(n) || n < 1 || hits < 0 || hits > n) throw new RangeError(`a share needs whole numbers with 0 <= hits <= n and n >= 1, got ${hits} of ${n}`);
	const p = hits / n;
	const scale = 1 + Z95 ** 2 / n;
	const centre = (p + Z95 ** 2 / (2 * n)) / scale;
	const half = (Z95 * Math.sqrt((p * (1 - p)) / n + Z95 ** 2 / (4 * n * n))) / scale;
	return { share: p, interval95: [Math.max(0, centre - half), Math.min(1, centre + half)] };
}
