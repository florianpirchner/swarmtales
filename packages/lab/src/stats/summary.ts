// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The summary of a list of values: mean, sample standard deviation, the t interval and a seeded bootstrap interval
 * of the mean. Plain arithmetic, carried from the noise-floor script of the old platform, so the numbers of a
 * legacy noise-floor file are reproduced bit for bit. No `Math.random`: every draw comes from `mulberry32`.
 */
import type { NoiseSummary } from "../experiment/noise-schema.ts";

/**
 * The seed of every random draw of the statistics, unless a caller gives another one.
 *
 * @public
 */
export const BOOTSTRAP_SEED = 20261114;

/** The number of resamples of the bootstrap, and of a permutation test that is sampled. */
export const RESAMPLES = 10000;

/** Two-sided 95 % quantiles of Student's t for 1 to 30 degrees of freedom. */
const T95 = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.16, 2.145, 2.131, 2.12, 2.11, 2.101, 2.093, 2.086, 2.08, 2.074, 2.069, 2.064, 2.06, 2.056, 2.052, 2.048, 2.045, 2.042];

/**
 * Mulberry32, the generator of the old platform's bootstrap.
 *
 * @param seed - The seed; only its low 32 bits count.
 * @returns A function that gives the next number of the stream, uniform in [0, 1).
 */
export function mulberry32(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * The sum of the values, added in their order.
 *
 * @param values - The values.
 * @returns The sum; 0 for no values.
 */
export function sum(values: readonly number[]): number {
	let total = 0;
	for (const value of values) total += value;
	return total;
}

/**
 * The mean of the values.
 *
 * @param values - The values.
 * @returns The mean.
 * @throws RangeError when there is no value.
 */
export function mean(values: readonly number[]): number {
	if (values.length === 0) throw new RangeError("a mean needs at least one value");
	return sum(values) / values.length;
}

/**
 * The sample standard deviation (n - 1).
 *
 * @param values - The values.
 * @returns The standard deviation; 0 for a single value.
 * @throws RangeError when there is no value.
 */
export function sd(values: readonly number[]): number {
	const centre = mean(values);
	if (values.length < 2) return 0;
	return Math.sqrt(sum(values.map((value) => (value - centre) ** 2)) / (values.length - 1));
}

/**
 * The two-sided 95 % quantile of Student's t.
 *
 * @param degrees - The degrees of freedom; a fraction is rounded down, above 30 the quantile of 30 is used.
 * @returns The quantile; infinite below one degree of freedom.
 */
export function t95(degrees: number): number {
	if (!(degrees >= 1)) return Number.POSITIVE_INFINITY;
	return T95[Math.min(Math.floor(degrees), T95.length) - 1] ?? Number.POSITIVE_INFINITY;
}

function quantile(sorted: readonly number[], q: number): number {
	const position = (sorted.length - 1) * q;
	const low = Math.floor(position);
	const a = sorted[low] ?? Number.NaN;
	const b = sorted[Math.min(low + 1, sorted.length - 1)] ?? a;
	return a + (b - a) * (position - low);
}

function bootstrapMean95(values: readonly number[], seed: number): [number, number] {
	const next = mulberry32(seed);
	const means: number[] = [];
	for (let i = 0; i < RESAMPLES; i++) means.push(mean(values.map(() => values[Math.floor(next() * values.length)] ?? 0)));
	means.sort((a, b) => a - b);
	return [quantile(means, 0.025), quantile(means, 0.975)];
}

/**
 * Summarizes a list of values.
 *
 * @remarks
 * The bootstrap interval is the percentile interval of 10000 resampled means; it is too narrow at small n and is
 * read beside the t interval. The same values and seed give the same summary.
 *
 * @param values - The values, in run order.
 * @param seed - The seed of the bootstrap; `BOOTSTRAP_SEED` when left out.
 * @returns The summary; for a single value the standard deviation is 0 and the t interval is the value.
 * @throws RangeError when there is no value.
 * @public
 */
export function summarize(values: readonly number[], seed: number = BOOTSTRAP_SEED): NoiseSummary {
	const centre = mean(values);
	const spread = sd(values);
	const half = values.length < 2 ? 0 : (t95(values.length - 1) * spread) / Math.sqrt(values.length);
	return { n: values.length, mean: centre, sd: spread, min: Math.min(...values), max: Math.max(...values), t95: [centre - half, centre + half], bootstrap95: bootstrapMean95(values, seed) };
}
