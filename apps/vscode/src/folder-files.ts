/**
 * What the extension host does for the webview: answers `list` and `readText` over one opened folder.
 * The folder is an interface (`FolderFiles`) so the logic runs against a map in tests and against
 * `vscode.workspace.fs` in the extension; paths are checked here so a webview can never leave its folder.
 */
import { findRuns, joinPath, type RunSource } from "@swarmtales/viewer-core";
import type { RpcReply, RpcRequest } from "./protocol.ts";

/** The files below one folder; paths are relative to it, `""` is the folder itself. */
export type FolderFiles = RunSource;

/**
 * A folder-relative path made of plain names, with `/` separators: no `..`, no absolute path, no drive
 * letter, no backslash, no NUL, no name ending in a dot or a space. `undefined` for anything else (the host then refuses the request).
 */
export function safeRelative(path: string): string | undefined {
	if (path.includes("\\") || path.includes("\0") || path.startsWith("/") || /^[A-Za-z]:/.test(path)) return undefined;
	const parts = path.split("/").filter((part) => part !== "" && part !== ".");
	// `..`, and names Windows would shorten to it or to another name (a trailing dot or space).
	if (parts.some((part) => part === ".." || part.endsWith(".") || part.endsWith(" "))) return undefined;
	return joinPath(...parts);
}

function refused(id: number, path: string): RpcReply {
	return { type: "rpc-result", id, ok: false, error: `The path "${path}" is outside the opened folder.` };
}

/** Answers one request of the webview; a failing read is an error reply, never a thrown error. */
export async function answer(files: FolderFiles, request: RpcRequest): Promise<RpcReply> {
	const path = safeRelative(request.method === "list" ? request.dir : request.path);
	if (path === undefined) return refused(request.id, request.method === "list" ? request.dir : request.path);
	try {
		if (request.method === "list") return { type: "rpc-result", id: request.id, ok: true, entries: [...(await files.list(path))] };
		const text = await files.readText(path);
		return text === undefined ? { type: "rpc-result", id: request.id, ok: true } : { type: "rpc-result", id: request.id, ok: true, text };
	} catch (error) {
		return { type: "rpc-result", id: request.id, ok: false, error: error instanceof Error ? error.message : String(error) };
	}
}

/** What a folder holds: itself a run, a folder with runs below it, or neither. */
export type FolderKind = { readonly kind: "run" } | { readonly kind: "runs"; readonly count: number } | { readonly kind: "none" };

/** A run folder has an `events.jsonl`; otherwise the runs below it (a few levels deep) are counted. */
export async function classifyFolder(files: FolderFiles, depth = 4): Promise<FolderKind> {
	const here = await files.list("");
	if (here.some((entry) => entry.kind === "file" && entry.name === "events.jsonl")) return { kind: "run" };
	const runs = await findRuns(files, "", { depth });
	return runs.length === 0 ? { kind: "none" } : { kind: "runs", count: runs.length };
}

const STORY_FILE = /(^|[/\\])([^/\\]+\.story\.(ya?ml|json)|story\.ya?ml)$/;

/** Story files the "Open Story Graph" command accepts: `*.story.yaml`, `*.story.json`, `story.yaml`. */
export function isStoryFile(path: string): boolean {
	return STORY_FILE.test(path);
}
