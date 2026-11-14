// SPDX-License-Identifier: Apache-2.0
import type { Lane, RunIndex } from "@swarmtales/viewer-core";

interface Props {
	readonly lanes: readonly Lane[];
	readonly index: RunIndex;
	readonly minute: number;
	readonly onMinute: (minute: number) => void;
}

const W = 720;
const LEFT = 62;
const ROW = 16;
const TOP = 6;
const MAX_LANES = 30;

/**
 * One strip per actor: the darker a minute, the more events the actor had in it; a click jumps to that minute.
 *
 * @param props - The lanes, the index of the run, the current tick and what a click on a tick does.
 * @returns The lanes.
 */
export function Lanes(props: Props) {
	const { lanes, index, minute, onMinute } = props;
	const shown = lanes.slice(0, MAX_LANES);
	const minutes = Math.max(1, index.lastMinute + 1);
	const peak = Math.max(1, ...shown.flatMap((lane) => lane.perMinute.map((entry) => entry[1])));
	const width = (W - LEFT - 8) / minutes;
	const height = TOP + shown.length * ROW + 18;
	if (shown.length === 0) return <p className="muted">No event of this run names an actor.</p>;
	return (
		<svg
			className="stv-lanes"
			viewBox={`0 0 ${String(W)} ${String(height)}`}
			role="img"
			aria-label="Events per actor and minute"
			onClick={(event) => {
				const box = event.currentTarget.getBoundingClientRect();
				const x = ((event.clientX - box.left) / box.width) * W;
				onMinute(Math.max(0, Math.min(minutes - 1, Math.floor((x - LEFT) / width))));
			}}
		>
			{shown.map((lane, row) => (
				<g key={lane.actor} transform={`translate(0 ${String(TOP + row * ROW)})`}>
					<text x={LEFT - 6} y={ROW - 5} textAnchor="end">{lane.actor.length > 9 ? `${lane.actor.slice(0, 8)}…` : lane.actor}</text>
					<rect x={LEFT} y={0} width={W - LEFT - 8} height={ROW - 2} fill="var(--panel-2)" rx={2} />
					{lane.perMinute.map(([at, events]) => (
						<rect key={at} x={LEFT + at * width} y={0} width={Math.max(1, width - 0.5)} height={ROW - 2} fill="var(--s1)" opacity={0.25 + 0.75 * (events / peak)} />
					))}
				</g>
			))}
			<line className="cursor" x1={LEFT + (minute + 0.5) * width} x2={LEFT + (minute + 0.5) * width} y1={0} y2={TOP + shown.length * ROW} />
			<text x={LEFT} y={height - 4}>minute 0</text>
			<text x={W - 8} y={height - 4} textAnchor="end">minute {index.lastMinute}{lanes.length > MAX_LANES ? `   (${String(MAX_LANES)} of ${String(lanes.length)} actors)` : ""}</text>
		</svg>
	);
}
