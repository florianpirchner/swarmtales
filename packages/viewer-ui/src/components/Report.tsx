// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { useMemo, useState } from "react";
import { safeHtml } from "../markdown.ts";
import type { LoadedRun } from "../use-run.ts";

interface Props {
	readonly run: LoadedRun;
	readonly onJump: (seq: number) => void;
}

/**
 * REPORT.md and ANALYSIS.md, sanitised; every `#seq` that names an event of the run is a link into the replay.
 *
 * @param props - The loaded run and the jump to a seq.
 * @returns The report, or a line that says the run has none.
 */
export function Report(props: Props) {
	const { run, onJump } = props;
	const { model, index } = run;
	const documents = [
		...(model.report === undefined ? [] : [{ name: "REPORT.md", text: model.report }]),
		...(model.analysisReport === undefined ? [] : [{ name: "ANALYSIS.md", text: model.analysisReport }]),
	];
	const [chosen, setChosen] = useState(0);
	const active = documents[Math.min(chosen, documents.length - 1)];
	const html = useMemo(() => (active === undefined ? "" : safeHtml(active.text, (seq) => index.bySeq(seq) !== undefined)), [active, index]);
	if (active === undefined) return <div className="stv-empty">This run folder has no REPORT.md or ANALYSIS.md.</div>;
	return (
		<div className="stv-card">
			{documents.length > 1 && (
				<div className="stv-seg" style={{ marginBottom: 12 }}>
					{documents.map((doc, position) => <button key={doc.name} type="button" aria-pressed={position === chosen} onClick={() => { setChosen(position); }}>{doc.name}</button>)}
				</div>
			)}
			<div
				className="stv-report"
				onClick={(event) => {
					const target = event.target;
					const link = target instanceof Element ? target.closest("a[data-seq]") : null;
					const seq = Number(link?.getAttribute("data-seq") ?? Number.NaN);
					if (link !== null && Number.isInteger(seq)) {
						event.preventDefault();
						onJump(seq);
					}
				}}
				dangerouslySetInnerHTML={{ __html: html }}
			/>
		</div>
	);
}
