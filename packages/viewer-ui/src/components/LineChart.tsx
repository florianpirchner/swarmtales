// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { niceTicks, seriesColor, tickLabel, type LineSeries } from "../scale.ts";

interface Props {
	readonly title: string;
	readonly series: readonly LineSeries[];
	readonly xLabel: string;
	readonly yLabel: string;
	readonly yFormat?: (value: number) => string;
}

const W = 760;
const H = 320;
const M = { left: 76, right: 16, top: 30, bottom: 46 };

/**
 * Lines over x with labelled axes and a legend; the series colours are the theme's (light and dark).
 *
 * @param props - The title, the series, the labels of the axes and the format of the values.
 * @returns The chart.
 */
export function LineChart(props: Props) {
	const { title, series, xLabel, yLabel, yFormat = tickLabel } = props;
	const maxX = Math.max(1, ...series.flatMap((line) => line.points.map((point) => point[0])));
	const maxY = Math.max(0, ...series.flatMap((line) => line.points.map((point) => point[1])));
	const yTicks = niceTicks(maxY);
	const top = yTicks.at(-1) ?? 1;
	const xTicks = niceTicks(maxX, 6).filter((tick) => tick <= maxX);
	const xMax = maxX;
	const px = (x: number) => M.left + (x / xMax) * (W - M.left - M.right);
	const py = (y: number) => H - M.bottom - (y / top) * (H - M.top - M.bottom);
	return (
		<figure style={{ margin: 0, maxWidth: 960 }}>
			<svg className="stv-chart" viewBox={`0 0 ${String(W)} ${String(H)}`} role="img" aria-label={title}>
				<text className="title" x={M.left} y={16}>{title}</text>
				{yTicks.map((tick) => (
					<g key={`y${String(tick)}`}>
						<line className="grid" x1={M.left} x2={W - M.right} y1={py(tick)} y2={py(tick)} />
						<text x={M.left - 6} y={py(tick) + 4} textAnchor="end">{yFormat(tick)}</text>
					</g>
				))}
				{xTicks.map((tick) => (
					<text key={`x${String(tick)}`} x={px(tick)} y={H - M.bottom + 15} textAnchor="middle">{tickLabel(tick)}</text>
				))}
				<line className="axis" x1={M.left} x2={W - M.right} y1={H - M.bottom} y2={H - M.bottom} />
				<line className="axis" x1={M.left} x2={M.left} y1={M.top} y2={H - M.bottom} />
				<text x={(M.left + W - M.right) / 2} y={H - 6} textAnchor="middle">{xLabel}</text>
				<text transform={`translate(14 ${String((M.top + H - M.bottom) / 2)}) rotate(-90)`} textAnchor="middle">{yLabel}</text>
				{series.map((line, index) => (
					<polyline key={line.key} fill="none" stroke={seriesColor(index)} strokeWidth={2} strokeLinejoin="round" points={line.points.map(([x, y]) => `${String(px(x))},${String(py(y))}`).join(" ")} />
				))}
			</svg>
			<figcaption className="stv-legend">
				{series.map((line, index) => (
					<span key={line.key}><i style={{ background: seriesColor(index) }} />{line.key}</span>
				))}
			</figcaption>
		</figure>
	);
}
