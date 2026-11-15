// SPDX-License-Identifier: Apache-2.0
import type { Lane, RunIndex, RunProjection } from "@swarmtales/viewer-core";
import { pauseLine, resumeLine } from "../timeline.ts";

interface Props {
	readonly lanes: readonly Lane[];
	readonly index: RunIndex;
	readonly tick: number;
	readonly onTick: (tick: number) => void;
	/** The projection of the run: its pauses, resume markers and suspensions are drawn over the lanes. */
	readonly projection?: RunProjection;
}

const W = 720;
const LEFT = 62;
const ROW = 16;
const TOP = 6;
const MAX_LANES = 30;

// A pause as a band at the boundary of the tick it lies before, a resume marker as a line across all lanes.
function Marks({ projection, x, bottom }: { readonly projection: RunProjection; readonly x: (tick: number) => number; readonly bottom: number }) {
	return (
		<>
			{projection.pauses.map((pause) => <rect key={pause.seq} className="pause" x={x(pause.tick) - 4} y={0} width={Math.max(8, x(pause.endTick ?? pause.tick) - x(pause.tick))} height={bottom}><title>{`pause ${pauseLine(pause)}`}</title></rect>)}
			{projection.resumes.map((marker) => <line key={marker.seq} className="resume" x1={x(marker.tick)} x2={x(marker.tick)} y1={0} y2={bottom}><title>{`run resumed ${resumeLine(marker)}`}</title></line>)}
		</>
	);
}

/**
 * One strip per actor: the darker a tick, the more events the actor had in it; a click jumps to that tick.
 * A suspended actor's strip is grey from the tick of its suspension on.
 *
 * @param props - The lanes, the index of the run, the current tick, what a click on a tick does, and the projection.
 * @returns The lanes.
 */
export function Lanes(props: Props) {
	const { lanes, index, tick, onTick, projection } = props;
	const shown = lanes.slice(0, MAX_LANES);
	const ticks = Math.max(1, index.lastMinute + 1);
	const peak = Math.max(1, ...shown.flatMap((lane) => lane.perMinute.map((entry) => entry[1])));
	const width = (W - LEFT - 8) / ticks;
	const height = TOP + shown.length * ROW + 18;
	const x = (at: number): number => LEFT + at * width;
	const out = (actor: string) => (projection?.suspensions ?? []).filter((entry) => entry.name === actor);
	if (shown.length === 0) return <p className="muted">No event of this run names an actor.</p>;
	return (
		<svg
			className="stv-lanes"
			viewBox={`0 0 ${String(W)} ${String(height)}`}
			role="img"
			aria-label="Events per actor and tick"
			onClick={(event) => {
				const box = event.currentTarget.getBoundingClientRect();
				const x = ((event.clientX - box.left) / box.width) * W;
				onTick(Math.max(0, Math.min(ticks - 1, Math.floor((x - LEFT) / width))));
			}}
		>
			{shown.map((lane, row) => (
				<g key={lane.actor} transform={`translate(0 ${String(TOP + row * ROW)})`}>
					<text x={LEFT - 6} y={ROW - 5} textAnchor="end" className={out(lane.actor).length > 0 ? "suspended" : undefined}>{lane.actor.length > 9 ? `${lane.actor.slice(0, 8)}…` : lane.actor}</text>
					<rect x={LEFT} y={0} width={W - LEFT - 8} height={ROW - 2} fill="var(--panel-2)" rx={2} />
					{lane.perMinute.map(([at, events]) => (
						<rect key={at} x={LEFT + at * width} y={0} width={Math.max(1, width - 0.5)} height={ROW - 2} fill="var(--s1)" opacity={0.25 + 0.75 * (events / peak)} />
					))}
					{out(lane.actor).map((entry) => {
						const until = entry.endSeq === undefined ? ticks : index.bySeq(entry.endSeq)?.minute ?? ticks;
						return <rect key={entry.seq} className="suspended" x={x(entry.tick)} y={0} width={x(until) - x(entry.tick)} height={ROW - 2}><title>{`${entry.name} suspended by ${entry.by} at tick ${String(entry.tick)} (${entry.reason})`}</title></rect>;
					})}
				</g>
			))}
			{projection !== undefined && <Marks projection={projection} x={x} bottom={TOP + shown.length * ROW} />}
			<line className="cursor" x1={LEFT + (tick + 0.5) * width} x2={LEFT + (tick + 0.5) * width} y1={0} y2={TOP + shown.length * ROW} />
			<text x={LEFT} y={height - 4}>tick 0</text>
			<text x={W - 8} y={height - 4} textAnchor="end">tick {index.lastMinute}{lanes.length > MAX_LANES ? `   (${String(MAX_LANES)} of ${String(lanes.length)} actors)` : ""}</text>
		</svg>
	);
}
