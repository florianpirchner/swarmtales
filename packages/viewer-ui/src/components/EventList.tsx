import type { RunEvent } from "@swarmtales/viewer-core";
import { useEffect, useRef, useState } from "react";
import { summaryOf } from "../format.ts";
import { scrollToShow, visibleRange } from "../replay-math.ts";

const ROW = 24;

interface Props {
	readonly events: readonly RunEvent[];
	/** Position of the current event in `events`. */
	readonly current: number;
	readonly onPick: (position: number) => void;
	/** Seqs to mark with a star (the run's highlights). */
	readonly marked?: ReadonlyMap<number, unknown>;
}

/** A windowed list: only the rows in view exist in the DOM, so a 100,000-line log scrolls like a short one. */
export function EventList({ events, current, onPick, marked }: Props) {
	const box = useRef<HTMLDivElement>(null);
	const [scrollTop, setScrollTop] = useState(0);
	const [viewport, setViewport] = useState(340);
	useEffect(() => {
		const element = box.current;
		if (element === null) return;
		const next = scrollToShow(current, element.scrollTop, element.clientHeight, ROW);
		if (next !== undefined) element.scrollTop = next;
	}, [current]);
	const { start, end } = visibleRange(scrollTop, viewport, ROW, events.length);
	const rows: RunEvent[] = events.slice(start, end);
	return (
		<div
			ref={box}
			className="stv-vlist"
			role="listbox"
			aria-label="Events"
			onScroll={(event) => {
				setScrollTop(event.currentTarget.scrollTop);
				setViewport(event.currentTarget.clientHeight);
			}}
		>
			<div style={{ height: events.length * ROW }} />
			{rows.map((event, offset) => {
				const position = start + offset;
				return (
					<div key={`${String(event.seq)}-${String(position)}`} role="option" aria-selected={position === current} className={`stv-vrow${position === current ? " current" : ""}${marked?.has(event.seq) === true ? " marked" : ""}`} style={{ top: position * ROW }} onClick={() => { onPick(position); }}>
						<span className="seq">{marked?.has(event.seq) === true ? "★" : ""}{event.seq}</span>
						<span className="min">m{event.minute}</span>
						<span className="type">{event.type}</span>
						{(event.actor !== undefined || event.subject !== undefined) && <span className="who" title={event.subject === undefined ? undefined : `${event.actor ?? "?"} acted on ${event.subject}`}>{event.actor ?? ""}{event.subject === undefined ? "" : ` → ${event.subject}`}</span>}
						<span className="sum">{summaryOf(event.data)}</span>
					</div>
				);
			})}
		</div>
	);
}
