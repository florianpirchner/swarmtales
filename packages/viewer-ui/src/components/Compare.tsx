import { compareRuns, loadRun, type Comparison, type RunModel, type RunSource } from "@swarmtales/viewer-core";
import { useEffect, useState } from "react";
import { number, usd } from "../format.ts";
import { nextFrame } from "../use-run.ts";

interface Props {
	readonly source: RunSource;
	readonly dirs: readonly string[];
	readonly onOpen: (dir: string) => void;
}

const COLUMNS = ["costUsd", "minutes", "events"] as const;

/** The chosen runs side by side with the spread (mean, min, max, standard deviation) of every number column. */
export function Compare({ source, dirs, onOpen }: Props) {
	const [result, setResult] = useState<Comparison | undefined>(undefined);
	const [error, setError] = useState<string | undefined>(undefined);
	useEffect(() => {
		const alive = { current: true };
		setResult(undefined);
		setError(undefined);
		if (dirs.length === 0) return undefined;
		void (async () => {
			try {
				const models: RunModel[] = [];
				for (const dir of dirs) {
					await nextFrame();
					const model = await loadRun(source, dir);
					models.push(model);
				}
				if (alive.current) setResult(compareRuns(models));
			} catch (reason) {
				if (alive.current) setError(reason instanceof Error ? reason.message : String(reason));
			}
		})();
		return () => {
			alive.current = false;
		};
	}, [source, dirs]);
	if (dirs.length < 2) return <div className="stv-empty">Tick two or more runs in the run list, then choose Compare.</div>;
	if (error !== undefined) return <div className="stv-empty stv-issue">{error}</div>;
	if (result === undefined) return <div className="stv-loading">Loading {dirs.length} runs…</div>;
	const cell = (column: (typeof COLUMNS)[number], value: number | undefined) => (column === "costUsd" ? usd(value) : value === undefined ? "-" : number(value, 1));
	return (
		<div className="stv-card stv-scroll">
			<table className="stv-table">
				<thead>
					<tr><th>Run</th><th>Story</th><th className="num">Seed</th><th>Result</th><th className="num">Cost</th><th className="num">Minutes</th><th className="num">Events</th></tr>
				</thead>
				<tbody>
					{result.rows.map((row) => (
						<tr key={row.dir} className="click" onClick={() => { onOpen(row.dir); }}>
							<td><strong>{row.name}</strong></td>
							<td>{row.story ?? ""}</td>
							<td className="num">{row.seed ?? ""}</td>
							<td>{row.result ?? (row.ended ? "ended" : "no end")}</td>
							<td className="num">{usd(row.costUsd)}</td>
							<td className="num">{row.minutes}</td>
							<td className="num">{row.events.toLocaleString("en-US")}</td>
						</tr>
					))}
				</tbody>
				<tfoot>
					{(["mean", "min", "max", "stdev"] as const).map((stat) => (
						<tr key={stat}>
							<th colSpan={4}>{stat}{stat === "mean" ? ` (n = ${String(result.spread.costUsd?.n ?? result.rows.length)})` : ""}</th>
							{COLUMNS.map((column) => <th key={column} className="num">{cell(column, result.spread[column]?.[stat])}</th>)}
						</tr>
					))}
				</tfoot>
			</table>
		</div>
	);
}
