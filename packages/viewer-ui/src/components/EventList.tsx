// SPDX-License-Identifier: Apache-2.0
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

function Who({ event }: { readonly event: RunEvent }) {
	const { actor, subject } = event;
	if (actor === undefined && subject === undefined) return null;
	return <span className="who" title={subject === undefined ? undefined : `${actor ?? "?"} acted on ${subject}`}>{actor ?? ""}{subject === undefined ? "" : ` → ${subject}`}</span>;
}

function Row({ event, position, selected, starred, onPick }: { readonly event: RunEvent; readonly position: number; readonly selected: boolean; readonly starred: boolean; readonly onPick: (position: number) => void }) {
	return (
		<div role="option" aria-selected={selected} className={`stv-vrow${selected ? " current" : ""}${starred ? " marked" : ""}`} style={{ top: position * ROW }} onClick={() => { onPick(position); }}>
			<span className="seq">{starred ? "★" : ""}{event.seq}</span>
			<span className="min">m{event.minute}</span>
			<span className="type">{event.type}</span>
			<Who event={event} />
			<span className="sum">{summaryOf(event.data)}</span>
		</div>
	);
}

/**
 * A windowed list: only the rows in view exist in the DOM, so a 100,000-line log scrolls like a short one.
 *
 * @param props - The events, the position of the current one, what a click on a row does, and the seqs to mark.
 * @returns The list.
 */
export function EventList(props: Props) {
	const { events, current, onPick, marked } = props;
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
				return <Row key={`${String(event.seq)}-${String(position)}`} event={event} position={position} selected={position === current} starred={marked?.has(event.seq) === true} onPick={onPick} />;
			})}
		</div>
	);
}
