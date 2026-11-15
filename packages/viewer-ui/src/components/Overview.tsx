// SPDX-License-Identifier: Apache-2.0
import type { ChainGenesis, ChainGenesisV2 } from "@swarmtales/chain";
import { keyFingerprint, usageTotals, type RunMeta, type RunModel } from "@swarmtales/viewer-core";
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

// The files of the run that the caller's editor can open: the log always, the others when the run has them.
function openable(model: RunModel): readonly string[] {
	const has: Readonly<Record<(typeof FILES)[number], boolean>> = {
		"events.jsonl": true,
		"REPORT.md": model.report !== undefined,
		"ANALYSIS.md": model.analysisReport !== undefined,
		"000-run.json": model.meta !== undefined && model.manifest === undefined,
	};
	return FILES.filter((file) => has[file]);
}

function Head({ model, verification, onJump, openExternal }: Props) {
	return (
		<div className="stv-card">
			<h2>{model.meta?.title ?? model.name}</h2>
			<p className="muted small" style={{ margin: "0 0 10px" }}>{model.dir || "(root)"}</p>
			<ChainBadge verification={verification} model={model} onJump={onJump} />
			<p className="stv-note">
				A valid chain proves that the log matches the key in this run folder (<span className="mono">run.pub</span>, named in the genesis): no line was changed, dropped or reordered after it was signed. It does not prove who wrote the run. Whoever can replace the folder can write another log and sign it with a new key; compare the key fingerprint with a copy published elsewhere. External anchoring (a timestamp or a published key outside the folder) is not built yet.
			</p>
			{openExternal !== undefined && (
				<p style={{ margin: "10px 0 0" }}>
					{openable(model).map((file) => (
						<button key={file} type="button" style={{ marginRight: 6 }} onClick={() => { openExternal(model.dir === "" ? file : `${model.dir}/${file}`); }}>Open {file}</button>
					))}
				</p>
			)}
		</div>
	);
}

// The genesis of an old run (version 1) names the game and the seed; a run of the new platform has them in its header.
function oldGenesis(model: RunModel): ChainGenesis | undefined {
	return model.genesis?.version === 1 ? model.genesis : undefined;
}

function resultOf(model: RunModel): string {
	const end = model.events.findLast((event) => event.type === "run_end");
	if (end === undefined) return "no run end in the log";
	return typeof end.data.reason === "string" ? end.data.reason : "run ended";
}

function actorCount(meta: Partial<RunMeta>): number | undefined {
	return meta.effective?.agents ?? meta.agents?.length;
}

// The game, the seed and the number of actors of a run, each `-` when neither the header nor the genesis says it.
function headerRows(model: RunModel): { readonly game: string; readonly seed: number | string; readonly actors: number | string } {
	const genesis = oldGenesis(model);
	const meta: Partial<RunMeta> = model.meta ?? {};
	return {
		game: meta.storyId ?? genesis?.story ?? "-",
		seed: genesis?.seed ?? meta.effective?.seed ?? "-",
		actors: actorCount(meta) ?? "-",
	};
}

function RunCard({ model }: { readonly model: RunModel }) {
	const { game, seed, actors } = headerRows(model);
	return (
		<div className="stv-card">
			<h3>Run</h3>
			<dl className="stv-kv">
				<dt>story</dt><dd>{game}</dd>
				<dt>started</dt><dd>{model.meta?.startedAt ?? "-"}</dd>
				<dt>seed</dt><dd>{seed}</dd>
				<dt>agents</dt><dd>{actors}</dd>
				<dt>events</dt><dd>{model.events.length.toLocaleString("en-US")} (last tick {model.events.at(-1)?.minute ?? 0})</dd>
				<dt>result</dt><dd>{resultOf(model)}</dd>
			</dl>
		</div>
	);
}

function CostCard({ model }: { readonly model: RunModel }) {
	const totals = useMemo(() => usageTotals(model.events, "total").get("total"), [model]);
	const usage = model.usage?.totals;
	const pick = (name: "costUsd" | "requests" | "input" | "output" | "cacheRead"): number | undefined => usage?.[name] ?? totals?.[name];
	return (
		<div className="stv-card">
			<h3>Cost and tokens</h3>
			<dl className="stv-kv">
				<dt>cost</dt><dd>{usd(pick("costUsd"))}</dd>
				<dt>requests</dt><dd>{count(pick("requests"))}</dd>
				<dt>input</dt><dd>{count(pick("input"))}</dd>
				<dt>output</dt><dd>{count(pick("output"))}</dd>
				<dt>cache read</dt><dd>{count(pick("cacheRead"))}</dd>
			</dl>
		</div>
	);
}

// What the genesis of an old run states beside its key.
function OldGenesisRows({ genesis }: { readonly genesis: ChainGenesis }) {
	return (
		<>
			<dt>commit</dt><dd className="mono">{genesis.commit ?? "-"}</dd>
			<dt>story hash</dt><dd className="mono">{genesis.storyHash.slice(0, 16)}…</dd>
			<dt>key</dt><dd className="mono" title="first 16 hex digits of the sha256 of the public key">{keyFingerprint(genesis.publicKey)}</dd>
			{genesis.resumedFrom !== undefined && (<><dt>resumed</dt><dd>from a checkpoint</dd></>)}
			{Object.keys(genesis.models).length > 0 && (<><dt>models</dt><dd>{Object.entries(genesis.models).slice(0, 6).map(([role, name]) => <div key={role}><span className="muted">{role}</span> {name}</div>)}</dd></>)}
		</>
	);
}

// What the genesis of a run of the new platform states: the hash of the manifest, which says everything else.
function GenesisRows({ genesis }: { readonly genesis: ChainGenesisV2 }) {
	return (
		<>
			<dt>manifest</dt><dd className="mono" title="sha256 of manifest.json">{genesis.manifest.slice(0, 16)}…</dd>
			<dt>log</dt><dd className="mono">{genesis.log.format} {genesis.log.version}</dd>
			<dt>key</dt><dd className="mono" title="first 16 hex digits of the sha256 of the public key">{keyFingerprint(genesis.publicKey)}</dd>
			{genesis.resumedFrom !== undefined && (<><dt>resumed</dt><dd>from a snapshot</dd></>)}
		</>
	);
}

function GenesisCard({ model }: { readonly model: RunModel }) {
	const { genesis } = model;
	return (
		<div className="stv-card">
			<h3>Genesis</h3>
			{genesis === undefined ? <p className="muted">No chain, so no genesis entry.</p> : (
				<dl className="stv-kv">{genesis.version === 1 ? <OldGenesisRows genesis={genesis} /> : <GenesisRows genesis={genesis} />}</dl>
			)}
		</div>
	);
}

/**
 * The overview of a run: its name and the verdict of its chain, the header, cost and tokens, the genesis, and what could not be read.
 *
 * @param props - The loaded run, the state of the chain check, the jump to a seq, and the caller's way to open a file.
 * @returns The overview.
 */
export function Overview(props: Props) {
	const { model } = props;
	return (
		<>
			<Head {...props} />
			<div className="stv-grid">
				<RunCard model={model} />
				<CostCard model={model} />
				<GenesisCard model={model} />
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
