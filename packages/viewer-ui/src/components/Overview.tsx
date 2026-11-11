import { keyFingerprint, usageTotals, type RunModel } from "@swarmtales/viewer-core";
import { useMemo } from "react";
import { count, usd } from "../format.ts";
import type { VerificationState } from "../use-run.ts";
import { ChainBadge } from "./ChainBadge.tsx";

interface Props {
	readonly model: RunModel;
	readonly verification: VerificationState;
	readonly onJump: (seq: number) => void;
	readonly openExternal?: (path: string) => void;
}

const FILES = ["events.jsonl", "REPORT.md", "ANALYSIS.md", "000-run.json"] as const;

export function Overview({ model, verification, onJump, openExternal }: Props) {
	const totals = useMemo(() => usageTotals(model.events, "total").get("total"), [model]);
	const last = model.events.at(-1);
	const end = model.events.findLast((event) => event.type === "run_end");
	const genesis = model.genesis;
	const usage = model.usage?.totals;
	const cost = usage?.costUsd ?? totals?.costUsd;
	return (
		<>
			<div className="stv-card">
				<h2>{model.meta?.title ?? model.name}</h2>
				<p className="muted small" style={{ margin: "0 0 10px" }}>{model.dir || "(root)"}</p>
				<ChainBadge verification={verification} model={model} onJump={onJump} />
				<p className="stv-note">
					A valid chain proves that the log matches the key in this run folder (<span className="mono">run.pub</span>, named in the genesis): no line was changed, dropped or reordered after it was signed. It does not prove who wrote the run. Whoever can replace the folder can write another log and sign it with a new key; compare the key fingerprint with a copy published elsewhere. External anchoring (a timestamp or a published key outside the folder) is not built yet.
				</p>
				{openExternal !== undefined && (
					<p style={{ margin: "10px 0 0" }}>
						{FILES.filter((file) => file === "events.jsonl" || (file === "REPORT.md" && model.report !== undefined) || (file === "ANALYSIS.md" && model.analysisReport !== undefined) || (file === "000-run.json" && model.meta !== undefined)).map((file) => (
							<button key={file} type="button" style={{ marginRight: 6 }} onClick={() => { openExternal(model.dir === "" ? file : `${model.dir}/${file}`); }}>Open {file}</button>
						))}
					</p>
				)}
			</div>
			<div className="stv-grid">
				<div className="stv-card">
					<h3>Run</h3>
					<dl className="stv-kv">
						<dt>story</dt><dd>{model.meta?.storyId ?? genesis?.story ?? "-"}</dd>
						<dt>started</dt><dd>{model.meta?.startedAt ?? "-"}</dd>
						<dt>seed</dt><dd>{genesis?.seed ?? model.meta?.effective?.seed ?? "-"}</dd>
						<dt>agents</dt><dd>{model.meta?.effective?.agents ?? model.meta?.agents?.length ?? "-"}</dd>
						<dt>events</dt><dd>{model.events.length.toLocaleString("en-US")} (last minute {last?.minute ?? 0})</dd>
						<dt>result</dt><dd>{end === undefined ? "no run end in the log" : (typeof end.data.reason === "string" ? end.data.reason : "run ended")}</dd>
					</dl>
				</div>
				<div className="stv-card">
					<h3>Cost and tokens</h3>
					<dl className="stv-kv">
						<dt>cost</dt><dd>{usd(cost)}</dd>
						<dt>requests</dt><dd>{count(usage?.requests ?? totals?.requests)}</dd>
						<dt>input</dt><dd>{count(usage?.input ?? totals?.input)}</dd>
						<dt>output</dt><dd>{count(usage?.output ?? totals?.output)}</dd>
						<dt>cache read</dt><dd>{count(usage?.cacheRead ?? totals?.cacheRead)}</dd>
					</dl>
				</div>
				<div className="stv-card">
					<h3>Genesis</h3>
					{genesis === undefined ? <p className="muted">No chain, so no genesis entry.</p> : (
						<dl className="stv-kv">
							<dt>commit</dt><dd className="mono">{genesis.commit ?? "-"}</dd>
							<dt>story hash</dt><dd className="mono">{genesis.storyHash.slice(0, 16)}…</dd>
							<dt>key</dt><dd className="mono" title="first 16 hex digits of the sha256 of the public key">{keyFingerprint(genesis.publicKey)}</dd>
							{genesis.resumedFrom !== undefined && (<><dt>resumed</dt><dd>from a checkpoint</dd></>)}
							{Object.keys(genesis.models).length > 0 && (<><dt>models</dt><dd>{Object.entries(genesis.models).slice(0, 6).map(([role, name]) => <div key={role}><span className="muted">{role}</span> {name}</div>)}</dd></>)}
						</dl>
					)}
				</div>
			</div>
			{model.issues.length > 0 && (
				<div className="stv-card">
					<h3>Problems reading the files</h3>
					{model.issues.slice(0, 10).map((issue) => <div key={`${issue.file}:${String(issue.line ?? 0)}`} className="stv-issue small">{issue.file}{issue.line === undefined ? "" : `:${String(issue.line)}`}: {issue.reason}</div>)}
				</div>
			)}
		</>
	);
}
