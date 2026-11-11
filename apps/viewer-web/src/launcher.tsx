import { useState, type DragEvent } from "react";
import { directoryPicker, filesOfDrop, filesOfHandle, filesOfInput } from "./browser-files.ts";
import { filesSource, rootName, type SourceFile } from "./file-source.ts";
import { githubSource, locationFromQuery, type GithubLocation } from "./github-source.ts";
import type { Opened } from "./types.ts";

interface Props {
	readonly onOpen: (opened: Opened) => void;
	/** Called when GitHub sends only part of a repository's file tree. */
	readonly onTruncated: () => void;
}

/** Where the runs come from: a folder (pick, drop, File System Access) or a GitHub repository. */
export function Launcher({ onOpen, onTruncated }: Props) {
	const [error, setError] = useState<string | undefined>(undefined);
	const [over, setOver] = useState(false);
	const [repo, setRepo] = useState("");
	const [ref, setRef] = useState("main");
	const [path, setPath] = useState("stories");
	// The token lives in this component's state only: no storage, no URL, no log.
	const [token, setToken] = useState("");
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
		onOpen({ source: githubSource(location, (url, init) => fetch(url, init), token, onTruncated), title: `${location.owner}/${location.repo}${location.path === "" ? "" : `/${location.path}`}@${location.ref}` });
	};
	const onDrop = (event: DragEvent) => {
		event.preventDefault();
		setOver(false);
		const transfer = event.dataTransfer;
		guard(async () => { fromFiles(await filesOfDrop(transfer)); });
	};
	const parsed = locationFromQuery(new URLSearchParams({ repo, ref, path }).toString());
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
					<input aria-label="Access token (optional)" type="password" autoComplete="off" placeholder="token for a private repository (kept in memory only)" value={token} onChange={(event) => { setToken(event.target.value); }} />
					<button type="submit">Open</button>
				</form>
				<p className="hint">A public repository needs no token. A fine-grained token with read access to contents is enough; it stays in this tab&apos;s memory and goes only to GitHub. You can also link here directly: <code>?repo=owner/name&amp;ref=main&amp;path=stories/chess/runs</code>.</p>
			</section>
			{error !== undefined && <p className="error" role="alert">{error}</p>}
		</div>
	);
}
