import { useEffect, useRef, useState, type DragEvent } from "react";
import { directoryPicker, filesOfDrop, filesOfHandle, filesOfInput } from "./browser-files.ts";
import { filesSource, rootName, type SourceFile } from "./file-source.ts";
import { githubSource, locationFromQuery, type GithubLocation } from "./github-source.ts";
import { deviceTokens, type TokenStore } from "./token-store.ts";
import type { Opened } from "./types.ts";

interface Props {
	readonly onOpen: (opened: Opened) => void;
	/** Called when GitHub sends only part of a repository's file tree. */
	readonly onTruncated: () => void;
	/** A GitHub location from the page's `?repo=` query: fills the form. */
	readonly initial?: GithubLocation;
	/** Where a remembered token is kept; the device's local storage by default. */
	readonly tokens?: TokenStore;
}

/** Where the runs come from: a folder (pick, drop, File System Access) or a GitHub repository. */
export function Launcher({ onOpen, onTruncated, initial, tokens = deviceTokens }: Props) {
	const [error, setError] = useState<string | undefined>(undefined);
	const [over, setOver] = useState(false);
	const [repo, setRepo] = useState(initial === undefined ? "" : `${initial.owner}/${initial.repo}`);
	const [ref, setRef] = useState(initial?.ref ?? "main");
	const [path, setPath] = useState(initial?.path ?? "stories");
	// The token lives in this component's state; in storage only when "Remember on this device" is ticked. Never in a URL or a log.
	const [remembered] = useState(() => tokens.read());
	const [token, setToken] = useState(remembered ?? "");
	const [remember, setRemember] = useState(remembered !== undefined);
	const picker = directoryPicker();
	const fromFiles = (files: readonly SourceFile[]) => {
		if (files.length === 0) {
			setError("No files found. Pick or drop a folder that contains run folders (each with an events.jsonl).");
			return;
		}
		setError(undefined);
		onOpen({ source: filesSource(files), title: rootName(files) });
	};
	const guard = (action: () => Promise<void>) => {
		action().catch((reason: unknown) => {
			if (reason instanceof DOMException && reason.name === "AbortError") return;
			setError(reason instanceof Error ? reason.message : String(reason));
		});
	};
	const fromGithub = (location: GithubLocation) => {
		if (remember && token !== "") tokens.write(token);
		else tokens.clear();
		onOpen({ source: githubSource(location, (url, init) => fetch(url, init), token, onTruncated), title: `${location.owner}/${location.repo}${location.path === "" ? "" : `/${location.path}`}@${location.ref}` });
	};
	const onDrop = (event: DragEvent) => {
		event.preventDefault();
		setOver(false);
		const transfer = event.dataTransfer;
		guard(async () => { fromFiles(await filesOfDrop(transfer)); });
	};
	const parsed = locationFromQuery(new URLSearchParams({ repo, ref, path }).toString());
	// A `?repo=` link with a remembered token opens right away, once.
	const autoOpened = useRef(false);
	useEffect(() => {
		if (autoOpened.current || initial === undefined || remembered === undefined) return;
		autoOpened.current = true;
		fromGithub(initial);
	});
	return (
		<div className="launcher">
			<h1>Swarm Tales run viewer</h1>
			<p className="lead">Open a folder of runs: replay the log, check its signed chain, read the report, compare runs, see the story as a graph. Everything is read in your browser; nothing is uploaded.</p>
			<section
				className={over ? "drop over" : "drop"}
				onDragOver={(event) => { event.preventDefault(); setOver(true); }}
				onDragLeave={() => { setOver(false); }}
				onDrop={onDrop}
			>
				<strong>Drop a folder here</strong>
				<span>a run folder, or a folder of runs such as stories/chess/runs</span>
				<div className="row">
					<label className="button">
						Pick a folder
						<input type="file" hidden multiple {...{ webkitdirectory: "" }} onChange={(event) => { if (event.target.files !== null) fromFiles(filesOfInput(event.target.files)); }} />
					</label>
					{picker !== undefined && <button type="button" onClick={() => { guard(async () => { fromFiles(await filesOfHandle(await picker())); }); }}>Open with the file system API</button>}
				</div>
			</section>
			<section>
				<strong>Or a GitHub repository</strong>
				<form
					className="row"
					onSubmit={(event) => {
						event.preventDefault();
						if (parsed === undefined) setError("Write the repository as owner/name.");
						else fromGithub(parsed);
					}}
				>
					<input aria-label="Repository" placeholder="owner/name" value={repo} onChange={(event) => { setRepo(event.target.value); }} />
					<input aria-label="Branch or tag" placeholder="main" value={ref} onChange={(event) => { setRef(event.target.value); }} size={8} />
					<input aria-label="Folder" placeholder="stories/chess/runs" value={path} onChange={(event) => { setPath(event.target.value); }} />
					<input aria-label="Access token (optional)" type="password" autoComplete="off" autoFocus={initial !== undefined} placeholder="token for a private repository" value={token} onChange={(event) => { setToken(event.target.value); }} />
					<label className="remember"><input type="checkbox" checked={remember} onChange={(event) => { setRemember(event.target.checked); }} /> Remember on this device</label>
					<button type="submit">Open</button>
				</form>
				<p className="hint">A public repository needs no token. A fine-grained token with read access to contents is enough; it goes only to GitHub. Without the tick it stays in this tab&apos;s memory; with it, this browser keeps it until you untick and open again. A link with <code>?repo=owner/name&amp;ref=main&amp;path=stories/chess/runs</code> fills this form.</p>
			</section>
			{error !== undefined && <p className="error" role="alert">{error}</p>}
		</div>
	);
}
