// SPDX-License-Identifier: Apache-2.0
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

interface GithubFormProps {
	readonly initial: GithubLocation | undefined;
	/** The token kept on this device, read once when the launcher opened. */
	readonly remembered: string | undefined;
	readonly onOpen: (location: GithubLocation, token: string, remember: boolean) => void;
	readonly onError: (message: string) => void;
}

function GithubForm({ initial, remembered, onOpen, onError }: GithubFormProps) {
	const [repo, setRepo] = useState(initial === undefined ? "" : `${initial.owner}/${initial.repo}`);
	const [ref, setRef] = useState(initial?.ref ?? "main");
	const [path, setPath] = useState(initial?.path ?? "stories");
	// The token lives in this component's state; in storage only when "Remember on this device" is ticked. Never in a URL or a log.
	const [token, setToken] = useState(remembered ?? "");
	const [remember, setRemember] = useState(remembered !== undefined);
	const parsed = locationFromQuery(new URLSearchParams({ repo, ref, path }).toString());
	// A `?repo=` link with a remembered token opens right away, once.
	const autoOpened = useRef(false);
	useEffect(() => {
		if (autoOpened.current || initial === undefined || remembered === undefined) return;
		autoOpened.current = true;
		onOpen(initial, token, remember);
	});
	return (
		<form
			className="row"
			onSubmit={(event) => {
				event.preventDefault();
				if (parsed === undefined) onError("Write the repository as owner/name.");
				else onOpen(parsed, token, remember);
			}}
		>
			<input aria-label="Repository" placeholder="owner/name" value={repo} onChange={(event) => { setRepo(event.target.value); }} />
			<input aria-label="Branch or tag" placeholder="main" value={ref} onChange={(event) => { setRef(event.target.value); }} size={8} />
			<input aria-label="Folder" placeholder="stories/chess/runs" value={path} onChange={(event) => { setPath(event.target.value); }} />
			<input aria-label="Access token (optional)" type="password" autoComplete="off" autoFocus={initial !== undefined} placeholder="token for a private repository" value={token} onChange={(event) => { setToken(event.target.value); }} />
			<label className="remember"><input type="checkbox" checked={remember} onChange={(event) => { setRemember(event.target.checked); }} /> Remember on this device</label>
			<button type="submit">Open</button>
		</form>
	);
}

interface FolderDropProps {
	/** Opens the files of a folder; an empty list is an error the launcher shows. */
	readonly onFiles: (files: readonly SourceFile[]) => void;
	/** Runs an action and shows its failure, except when the person closed a picker. */
	readonly guard: (action: () => Promise<void>) => void;
}

function FolderDrop({ onFiles, guard }: FolderDropProps) {
	const [over, setOver] = useState(false);
	const picker = directoryPicker();
	const onDrop = (event: DragEvent) => {
		event.preventDefault();
		setOver(false);
		const transfer = event.dataTransfer;
		guard(async () => { onFiles(await filesOfDrop(transfer)); });
	};
	return (
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
					<input type="file" hidden multiple {...{ webkitdirectory: "" }} onChange={(event) => { if (event.target.files !== null) onFiles(filesOfInput(event.target.files)); }} />
				</label>
				{picker !== undefined && <button type="button" onClick={() => { guard(async () => { onFiles(await filesOfHandle(await picker())); }); }}>Open with the file system API</button>}
			</div>
		</section>
	);
}

/** Where the runs come from: a folder (pick, drop, File System Access) or a GitHub repository. */
export function Launcher({ onOpen, onTruncated, initial, tokens = deviceTokens }: Props) {
	const [error, setError] = useState<string | undefined>(undefined);
	const [remembered] = useState(() => tokens.read());
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
	const fromGithub = (location: GithubLocation, token: string, remember: boolean) => {
		if (remember && token !== "") tokens.write(token);
		else tokens.clear();
		onOpen({ source: githubSource(location, (url, init) => fetch(url, init), token, onTruncated), title: `${location.owner}/${location.repo}${location.path === "" ? "" : `/${location.path}`}@${location.ref}` });
	};
	return (
		<div className="launcher">
			<h1>Swarm Tales run viewer</h1>
			<p className="lead">Open a folder of runs: replay the log, check its signed chain, read the report, compare runs. Everything is read in your browser; nothing is uploaded.</p>
			<FolderDrop onFiles={fromFiles} guard={guard} />
			<section>
				<strong>Or a GitHub repository</strong>
				<GithubForm initial={initial} remembered={remembered} onOpen={fromGithub} onError={setError} />
				<p className="hint">A public repository needs no token. A fine-grained token with read access to contents is enough; it goes only to GitHub. Without the tick it stays in this tab&apos;s memory; with it, this browser keeps it until you untick and open again. A link with <code>?repo=owner/name&amp;ref=main&amp;path=stories/chess/runs</code> fills this form.</p>
			</section>
			{error !== undefined && <p className="error" role="alert">{error}</p>}
		</div>
	);
}
