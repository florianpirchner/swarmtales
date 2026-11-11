import type { RunSummary } from "@swarmtales/viewer-core";
import { useMemo, useState } from "react";
import { day, usd } from "../format.ts";
import { filterRuns, sortRuns, type SortKey } from "../run-list-logic.ts";

interface Props {
	/** The runs found under the source root; `undefined` while the search runs. */
	readonly runs: readonly RunSummary[] | undefined;
	readonly error: string | undefined;
	readonly selected: readonly string[];
	readonly onOpen: (dir: string) => void;
	readonly onToggle: (dir: string) => void;
	readonly onCompare: () => void;
}

/** Every run folder under the source root, filtered by story and text, sorted by date, cost or name; rows can be ticked for the comparison. */
export function RunList({ runs, error, selected, onOpen, onToggle, onCompare }: Props) {
	const [story, setStory] = useState("");
	const [text, setText] = useState("");
	const [sort, setSort] = useState<SortKey>("date");
	const [descending, setDescending] = useState(true);
	const stories = useMemo(() => [...new Set((runs ?? []).flatMap((run) => (run.story === undefined ? [] : [run.story])))].sort(), [runs]);
	const rows = useMemo(() => sortRuns(filterRuns(runs ?? [], story, text), sort, descending), [runs, story, text, sort, descending]);
	if (error !== undefined) return <div className="stv-empty stv-issue">{error}</div>;
	if (runs === undefined) return <div className="stv-loading">Searching for runs…</div>;
	if (runs.length === 0) return <div className="stv-empty">No run folder (a folder with an events.jsonl) found in this source.</div>;
	return (
		<div className="stv-card">
			<div className="stv-tools">
				<input type="search" placeholder="Filter by name, story, title" aria-label="Filter runs" value={text} onChange={(event) => { setText(event.target.value); }} />
				<select aria-label="Story" value={story} onChange={(event) => { setStory(event.target.value); }}>
					<option value="">all stories</option>
					{stories.map((name) => <option key={name} value={name}>{name}</option>)}
				</select>
				<select aria-label="Sort by" value={sort} onChange={(event) => { setSort(event.target.value === "cost" ? "cost" : event.target.value === "name" ? "name" : "date"); }}>
					<option value="date">sort by date</option>
					<option value="cost">sort by cost</option>
					<option value="name">sort by name</option>
				</select>
				<button type="button" onClick={() => { setDescending(!descending); }} aria-label="Reverse the order">{descending ? "↓" : "↑"}</button>
				<span className="muted small">{rows.length} of {runs.length} runs</span>
				<button type="button" className="primary" disabled={selected.length < 2} onClick={onCompare}>Compare {selected.length > 0 ? String(selected.length) : ""}</button>
			</div>
			<div className="stv-scroll">
				<table className="stv-table">
					<thead>
						<tr><th aria-label="Compare" /><th>Run</th><th>Story</th><th>Date</th><th className="num">Agents</th><th className="num">Cost</th><th>Files</th></tr>
					</thead>
					<tbody>
						{rows.map((run) => (
							<tr key={run.dir} className="click" onClick={() => { onOpen(run.dir); }}>
								<td onClick={(event) => { event.stopPropagation(); }}>
									<input type="checkbox" aria-label={`Compare ${run.name}`} checked={selected.includes(run.dir)} onChange={() => { onToggle(run.dir); }} />
								</td>
								<td><strong>{run.name}</strong><div className="muted small">{run.dir}</div></td>
								<td>{run.story ?? ""}</td>
								<td>{day(run.startedAt)}</td>
								<td className="num">{run.agents ?? ""}</td>
								<td className="num">{usd(run.costUsd)}</td>
								<td>{run.signed ? "signed" : "unsigned"}{run.hasReport ? ", report" : ""}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
