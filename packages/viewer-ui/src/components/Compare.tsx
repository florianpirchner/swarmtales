// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { compareRuns, loadRun, type Comparison, type RunModel, type RunSource, type Vocabulary } from "@swarmtales/viewer-core";
import { useEffect, useState } from "react";
import { number, usd } from "../format.ts";
import { nextFrame } from "../use-run.ts";

interface Props {
	readonly source: RunSource;
	readonly dirs: readonly string[];
	readonly onOpen: (dir: string) => void;
	readonly vocabulary: Vocabulary;
}

const COLUMNS = ["costUsd", "minutes", "events"] as const;

interface Loaded {
	readonly result?: Comparison;
	readonly error?: string;
}

// Loads the chosen runs one after the other, with a paint between two, and compares them.
function useComparison(source: RunSource, dirs: readonly string[], vocabulary: Vocabulary): Loaded {
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
					const model = await loadRun(source, dir, vocabulary.actors === undefined ? {} : { actors: vocabulary.actors });
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
	}, [source, dirs, vocabulary]);
	return { ...(result === undefined ? {} : { result }), ...(error === undefined ? {} : { error }) };
}

const cell = (column: (typeof COLUMNS)[number], value: number | undefined) => (column === "costUsd" ? usd(value) : value === undefined ? "-" : number(value, 1));

function CompareRows({ result, onOpen }: { readonly result: Comparison; readonly onOpen: (dir: string) => void }) {
	return (
		<tbody>
			{result.rows.map((row) => (
				<tr key={row.dir} className="click" onClick={() => { onOpen(row.dir); }}>
					<td><strong>{row.name}</strong></td>
					<td>{row.story ?? ""}</td>
					<td className="num">{row.seed ?? ""}</td>
					<td>{row.result ?? (row.ended ? "ended" : "no end")}</td>
					<td className="num" title={row.costSource === undefined ? "no cost recorded" : `from ${row.costSource === "log" ? "the usage lines of the log" : "usage.json"}`}>{usd(row.costUsd)}</td>
					<td className="num">{row.minutes}</td>
					<td className="num">{row.events.toLocaleString("en-US")}</td>
				</tr>
			))}
		</tbody>
	);
}

/**
 * The chosen runs side by side with the spread (mean, min, max, standard deviation) of every number column.
 *
 * @param props - The source, the folders of the chosen runs, what a click on a row opens, and the caller's vocabulary.
 * @returns The comparison table, or a line that says what is missing.
 */
export function Compare(props: Props) {
	const { source, dirs, onOpen, vocabulary } = props;
	const { result, error } = useComparison(source, dirs, vocabulary);
	if (dirs.length < 2) return <div className="stv-empty">Tick two or more runs in the run list, then choose Compare.</div>;
	if (error !== undefined) return <div className="stv-empty stv-issue">{error}</div>;
	if (result === undefined) return <div className="stv-loading">Loading {dirs.length} runs…</div>;
	return (
		<div className="stv-card stv-scroll">
			<table className="stv-table">
				<thead>
					<tr><th>Run</th><th>Story</th><th className="num">Seed</th><th>Result</th><th className="num">Cost</th><th className="num">Minutes</th><th className="num">Events</th></tr>
				</thead>
				<CompareRows result={result} onOpen={onOpen} />
				<tfoot>
					{/* Each column counts only the runs that have a value (a run without a cost is left out of the cost). */}
					<tr>
						<th colSpan={4}>n (runs with a value)</th>
						{COLUMNS.map((column) => <th key={column} className="num">{result.spread[column]?.n ?? 0}</th>)}
					</tr>
					{(["mean", "min", "max", "stdev"] as const).map((stat) => (
						<tr key={stat}>
							<th colSpan={4}>{stat}</th>
							{COLUMNS.map((column) => <th key={column} className="num">{cell(column, result.spread[column]?.[stat])}</th>)}
						</tr>
					))}
				</tfoot>
			</table>
		</div>
	);
}
