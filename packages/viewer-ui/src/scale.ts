// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** Axis helpers for the hand-written SVG charts. */

/**
 * Round tick values from 0 up to at least `max`, about `target` of them (1, 2, 5 steps).
 *
 * @param max - The largest value of the axis.
 * @param target - About how many ticks.
 * @returns The values of the ticks.
 */
export function niceTicks(max: number, target = 5): readonly number[] {
	if (!(max > 0)) return [0, 1];
	const rough = max / target;
	const power = 10 ** Math.floor(Math.log10(rough));
	const step = [1, 2, 5, 10].map((factor) => factor * power).find((candidate) => candidate >= rough) ?? 10 * power;
	const ticks: number[] = [];
	for (let value = 0; value < max + step; value += step) {
		ticks.push(Number(value.toPrecision(12)));
		if (value >= max) break;
	}
	return ticks;
}

/**
 * The color of series `index`: the theme's eight series colours, then the same again.
 *
 * @param index - The position of the series.
 * @returns The colour, as a CSS value.
 */
export function seriesColor(index: number): string {
	return `var(--s${String((index % 8) + 1)})`;
}

/**
 * A tick label: 1200 as 1.2k, 0.05 as 0.05.
 *
 * @param value - The value of the tick.
 * @returns The label.
 */
export function tickLabel(value: number): string {
	if (Math.abs(value) >= 1000) return `${String(Number((value / 1000).toPrecision(3)))}k`;
	return String(Number(value.toPrecision(3)));
}

/** One line of a chart. */
export interface LineSeries {
	readonly key: string;
	/** `[x, y]` in x order. */
	readonly points: readonly (readonly [number, number])[];
}
