import { actorLanes, messageGraph } from "@swarmtales/viewer-core";
import { useEffect, useMemo, useRef, useState } from "react";
import { positionOf } from "../replay-math.ts";
import type { ViewDescriptor } from "../views.ts";
import type { LoadedRun } from "../use-run.ts";
import { EventList } from "./EventList.tsx";
import { Lanes } from "./Lanes.tsx";
import { MessageGraph } from "./MessageGraph.tsx";
import { ViewsPanel } from "./ViewsPanel.tsx";

interface Props {
	readonly run: LoadedRun;
	readonly seq: number;
	readonly onSeq: (seq: number) => void;
	readonly views: readonly ViewDescriptor[];
}

const SPEEDS = [2, 10, 50, 250] as const;

function isTyping(target: EventTarget | null): boolean {
	return target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement;
}

export function Replay({ run, seq, onSeq, views }: Props) {
	const { index, model } = run;
	const events = index.events;
	const position = positionOf(events, seq);
	const current = events[position];
	const [playing, setPlaying] = useState(false);
	const [speed, setSpeed] = useState<number>(10);
	const positionRef = useRef(position);
	positionRef.current = position;
	const lanes = useMemo(() => actorLanes(events), [events]);
	const graph = useMemo(() => messageGraph(events, current?.seq), [events, current?.seq]);
	const goto = (next: number) => {
		const target = events[Math.max(0, Math.min(events.length - 1, next))];
		if (target !== undefined) onSeq(target.seq);
	};
	useEffect(() => {
		if (!playing) return undefined;
		const step = Math.max(1, Math.round(speed / 10));
		const timer = setInterval(() => {
			if (positionRef.current >= events.length - 1) {
				setPlaying(false);
				return;
			}
			const target = events[Math.min(events.length - 1, positionRef.current + step)];
			if (target !== undefined) onSeq(target.seq);
		}, 100);
		return () => { clearInterval(timer); };
	}, [playing, speed, events, onSeq]);
	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (isTyping(event.target)) return;
			if (event.key === "ArrowLeft") goto(positionRef.current - (event.shiftKey ? 10 : 1));
			else if (event.key === "ArrowRight") goto(positionRef.current + (event.shiftKey ? 10 : 1));
			else if (event.key === " ") setPlaying((value) => !value);
			else return;
			event.preventDefault();
		};
		window.addEventListener("keydown", onKey);
		return () => { window.removeEventListener("keydown", onKey); };
	});
	if (current === undefined) return <div className="stv-empty">This run has no events.</div>;
	return (
		<div className="stv-replay">
			<div>
				<div className="stv-card stv-controls">
					<button type="button" className="primary" onClick={() => { setPlaying(!playing); }} aria-label={playing ? "Pause" : "Play"}>{playing ? "Pause" : "Play"}</button>
					<button type="button" onClick={() => { goto(position - 1); }} aria-label="Previous event">{"←"}</button>
					<button type="button" onClick={() => { goto(position + 1); }} aria-label="Next event">{"→"}</button>
					<select aria-label="Speed" value={speed} onChange={(event) => { setSpeed(Number(event.target.value)); }}>
						{SPEEDS.map((value) => <option key={value} value={value}>{value} events/s</option>)}
					</select>
					<span className="stv-pos">#{current.seq} of {index.lastSeq} · minute {current.minute} of {index.lastMinute}</span>
					<label>event <input type="range" aria-label="Event position" min={0} max={events.length - 1} value={position} onChange={(event) => { goto(Number(event.target.value)); }} /></label>
					<label>minute <input type="range" aria-label="Minute" min={0} max={index.lastMinute} value={current.minute} onChange={(event) => { const target = index.seqAtMinute(Number(event.target.value)); if (target !== undefined) onSeq(target); }} /></label>
				</div>
				<div className="stv-card">
					<h3>Actors</h3>
					<Lanes lanes={lanes} index={index} minute={current.minute} onMinute={(minute) => { const target = index.seqAtMinute(minute); if (target !== undefined) onSeq(target); }} />
				</div>
				<div className="stv-card">
					<h3>Events</h3>
					<EventList events={events} current={position} onPick={goto} />
					<p className="muted small" style={{ marginBottom: 0 }}>Arrow keys step, shift+arrow steps by ten, space plays. {model.issues.length > 0 ? `${String(model.issues.length)} lines could not be read.` : ""}</p>
				</div>
			</div>
			<div>
				<div className="stv-card">
					<h3>Event #{current.seq}</h3>
					<pre className="stv-detail">{JSON.stringify(current.data, null, 2)}</pre>
				</div>
				<ViewsPanel views={views} index={index} seq={current.seq} />
				<div className="stv-card">
					<h3>Who writes to whom (up to #{current.seq})</h3>
					<MessageGraph graph={graph} />
				</div>
			</div>
		</div>
	);
}
