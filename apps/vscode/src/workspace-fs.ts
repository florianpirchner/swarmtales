/** `FolderFiles` over `vscode.workspace.fs`, which also reads the virtual file systems of github.dev and vscode.dev. */
import type { RunSourceEntry } from "@swarmtales/viewer-core";
import * as vscode from "vscode";
import type { FolderFiles } from "./folder-files.ts";

const decoder = new TextDecoder("utf-8");

function child(root: vscode.Uri, path: string): vscode.Uri {
	return path === "" ? root : vscode.Uri.joinPath(root, ...path.split("/"));
}

/**
 * Files under one folder, never through a symbolic link: a link is left out of every listing, and a
 * read or listing whose path passes through one (checked part by part with `stat`) is refused, so a
 * link in a run folder cannot reach a file outside the opened folder.
 */
export function workspaceFiles(root: vscode.Uri): FolderFiles {
	// Folders already checked to be no link (a run's files are read from the same few folders).
	const plain = new Set<string>([""]);
	async function noLink(path: string): Promise<boolean> {
		const parts = path === "" ? [] : path.split("/");
		for (let end = 1; end <= parts.length; end++) {
			const prefix = parts.slice(0, end).join("/");
			if (plain.has(prefix)) continue;
			const { type } = await vscode.workspace.fs.stat(child(root, prefix));
			if ((type & vscode.FileType.SymbolicLink) !== 0) return false;
			if ((type & vscode.FileType.Directory) !== 0) plain.add(prefix);
		}
		return true;
	}
	return {
		async list(dir) {
			try {
				if (!(await noLink(dir))) return [];
				const entries = await vscode.workspace.fs.readDirectory(child(root, dir));
				return entries.flatMap(([name, type]): RunSourceEntry[] => {
					if ((type & vscode.FileType.SymbolicLink) !== 0) return [];
					if ((type & vscode.FileType.Directory) !== 0) return [{ name, kind: "dir" }];
					if ((type & vscode.FileType.File) !== 0) return [{ name, kind: "file" }];
					return [];
				});
			} catch {
				return [];
			}
		},
		async readText(path) {
			try {
				if (!(await noLink(path))) return undefined;
				return decoder.decode(await vscode.workspace.fs.readFile(child(root, path)));
			} catch {
				return undefined;
			}
		},
	};
}

/** The folder a file is in. */
export function parentOf(uri: vscode.Uri): vscode.Uri {
	return vscode.Uri.joinPath(uri, "..");
}
