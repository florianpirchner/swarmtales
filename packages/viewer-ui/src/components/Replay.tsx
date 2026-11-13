import { actorLanes, highlightsOf, messageGraph, type Highlight, type Vocabulary } from "@swarmtales/viewer-core";
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
	readonly vocabulary: Vocabulary;
}

const SPEEDS = [2, 10, 50, 250] as const;

function isTyping(target: EventTarget | null): boolean {
	return target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement;
}

export function Replay({ run, seq, onSeq, views, vocabulary }: Props) {
	const { index, model } = run;
	const events = index.events;
	const position = positionOf(events, seq);
	const current = events[position];
	const [playing, setPlaying] = useState(false);
	const [speed, setSpeed] = useState<number>(10);
	const positionRef = useRef(position);
	const detailRef = useRef<HTMLDivElement>(null);
	// On a narrow screen the event's detail sits below the lists: a picked highlight scrolls to it.
	const pickHighlight = (target: number) => {
		onSeq(target);
		if (window.matchMedia("(max-width: 900px)").matches) requestAnimationFrame(() => { detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); });
	};
	positionRef.current = position;
	const lanes = useMemo(() => actorLanes(events), [events]);
	const highlights = useMemo(() => highlightsOf(events, [model.report, model.analysisReport].filter((text): text is string => text !== undefined)), [events, model.report, model.analysisReport]);
	const highlightAt = useMemo(() => new Map(highlights.map((highlight) => [highlight.seq, highlight])), [highlights]);
	const graph = useMemo(() => messageGraph(events, current?.seq, vocabulary.messages), [events, current?.seq, vocabulary.messages]);
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
	const nextHighlight = highlights.find((highlight) => highlight.seq > current.seq);
	const previousHighlight = [...highlights].reverse().find((highlight) => highlight.seq < current.seq);
	const highlight = highlightAt.get(current.seq);
	const text = typeof current.data.text === "string" && current.data.text.trim() !== "" ? current.data.text.trim() : undefined;
	return (
		<div className="stv-replay">
			<div>
				<div className="stv-card stv-controls">
					<button type="button" className="primary" onClick={() => { setPlaying(!playing); }} aria-label={playing ? "Pause" : "Play"}>{playing ? "Pause" : "Play"}</button>
					<button type="button" onClick={() => { goto(position - 1); }} aria-label="Previous event">{"←"}</button>
					<button type="button" onClick={() => { goto(position + 1); }} aria-label="Next event">{"→"}</button>
					<button type="button" disabled={previousHighlight === undefined} onClick={() => { if (previousHighlight !== undefined) onSeq(previousHighlight.seq); }} aria-label="Previous highlight">{"★←"}</button>
					<button type="button" disabled={nextHighlight === undefined} onClick={() => { if (nextHighlight !== undefined) onSeq(nextHighlight.seq); }} aria-label="Next highlight">{"★→"}</button>
					<select aria-label="Speed" value={speed} onChange={(event) => { setSpeed(Number(event.target.value)); }}>
						{SPEEDS.map((value) => <option key={value} value={value}>{value} events/s</option>)}
					</select>
					<span className="stv-pos">#{current.seq} of {index.lastSeq} · minute {current.minute} of {index.lastMinute}</span>
					<label>event <input type="range" aria-label="Event position" min={0} max={events.length - 1} value={position} onChange={(event) => { goto(Number(event.target.value)); }} /></label>
					<label>minute <input type="range" aria-label="Minute" min={0} max={index.lastMinute} value={current.minute} onChange={(event) => { const target = index.seqAtMinute(Number(event.target.value)); if (target !== undefined) onSeq(target); }} /></label>
				</div>
				{highlights.length > 0 && <Highlights highlights={highlights} current={current.seq} onSeq={pickHighlight} index={index} />}
				<div className="stv-card">
					<h3>Actors</h3>
					<Lanes lanes={lanes} index={index} minute={current.minute} onMinute={(minute) => { const target = index.seqAtMinute(minute); if (target !== undefined) onSeq(target); }} />
				</div>
				<div className="stv-card">
					<h3>Events</h3>
					<EventList events={events} current={position} onPick={goto} marked={highlightAt} />
					<p className="muted small" style={{ marginBottom: 0 }}>Arrow keys step, shift+arrow steps by ten, space plays. {model.issues.length > 0 ? `${String(model.issues.length)} lines could not be read.` : ""}</p>
				</div>
			</div>
			<div>
				<div className="stv-card" ref={detailRef}>
					<h3>Event #{current.seq}{highlight === undefined ? "" : " ★"}</h3>
					{highlight !== undefined && <p className="stv-hl-reason">{highlight.reason}</p>}
					{highlight?.thought !== undefined && (
						<blockquote className="stv-thought">
							<button type="button" className="stv-link" onClick={() => { if (highlight.thought !== undefined) onSeq(highlight.thought.seq); }}>thought #{highlight.thought.seq}</button>
							{highlight.thought.text}
						</blockquote>
					)}
					{text !== undefined && <div className="stv-text"><strong>{current.actor ?? current.type}</strong> {current.type === "thinking" ? "thinks" : current.type === "text" ? "says" : "writes"}:<p>{text}</p></div>}
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

/** The run's highlights: what the report cites and the rare or notable actions, each with the actor's last thought. */
function Highlights({ highlights, current, onSeq, index }: { readonly highlights: readonly Highlight[]; readonly current: number; readonly onSeq: (seq: number) => void; readonly index: LoadedRun["index"] }) {
	const fromReport = highlights.filter((highlight) => highlight.source === "report").length;
	return (
		<div className="stv-card">
			<h3>Highlights</h3>
			<p className="stv-note">{fromReport > 0 ? `${String(fromReport)} lines the report cites, ` : ""}{String(highlights.length - fromReport)} rare or notable actions. Tap one to jump there.</p>
			<ol className="stv-highlights">
				{highlights.map((highlight) => {
					const event = index.bySeq(highlight.seq);
					return (
						<li key={highlight.seq} className={highlight.seq === current ? "current" : undefined}>
							<button type="button" onClick={() => { onSeq(highlight.seq); }}>
								<span className="stv-hl-head"><span className={`stv-hl-source ${highlight.source}`}>{highlight.source === "report" ? "report" : highlight.source === "rare" ? "rare" : "notable"}</span> <code>#{highlight.seq}</code> {event?.type ?? ""}{event?.actor === undefined ? "" : ` · ${event.actor}`}{event === undefined ? "" : ` · m${String(event.minute)}`}</span>
								<span className="stv-hl-reason">{highlight.reason}</span>
								{highlight.thought !== undefined && <span className="stv-hl-thought">“{highlight.thought.text.length > 180 ? `${highlight.thought.text.slice(0, 179)}…` : highlight.thought.text}”</span>}
							</button>
						</li>
					);
				})}
			</ol>
		</div>
	);
}
