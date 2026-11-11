import { mountViewer, type ViewerHandle, type ViewerHost } from "@swarmtales/viewer-ui";
import { StrictMode, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Launcher } from "./launcher.tsx";
import { githubSource, locationFromQuery } from "./github-source.ts";
import type { Opened } from "./types.ts";
import { loadViewerData, type ViewerData } from "./viewer-data.ts";
import "./app.css";

function Viewer({ opened, data }: { readonly opened: Opened; readonly data: ViewerData }) {
	const element = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (element.current === null) return undefined;
		const host: ViewerHost = { source: opened.source, title: opened.title, stories: data.stories, views: data.views };
		const handle: ViewerHandle = mountViewer(element.current, host);
		return () => {
			// Not while React is rendering this very component.
			queueMicrotask(() => { handle.unmount(); });
		};
	}, [opened, data]);
	return <div ref={element} className="viewer" />;
}

function Shell() {
	const fromQuery = useMemo(() => locationFromQuery(window.location.search), []);
	const [opened, setOpened] = useState<Opened | undefined>(() => (fromQuery === undefined ? undefined : { source: githubSource(fromQuery, (url, init) => fetch(url, init)), title: `${fromQuery.owner}/${fromQuery.repo}@${fromQuery.ref}` }));
	const [data, setData] = useState<ViewerData>({ stories: {}, views: [] });
	useEffect(() => {
		void loadViewerData("./viewer-data.json").then(setData);
	}, []);
	if (opened === undefined) return <Launcher onOpen={setOpened} />;
	return (
		<>
			<button type="button" className="change" onClick={() => { setOpened(undefined); }}>Change source</button>
			<Viewer opened={opened} data={data} />
		</>
	);
}

const root = document.getElementById("root");
if (root !== null) createRoot(root).render(<StrictMode><Shell /></StrictMode>);
