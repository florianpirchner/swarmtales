import { niceTicks, tickLabel } from "../scale.ts";

interface Props {
	readonly title: string;
	readonly bars: readonly { readonly key: string; readonly count: number }[];
	readonly valueLabel: string;
	readonly limit?: number;
}

const W = 720;
const ROW = 22;
const M = { left: 150, right: 56, top: 28, bottom: 40 };

/** Horizontal bars with the value at the end of each bar; the most frequent first, the rest summed into "other". */
export function BarChart({ title, bars, valueLabel, limit = 14 }: Props) {
	const shown = bars.slice(0, limit);
	const rest = bars.slice(limit).reduce((sum, bar) => sum + bar.count, 0);
	const rows = rest > 0 ? [...shown, { key: `other (${String(bars.length - limit)})`, count: rest }] : shown;
	const ticks = niceTicks(Math.max(1, ...rows.map((row) => row.count)), 5);
	const top = ticks.at(-1) ?? 1;
	const H = M.top + rows.length * ROW + M.bottom;
	const px = (value: number) => M.left + (value / top) * (W - M.left - M.right);
	return (
		<svg className="stv-chart" viewBox={`0 0 ${String(W)} ${String(H)}`} role="img" aria-label={title}>
			<text className="title" x={0} y={16}>{title}</text>
			{ticks.map((tick) => (
				<g key={String(tick)}>
					<line className="grid" x1={px(tick)} x2={px(tick)} y1={M.top - 4} y2={H - M.bottom} />
					<text x={px(tick)} y={H - M.bottom + 14} textAnchor="middle">{tickLabel(tick)}</text>
				</g>
			))}
			{rows.map((row, index) => (
				<g key={row.key} transform={`translate(0 ${String(M.top + index * ROW)})`}>
					<text className="label" x={M.left - 8} y={ROW / 2 + 3} textAnchor="end">{row.key.length > 24 ? `${row.key.slice(0, 23)}…` : row.key}</text>
					<rect x={M.left} y={3} width={Math.max(1, px(row.count) - M.left)} height={ROW - 7} rx={3} fill="var(--s1)" />
					<text className="label" x={px(row.count) + 5} y={ROW / 2 + 3}>{row.count.toLocaleString("en-US")}</text>
				</g>
			))}
			<line className="axis" x1={M.left} x2={M.left} y1={M.top - 4} y2={H - M.bottom} />
			<text x={(M.left + W - M.right) / 2} y={H - 4} textAnchor="middle">{valueLabel}</text>
		</svg>
	);
}
