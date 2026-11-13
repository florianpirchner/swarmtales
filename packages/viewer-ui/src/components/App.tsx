import { findRuns, type RunSummary } from "@swarmtales/viewer-core";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { formatHash, parseHash, type ViewId } from "../hash.ts";
import type { ViewerHost } from "../host.ts";
import { NO_VOCABULARY, useRun, useVerification } from "../use-run.ts";
import { Charts } from "./Charts.tsx";
import { Compare } from "./Compare.tsx";
import { Games } from "./Games.tsx";
import { Overview } from "./Overview.tsx";
import { Replay } from "./Replay.tsx";
import { Report } from "./Report.tsx";
import { RunList } from "./RunList.tsx";
// React Flow is the heavy part of the bundle; they load with the story view.
const StoryView = lazy(async () => ({ default: (await import("./StoryView.tsx")).StoryView }));

const TABS: readonly { readonly id: ViewId; readonly label: string; readonly needsRun: boolean }[] = [
	{ id: "runs", label: "Runs", needsRun: false },
	{ id: "games", label: "Games", needsRun: false },
	{ id: "overview", label: "Overview", needsRun: true },
	{ id: "replay", label: "Replay", needsRun: true },
	{ id: "report", label: "Report", needsRun: true },
	{ id: "charts", label: "Charts", needsRun: true },
	{ id: "compare", label: "Compare", needsRun: false },
	{ id: "story", label: "Story", needsRun: false },
];

export function App({ host }: { readonly host: ViewerHost }) {
	const initial = useMemo(() => parseHash(window.location.hash), []);
	const [view, setView] = useState<ViewId>(initial.view ?? (initial.seq === undefined ? "runs" : "replay"));
	const [runDir, setRunDir] = useState<string | undefined>(initial.run);
	const [seq, setSeq] = useState<number | undefined>(initial.seq);
	const [compare, setCompare] = useState<readonly string[]>([]);
	const [game, setGame] = useState<string | undefined>(undefined);
	const [runs, setRuns] = useState<readonly RunSummary[] | undefined>(undefined);
	const [error, setError] = useState<string | undefined>(undefined);
	const vocabulary = host.vocabulary ?? NO_VOCABULARY;
	const state = useRun(host.source, runDir, vocabulary);
	const loaded = state.status === "ready" ? state.run : undefined;
	const verification = useVerification(loaded?.model, host.verifyWorker);
	useEffect(() => {
		let cancelled = false;
		setRuns(undefined);
		setError(undefined);
		// The rows show from the listing at once; each run's story, date and cost fill in as they are read.
		// Details can arrive before the listing is set (a run without small files is summarised at once): keep them.
		const details = new Map<string, RunSummary>();
		const onDetails = (detail: RunSummary) => {
			details.set(detail.dir, detail);
			if (!cancelled) setRuns((current) => current?.map((run) => (run.dir === detail.dir ? detail : run)));
		};
		findRuns(host.source, "", { onDetails })
			.then((found) => {
				if (cancelled) return;
				setRuns(found.map((run) => details.get(run.dir) ?? run));
				// A source that is itself one run folder (the folder dropped is the run): open it.
				if (found.length === 1 && found[0] !== undefined && runDir === undefined) {
					setRunDir(found[0].dir);
					setView((current) => (current === "runs" ? "overview" : current));
				}
			})
			.catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason)); });
		return () => { cancelled = true; };
	}, [host.source]);
	useEffect(() => {
		const next = formatHash({ ...(runDir === undefined ? {} : { run: runDir }), view, ...(seq === undefined ? {} : { seq }) });
		if (next !== window.location.hash) window.history.replaceState(null, "", next === "" ? window.location.pathname + window.location.search : next);
	}, [runDir, view, seq]);
	useEffect(() => {
		const onHash = () => {
			const next = parseHash(window.location.hash);
			if (next.seq !== undefined) setSeq(next.seq);
			if (next.view !== undefined) setView(next.view);
			if (next.run !== undefined) setRunDir(next.run);
		};
		window.addEventListener("hashchange", onHash);
		return () => { window.removeEventListener("hashchange", onHash); };
	}, []);
	const open = useCallback((dir: string) => {
		setRunDir(dir);
		setSeq(undefined);
		setView("overview");
	}, []);
	const jump = useCallback((target: number) => {
		setSeq(target);
		setView("replay");
	}, []);
	const toggle = useCallback((dir: string) => {
		setCompare((current) => (current.includes(dir) ? current.filter((entry) => entry !== dir) : [...current, dir]));
	}, []);
	const body = (() => {
		if (view === "runs") return <RunList runs={runs} error={error} selected={compare} onOpen={open} onToggle={toggle} onCompare={() => { setView("compare"); }} />;
		if (view === "games") return <Games games={host.games ?? []} selected={game} onSelect={setGame} runs={runs} onOpenRun={open} />;
		if (view === "compare") return <Compare source={host.source} dirs={compare} onOpen={open} vocabulary={vocabulary} />;
		if (view === "story") return <Suspense fallback={<div className="stv-loading">Loading the story view…</div>}><StoryView run={loaded} stories={host.stories ?? {}} onJump={jump} vocabulary={vocabulary} {...(host.initialStory === undefined ? {} : { initial: host.initialStory })} /></Suspense>;
		if (runDir === undefined) return <div className="stv-empty">Choose a run in the Runs tab first.</div>;
		if (state.status === "loading" || state.status === "idle") return <div className="stv-loading">Loading {runDir || "the run"}…</div>;
		if (state.status === "error") return <div className="stv-empty stv-issue">{state.message}</div>;
		if (view === "overview") return <Overview model={state.run.model} verification={verification} onJump={jump} {...(host.openExternal === undefined ? {} : { openExternal: host.openExternal })} />;
		if (view === "replay") return <Replay run={state.run} seq={seq ?? state.run.index.firstSeq} onSeq={setSeq} views={host.views ?? []} vocabulary={vocabulary} />;
		if (view === "report") return <Report run={state.run} onJump={jump} />;
		return <Charts run={state.run} />;
	})();
	return (
		<div className="stv">
			<header className="stv-top">
				<span className="stv-title">{host.title ?? "Swarm Tales viewer"}</span>
				<nav className="stv-tabs" role="tablist">
					{TABS.map((tab) => (
						<button key={tab.id} type="button" role="tab" className="stv-tab" aria-selected={view === tab.id} disabled={tab.needsRun && runDir === undefined} onClick={() => { setView(tab.id); }}>{tab.label}{tab.id === "compare" && compare.length > 0 ? ` (${String(compare.length)})` : ""}</button>
					))}
				</nav>
				{runDir !== undefined && <span className="stv-run-name" title={runDir}>{loaded?.model.name ?? runDir}</span>}
			</header>
			<main className="stv-main">{body}</main>
		</div>
	);
}
