// SPDX-License-Identifier: Apache-2.0
import { useEffect, useRef, useState } from "react";
import { summaryOf } from "../format.ts";
import { scrollToShow, visibleRange } from "../replay-math.ts";
import { activationLine, type TimelineRow } from "../timeline.ts";

const ROW = 24;

interface Props {
	readonly rows: readonly TimelineRow[];
	/** Position of the current row in `rows`. */
	readonly current: number;
	/** Called with the seq of the row that was clicked. */
	readonly onPick: (seq: number) => void;
	/** Seqs to mark with a star (the run's highlights). */
	readonly marked?: ReadonlyMap<number, unknown>;
}

function Who({ event }: { readonly event: TimelineRow["event"] }) {
	const { actor, subject } = event;
	if (actor === undefined && subject === undefined) return null;
	return <span className="who" title={subject === undefined ? undefined : `${actor ?? "?"} acted on ${subject}`}>{actor ?? ""}{subject === undefined ? "" : ` → ${subject}`}</span>;
}

// What a row says: an activation as one line (a Director's with its own label), any other event by its type and its first fields.
function Cells({ row }: { readonly row: TimelineRow }) {
	const { event, activation } = row;
	if (activation === undefined) return <><span className="type">{event.type}</span><Who event={event} /><span className="sum">{summaryOf(event.data)}</span></>;
	return <><span className="type">{activation.kind === "director" ? "Director" : "activation"}</span><span className="who">{activation.name}</span><span className="sum">{activationLine(activation)}</span></>;
}

function Row({ row, position, selected, starred, onPick }: { readonly row: TimelineRow; readonly position: number; readonly selected: boolean; readonly starred: boolean; readonly onPick: (seq: number) => void }) {
	const kind = row.activation === undefined ? "" : ` activation ${row.activation.kind}`;
	return (
		<div role="option" aria-selected={selected} className={`stv-vrow${kind}${selected ? " current" : ""}${starred ? " marked" : ""}`} style={{ top: position * ROW }} onClick={() => { onPick(row.seq); }}>
			<span className="seq">{starred ? "★" : ""}{row.seq}</span>
			<span className="min">m{row.event.minute}</span>
			<Cells row={row} />
		</div>
	);
}

/**
 * A windowed list: only the rows in view exist in the DOM, so a 100,000-line log scrolls like a short one.
 *
 * @param props - The rows, the position of the current one, what a click on a row does, and the seqs to mark.
 * @returns The list.
 */
export function EventList(props: Props) {
	const { rows, current, onPick, marked } = props;
	const box = useRef<HTMLDivElement>(null);
	const [scrollTop, setScrollTop] = useState(0);
	const [viewport, setViewport] = useState(340);
	useEffect(() => {
		const element = box.current;
		if (element === null) return;
		const next = scrollToShow(current, element.scrollTop, element.clientHeight, ROW);
		if (next !== undefined) element.scrollTop = next;
	}, [current]);
	const { start, end } = visibleRange(scrollTop, viewport, ROW, rows.length);
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
			<div style={{ height: rows.length * ROW }} />
			{rows.slice(start, end).map((row, offset) => {
				const position = start + offset;
				return <Row key={`${String(row.seq)}-${String(position)}`} row={row} position={position} selected={position === current} starred={marked?.has(row.seq) === true} onPick={onPick} />;
			})}
		</div>
	);
}
