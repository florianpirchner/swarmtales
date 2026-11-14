// SPDX-License-Identifier: Apache-2.0
import { findRuns, type RunSource, type RunSummary, type Vocabulary } from "@swarmtales/viewer-core";
import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { formatHash, parseHash, type ViewId } from "../hash.ts";
import type { ViewerSetup } from "../setup.ts";
import { NO_VOCABULARY, useRun, useVerification, type LoadedRun, type RunState, type VerificationState } from "../use-run.ts";
import { Charts } from "./Charts.tsx";
import { Compare } from "./Compare.tsx";
import { Games } from "./Games.tsx";
import { Overview } from "./Overview.tsx";
import { Replay } from "./Replay.tsx";
import { Report } from "./Report.tsx";
import { RunList } from "./RunList.tsx";

const TABS: readonly { readonly id: ViewId; readonly label: string; readonly needsRun: boolean }[] = [
	{ id: "runs", label: "Runs", needsRun: false },
	{ id: "games", label: "Games", needsRun: false },
	{ id: "overview", label: "Overview", needsRun: true },
	{ id: "replay", label: "Replay", needsRun: true },
	{ id: "report", label: "Report", needsRun: true },
	{ id: "charts", label: "Charts", needsRun: true },
	{ id: "compare", label: "Compare", needsRun: false },
];

interface Found {
	readonly runs: readonly RunSummary[] | undefined;
	readonly error: string | undefined;
}

// Searches the source for run folders; `onSingle` is called when the source is itself one run folder.
function useRuns(source: RunSource, onSingle: (dir: string) => void): Found {
	const [runs, setRuns] = useState<readonly RunSummary[] | undefined>(undefined);
	const [error, setError] = useState<string | undefined>(undefined);
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
		findRuns(source, "", { onDetails })
			.then((found) => {
				if (cancelled) return;
				setRuns(found.map((run) => details.get(run.dir) ?? run));
				// A source that is itself one run folder (the folder dropped is the run): open it.
				if (found.length === 1 && found[0] !== undefined) onSingle(found[0].dir);
			})
			.catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason)); });
		return () => { cancelled = true; };
	}, [source]);
	return { runs, error };
}

/** The viewer's place: the run, the view and the seq, kept in step with the page's `location.hash`. */
interface Place {
	readonly view: ViewId;
	readonly runDir: string | undefined;
	readonly seq: number | undefined;
	readonly setView: Dispatch<SetStateAction<ViewId>>;
	readonly setRunDir: Dispatch<SetStateAction<string | undefined>>;
	readonly setSeq: Dispatch<SetStateAction<number | undefined>>;
}

function usePlace(): Place {
	const initial = useMemo(() => parseHash(window.location.hash), []);
	const [view, setView] = useState<ViewId>(initial.view ?? (initial.seq === undefined ? "runs" : "replay"));
	const [runDir, setRunDir] = useState<string | undefined>(initial.run);
	const [seq, setSeq] = useState<number | undefined>(initial.seq);
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
	return { view, runDir, seq, setView, setRunDir, setSeq };
}

interface RunViewProps {
	readonly setup: ViewerSetup;
	readonly place: Place;
	readonly state: RunState;
	readonly verification: VerificationState;
	readonly vocabulary: Vocabulary;
	readonly onJump: (seq: number) => void;
}

// The views of one run: a line while it loads or when it failed, else the overview, the replay, the report or the charts.
function RunView({ setup, place, state, verification, vocabulary, onJump }: RunViewProps) {
	const { view, runDir, seq, setSeq } = place;
	if (runDir === undefined) return <div className="stv-empty">Choose a run in the Runs tab first.</div>;
	if (state.status === "error") return <div className="stv-empty stv-issue">{state.message}</div>;
	if (state.status !== "ready") return <div className="stv-loading">Loading {runDir || "the run"}…</div>;
	return <LoadedView setup={setup} view={view} run={state.run} seq={seq} setSeq={setSeq} verification={verification} vocabulary={vocabulary} onJump={onJump} />;
}

interface LoadedViewProps extends Omit<RunViewProps, "place" | "state"> {
	readonly view: ViewId;
	readonly run: LoadedRun;
	readonly seq: number | undefined;
	readonly setSeq: (seq: number) => void;
}

function LoadedView({ setup, view, run, seq, setSeq, verification, vocabulary, onJump }: LoadedViewProps) {
	if (view === "overview") return <Overview model={run.model} verification={verification} onJump={onJump} {...(setup.openExternal === undefined ? {} : { openExternal: setup.openExternal })} />;
	if (view === "replay") return <Replay run={run} seq={seq ?? run.index.firstSeq} onSeq={setSeq} views={setup.views ?? []} vocabulary={vocabulary} />;
	if (view === "report") return <Report run={run} onJump={onJump} />;
	return <Charts run={run} />;
}

function Tabs({ view, compared, hasRun, onView }: { readonly view: ViewId; readonly compared: number; readonly hasRun: boolean; readonly onView: (view: ViewId) => void }) {
	return (
		<nav className="stv-tabs" role="tablist">
			{TABS.map((tab) => (
				<button key={tab.id} type="button" role="tab" className="stv-tab" aria-selected={view === tab.id} disabled={tab.needsRun && !hasRun} onClick={() => { onView(tab.id); }}>{tab.label}{tab.id === "compare" && compared > 0 ? ` (${String(compared)})` : ""}</button>
			))}
		</nav>
	);
}

interface AppProps {
	readonly setup: ViewerSetup;
}

/**
 * The viewer: the top bar with its tabs, and the view the tab names.
 *
 * @param props - The setup the viewer was mounted with.
 * @returns The viewer.
 */
export function App(props: AppProps) {
	const { setup } = props;
	const place = usePlace();
	const { view, runDir, setView, setRunDir, setSeq } = place;
	const [compare, setCompare] = useState<readonly string[]>([]);
	const [game, setGame] = useState<string | undefined>(undefined);
	const vocabulary = setup.vocabulary ?? NO_VOCABULARY;
	const state = useRun(setup.source, runDir, vocabulary);
	const loaded = state.status === "ready" ? state.run : undefined;
	const verification = useVerification(loaded?.model, setup.verifyWorker);
	const { runs, error } = useRuns(setup.source, (dir) => {
		if (runDir !== undefined) return;
		setRunDir(dir);
		setView((current) => (current === "runs" ? "overview" : current));
	});
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
		if (view === "games") return <Games games={setup.games ?? []} selected={game} onSelect={setGame} runs={runs} onOpenRun={open} />;
		if (view === "compare") return <Compare source={setup.source} dirs={compare} onOpen={open} vocabulary={vocabulary} />;
		return <RunView setup={setup} place={place} state={state} verification={verification} vocabulary={vocabulary} onJump={jump} />;
	})();
	return (
		<div className="stv">
			<header className="stv-top">
				<span className="stv-title">{setup.title ?? "Swarm Tales viewer"}</span>
				<Tabs view={view} compared={compare.length} hasRun={runDir !== undefined} onView={setView} />
				{runDir !== undefined && <span className="stv-run-name" title={runDir}>{loaded?.model.name ?? runDir}</span>}
			</header>
			<main className="stv-main">{body}</main>
		</div>
	);
}
