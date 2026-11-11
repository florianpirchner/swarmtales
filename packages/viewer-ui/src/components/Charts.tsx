import { toolCounts, typeCounts, usageByMinute } from "@swarmtales/viewer-core";
import { useMemo, useState } from "react";
import { usd } from "../format.ts";
import type { LoadedRun } from "../use-run.ts";
import { BarChart } from "./BarChart.tsx";
import { costSeries } from "../cost-series.ts";
import { LineChart } from "./LineChart.tsx";

export function Charts({ run }: { readonly run: LoadedRun }) {
	const { model, index } = run;
	const [by, setBy] = useState<"actor" | "model">("actor");
	const points = useMemo(() => usageByMinute(model.events, by), [model, by]);
	const series = useMemo(() => costSeries(points, index.lastMinute), [points, index.lastMinute]);
	const types = useMemo(() => typeCounts(model.events), [model]);
	const tools = useMemo(() => toolCounts(model.events), [model]);
	return (
		<>
			<div className="stv-card">
				<div className="stv-tools">
					<h2 style={{ margin: 0 }}>Cost over time</h2>
					<div className="stv-seg">
						<button type="button" aria-pressed={by === "actor"} onClick={() => { setBy("actor"); }}>per actor</button>
						<button type="button" aria-pressed={by === "model"} onClick={() => { setBy("model"); }}>per model</button>
					</div>
				</div>
				{points.length === 0 ? <p className="muted">This log has no usage lines.</p> : <LineChart title={`Cumulative cost per ${by}`} series={series} xLabel="minute" yLabel="cost (USD, cumulative)" yFormat={(value) => usd(value)} />}
			</div>
			<div className="stv-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))" }}>
				<div className="stv-card"><BarChart title="Events by type" bars={types} valueLabel="events" /></div>
				<div className="stv-card">{tools.length === 0 ? <p className="muted">No tool calls in this log.</p> : <BarChart title="Tool calls" bars={tools} valueLabel="calls" />}</div>
			</div>
		</>
	);
}
