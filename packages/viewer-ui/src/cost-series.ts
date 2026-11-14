// SPDX-License-Identifier: Apache-2.0
import type { LineSeries } from "./scale.ts";

const MAX_LINES = 8;

/**
 * Cumulative cost per key over the minutes; the keys with the highest total keep a line, the rest become "other".
 *
 * @param points - The usage points, one per tick and group.
 * @param lastMinute - The last tick of the run.
 * @returns One line per group that keeps a line, and one for the rest.
 */
export function costSeries(points: readonly { readonly minute: number; readonly key: string; readonly costUsd: number }[], lastMinute: number): readonly LineSeries[] {
	const totals = new Map<string, number>();
	for (const point of points) totals.set(point.key, (totals.get(point.key) ?? 0) + point.costUsd);
	const keep = new Set([...totals].sort((left, right) => right[1] - left[1]).slice(0, MAX_LINES - 1).map(([key]) => key));
	const needsOther = totals.size > MAX_LINES;
	const names = [...keep, ...(needsOther ? ["other"] : [])];
	return names.map((name) => {
		const perMinute = new Map<number, number>();
		for (const point of points) {
			const key = keep.has(point.key) ? point.key : "other";
			if (key === name) perMinute.set(point.minute, (perMinute.get(point.minute) ?? 0) + point.costUsd);
		}
		let sum = 0;
		const line: (readonly [number, number])[] = [[0, 0]];
		for (let minute = 0; minute <= lastMinute; minute += 1) {
			sum += perMinute.get(minute) ?? 0;
			line.push([minute + 1, sum]);
		}
		return { key: name, points: line };
	});
}

