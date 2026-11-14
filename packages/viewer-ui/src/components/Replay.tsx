// SPDX-License-Identifier: Apache-2.0
import { actorLanes, highlightsOf, messageGraph, type Highlight, type RunEvent, type RunProjection, type Vocabulary } from "@swarmtales/viewer-core";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { positionOf } from "../replay-math.ts";
import { rowAt, timelineOf } from "../timeline.ts";
import type { ViewDescriptor } from "../views.ts";
import type { LoadedRun } from "../use-run.ts";
import { ActivationCard } from "./ActivationCard.tsx";
import { DecisionCard } from "./DecisionCard.tsx";
import { EventList } from "./EventList.tsx";
import { HumanCard } from "./HumanHand.tsx";
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

/** The state of the playback: whether it plays, how fast, and a jump to a position of the event list. */
interface Playback {
	readonly playing: boolean;
	readonly speed: number;
	readonly setPlaying: (playing: boolean) => void;
	readonly setSpeed: (speed: number) => void;
	readonly goto: (position: number) => void;
}

// Plays the log on a timer and steps it with the arrow keys and the space bar.
function usePlayback(events: readonly RunEvent[], position: number, onSeq: (seq: number) => void): Playback {
	const [playing, setPlaying] = useState(false);
	const [speed, setSpeed] = useState<number>(10);
	const positionRef = useRef(position);
	positionRef.current = position;
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
	return { playing, speed, setPlaying, setSpeed, goto };
}

interface ControlsProps {
	readonly playback: Playback;
	readonly position: number;
	readonly current: RunEvent;
	readonly index: LoadedRun["index"];
	readonly highlights: readonly Highlight[];
	readonly onSeq: (seq: number) => void;
	readonly onMinute: (minute: number) => void;
}

function Controls({ playback, position, current, index, highlights, onSeq, onMinute }: ControlsProps) {
	const { playing, speed, setPlaying, setSpeed, goto } = playback;
	const nextHighlight = highlights.find((highlight) => highlight.seq > current.seq);
	const previousHighlight = [...highlights].reverse().find((highlight) => highlight.seq < current.seq);
	return (
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
			<label>event <input type="range" aria-label="Event position" min={0} max={index.events.length - 1} value={position} onChange={(event) => { goto(Number(event.target.value)); }} /></label>
			<label>minute <input type="range" aria-label="Minute" min={0} max={index.lastMinute} value={current.minute} onChange={(event) => { onMinute(Number(event.target.value)); }} /></label>
		</div>
	);
}

function textOf(event: RunEvent): string | undefined {
	const { text } = event.data;
	return typeof text === "string" && text.trim() !== "" ? text.trim() : undefined;
}

function verbOf(type: string): string {
	if (type === "thinking") return "thinks";
	return type === "text" ? "says" : "writes";
}

// The current event: why it is a highlight, the actor's thought before it, its text and its whole line.
function Detail({ current, highlight, onSeq, box }: { readonly current: RunEvent; readonly highlight: Highlight | undefined; readonly onSeq: (seq: number) => void; readonly box: RefObject<HTMLDivElement | null> }) {
	const text = textOf(current);
	const thought = highlight?.thought;
	return (
		<div className="stv-card" ref={box}>
			<h3>Event #{current.seq}{highlight === undefined ? "" : " ★"}</h3>
			{highlight !== undefined && <p className="stv-hl-reason">{highlight.reason}</p>}
			{thought !== undefined && (
				<blockquote className="stv-thought">
					<button type="button" className="stv-link" onClick={() => { onSeq(thought.seq); }}>thought #{thought.seq}</button>
					{thought.text}
				</blockquote>
			)}
			{text !== undefined && <div className="stv-text"><strong>{current.actor ?? current.type}</strong> {verbOf(current.type)}:<p>{text}</p></div>}
			<pre className="stv-detail">{JSON.stringify(current.data, null, 2)}</pre>
		</div>
	);
}

// What the projection knows about the current line: the activation it belongs to and the decisions proposed up to it; then the Human Hand over the whole run.
function ProjectionCards({ projection, seq, onSeq }: { readonly projection: RunProjection; readonly seq: number; readonly onSeq: (seq: number) => void }) {
	const activation = projection.activations.find((entry) => entry.seq === (projection.attached.get(seq) ?? seq));
	return (
		<>
			{activation !== undefined && <ActivationCard activation={activation} seq={seq} onSeq={onSeq} />}
			{projection.decisions.filter((decision) => decision.seq <= seq).map((decision) => <DecisionCard key={decision.id} decision={decision} seq={seq} onSeq={onSeq} />)}
			<HumanCard projection={projection} seq={seq} onSeq={onSeq} />
		</>
	);
}

/**
 * The replay of a run: the controls, the highlights, the actors' lanes and the event list on the left,
 * the current event, its activation, the decisions, the Human Hand, the views of its mechanics and the message graph on the right.
 *
 * @param props - The loaded run, the current seq and how to change it, the view descriptors and the caller's vocabulary.
 * @returns The replay view.
 */
export function Replay(props: Props) {
	const { run, seq, onSeq, views, vocabulary } = props;
	const { index, model, projection } = run;
	const events = index.events;
	const position = positionOf(events, seq);
	const current = events[position];
	const playback = usePlayback(events, position, onSeq);
	const detailRef = useRef<HTMLDivElement>(null);
	// On a narrow screen the event's detail sits below the lists: a picked highlight scrolls to it.
	const pickHighlight = (target: number) => {
		onSeq(target);
		if (window.matchMedia("(max-width: 900px)").matches) requestAnimationFrame(() => { detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); });
	};
	const lanes = useMemo(() => actorLanes(events), [events]);
	const highlights = useMemo(() => highlightsOf(events, [model.report, model.analysisReport].filter((text): text is string => text !== undefined)), [events, model.report, model.analysisReport]);
	const highlightAt = useMemo(() => new Map(highlights.map((highlight) => [highlight.seq, highlight])), [highlights]);
	const graph = useMemo(() => messageGraph(events, current?.seq, vocabulary.messages), [events, current?.seq, vocabulary.messages]);
	const rows = useMemo(() => timelineOf(events, projection), [events, projection]);
	if (current === undefined) return <div className="stv-empty">This run has no events.</div>;
	const toMinute = (minute: number) => {
		const target = index.seqAtMinute(minute);
		if (target !== undefined) onSeq(target);
	};
	return (
		<div className="stv-replay">
			<div>
				<Controls playback={playback} position={position} current={current} index={index} highlights={highlights} onSeq={onSeq} onMinute={toMinute} />
				{highlights.length > 0 && <Highlights highlights={highlights} current={current.seq} onSeq={pickHighlight} index={index} />}
				<div className="stv-card">
					<h3>Actors</h3>
					<Lanes lanes={lanes} index={index} minute={current.minute} onMinute={toMinute} projection={projection} />
				</div>
				<div className="stv-card">
					<h3>Events</h3>
					<EventList rows={rows} current={rowAt(rows, projection, current.seq)} onPick={onSeq} marked={highlightAt} />
					<p className="muted small" style={{ marginBottom: 0 }}>Arrow keys step, shift+arrow steps by ten, space plays. {model.issues.length > 0 ? `${String(model.issues.length)} lines could not be read.` : ""}</p>
				</div>
			</div>
			<div>
				<Detail current={current} highlight={highlightAt.get(current.seq)} onSeq={onSeq} box={detailRef} />
					<ProjectionCards projection={projection} seq={current.seq} onSeq={onSeq} />
				<ViewsPanel views={views} index={index} seq={current.seq} />
				<div className="stv-card">
					<h3>Who writes to whom (up to #{current.seq})</h3>
					<MessageGraph graph={graph} />
				</div>
			</div>
		</div>
	);
}

function HighlightRow({ highlight, current, onSeq, index }: { readonly highlight: Highlight; readonly current: number; readonly onSeq: (seq: number) => void; readonly index: LoadedRun["index"] }) {
	const event = index.bySeq(highlight.seq);
	const where = event === undefined ? "" : `${event.type}${event.actor === undefined ? "" : ` · ${event.actor}`} · m${String(event.minute)}`;
	const thought = highlight.thought?.text;
	return (
		<li className={highlight.seq === current ? "current" : undefined}>
			<button type="button" onClick={() => { onSeq(highlight.seq); }}>
				<span className="stv-hl-head"><span className={`stv-hl-source ${highlight.source}`}>{highlight.source}</span> <code>#{highlight.seq}</code> {where}</span>
				<span className="stv-hl-reason">{highlight.reason}</span>
				{thought !== undefined && <span className="stv-hl-thought">“{thought.length > 180 ? `${thought.slice(0, 179)}…` : thought}”</span>}
			</button>
		</li>
	);
}

// The run's highlights: what the report cites and the rare or notable actions, each with the actor's last thought.
function Highlights({ highlights, current, onSeq, index }: { readonly highlights: readonly Highlight[]; readonly current: number; readonly onSeq: (seq: number) => void; readonly index: LoadedRun["index"] }) {
	const fromReport = highlights.filter((highlight) => highlight.source === "report").length;
	return (
		<div className="stv-card">
			<h3>Highlights</h3>
			<p className="stv-note">{fromReport > 0 ? `${String(fromReport)} lines the report cites, ` : ""}{String(highlights.length - fromReport)} rare or notable actions. Tap one to jump there.</p>
			<ol className="stv-highlights">
				{highlights.map((highlight) => <HighlightRow key={highlight.seq} highlight={highlight} current={current} onSeq={onSeq} index={index} />)}
			</ol>
		</div>
	);
}
