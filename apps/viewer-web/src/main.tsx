// SPDX-License-Identifier: Apache-2.0
import { mountViewer, type ViewerHandle, type ViewerSetup } from "@swarmtales/viewer-ui";
import { StrictMode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { loadBundle } from "./bundled-source.ts";
import { Launcher } from "./launcher.tsx";
import { locationFromQuery } from "./github-source.ts";
import type { Opened } from "./types.ts";
import { loadViewerData, type ViewerData } from "./viewer-data.ts";
import "./app.css";

function Viewer({ opened, data }: { readonly opened: Opened; readonly data: ViewerData }) {
	const element = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (element.current === null) return undefined;
		const setup: ViewerSetup = { source: opened.source, title: opened.title, views: data.views, games: data.games };
		const handle: ViewerHandle = mountViewer(element.current, setup);
		return () => {
			// Not while React is rendering this very component.
			queueMicrotask(() => { handle.unmount(); });
		};
	}, [opened, data]);
	return <div ref={element} className="viewer" />;
}

function Shell() {
	const fromQuery = useMemo(() => locationFromQuery(window.location.search), []);
	const [truncated, setTruncated] = useState(false);
	const onTruncated = useCallback(() => { setTruncated(true); }, []);
	// A `?repo=` link fills the launcher's GitHub form and waits for Open, so a private repository's token can be pasted first.
	const [opened, setOpened] = useState<Opened | undefined>(undefined);
	const [data, setData] = useState<ViewerData>({ views: [], games: [] });
	useEffect(() => {
		void loadViewerData("./viewer-data.json").then(setData);
		// Runs bundled next to the page (a private copy of the viewer) open right away, unless a `?repo=` link asks for GitHub.
		if (fromQuery === undefined) void loadBundle("./runs", (url, init) => fetch(url, init)).then((bundle) => { if (bundle !== undefined) setOpened((current) => current ?? bundle); });
	}, [fromQuery]);
	if (opened === undefined) return <Launcher onOpen={setOpened} onTruncated={onTruncated} {...(fromQuery === undefined ? {} : { initial: fromQuery })} />;
	return (
		<>
			{truncated && (
				<p className="notice" role="status">
					GitHub sent only part of this repository's file tree (it is too large), so some runs may be missing. Open a smaller path, such as stories/chess/runs.
					<button type="button" onClick={() => { setTruncated(false); }}>Dismiss</button>
				</p>
			)}
			<button type="button" className="change" onClick={() => { setTruncated(false); setOpened(undefined); }}>Change source</button>
			<Viewer opened={opened} data={data} />
		</>
	);
}

const root = document.getElementById("root");
if (root !== null) createRoot(root).render(<StrictMode><Shell /></StrictMode>);
