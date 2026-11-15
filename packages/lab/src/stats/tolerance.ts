// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The tolerance check of a new series against a baseline: is the new platform within the noise of the old one?
 * Pure functions of two value lists; the file formats are the caller's.
 */
import { share } from "./effect.ts";
import { mean, sd } from "./summary.ts";

/**
 * The result of a tolerance check.
 *
 * @public
 */
export interface Tolerance {
	/** The mean of the baseline values, or their share at or above the threshold. */
	readonly baselineMean: number;
	/** The same of the new values. */
	readonly newMean: number;
	/** New minus baseline. */
	readonly difference: number;
	/** The standard error of the difference. */
	readonly se: number;
	/** Whether the new values are within the noise of the baseline. */
	readonly within: boolean;
}

/**
 * Checks the mean of new values against the mean of a baseline.
 *
 * @remarks
 * `within` when the difference of the two means is at most 2 standard errors, se = sqrt(sdA^2 / nA + sdB^2 / nB),
 * with the standard deviations the two lists really have. With five against five that covers about 92 %.
 *
 * @param baseline - The values of the baseline.
 * @param values - The new values.
 * @returns The two means, their difference, its standard error and the verdict.
 * @throws RangeError when a list is empty.
 * @public
 */
export function withinNoise(baseline: readonly number[], values: readonly number[]): Tolerance {
	const baselineMean = mean(baseline);
	const newMean = mean(values);
	const difference = newMean - baselineMean;
	const se = Math.sqrt(sd(baseline) ** 2 / baseline.length + sd(values) ** 2 / values.length);
	return { baselineMean, newMean, difference, se, within: Math.abs(difference) <= 2 * se };
}

/**
 * Checks a two-outcome measure: the share of runs at or above a threshold, in the baseline and in the new values.
 *
 * @remarks
 * `within` when the two Wilson intervals overlap. With five against five they overlap unless one list is all at
 * the threshold and the other has none: the check shows only a gross break.
 *
 * @param baseline - The values of the baseline.
 * @param values - The new values.
 * @param threshold - A run counts when its value is at or above it.
 * @returns The two shares (as the means), their difference, its standard error and the verdict.
 * @throws RangeError when a list is empty.
 * @public
 */
export function shareWithinNoise(baseline: readonly number[], values: readonly number[], threshold: number): Tolerance {
	const of = (list: readonly number[]) => share(list.filter((value) => value >= threshold).length, list.length);
	const a = of(baseline);
	const b = of(values);
	const se = Math.sqrt((a.share * (1 - a.share)) / baseline.length + (b.share * (1 - b.share)) / values.length);
	return { baselineMean: a.share, newMean: b.share, difference: b.share - a.share, se, within: a.interval95[0] <= b.interval95[1] && b.interval95[0] <= a.interval95[1] };
}
