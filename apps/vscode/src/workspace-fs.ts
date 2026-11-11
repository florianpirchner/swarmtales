/** `FolderFiles` over `vscode.workspace.fs`, which also reads the virtual file systems of github.dev and vscode.dev. */
import type { RunSourceEntry } from "@swarmtales/viewer-core";
import * as vscode from "vscode";
import type { FolderFiles } from "./folder-files.ts";

const decoder = new TextDecoder("utf-8");

function child(root: vscode.Uri, path: string): vscode.Uri {
	return path === "" ? root : vscode.Uri.joinPath(root, ...path.split("/"));
}

export function workspaceFiles(root: vscode.Uri): FolderFiles {
	return {
		async list(dir) {
			try {
				const entries = await vscode.workspace.fs.readDirectory(child(root, dir));
				return entries.flatMap(([name, type]): RunSourceEntry[] => {
					// A symbolic link counts as what it points to (the flag is added to File or Directory).
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
