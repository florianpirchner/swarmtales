// SPDX-License-Identifier: Apache-2.0
/** A RunSource over a list of files (a picked or dropped folder, a File System Access directory), read lazily. */
import { joinPath, type RunSource, type RunSourceEntry } from "@swarmtales/viewer-core";

/** One file of a picked or dropped folder. */
export interface SourceFile {
	/** The path below the source root, `/` separated. */
	readonly path: string;
	read(): Promise<string>;
}

/** The files of a source; a path outside the list is a missing file. The first path segment is the picked folder's own name and stays part of the paths. */
export function filesSource(files: readonly SourceFile[]): RunSource {
	const byPath = new Map(files.map((file) => [joinPath(file.path), file]));
	return {
		list(dir) {
			const prefix = joinPath(dir);
			const entries = new Map<string, RunSourceEntry["kind"]>();
			for (const path of byPath.keys()) {
				if (prefix !== "" && !path.startsWith(`${prefix}/`)) continue;
				const [name, ...deeper] = (prefix === "" ? path : path.slice(prefix.length + 1)).split("/");
				if (name === undefined || name === "") continue;
				entries.set(name, deeper.length > 0 ? "dir" : (entries.get(name) ?? "file"));
			}
			return Promise.resolve([...entries].map(([name, kind]) => ({ name, kind })).sort((left, right) => (left.name < right.name ? -1 : 1)));
		},
		async readText(path) {
			return byPath.get(joinPath(path))?.read();
		},
	};
}

/** The part of a `File` the source needs (a plain object in tests). */
export interface FileLike {
	readonly name: string;
	readonly webkitRelativePath?: string;
	text(): Promise<string>;
}

/** Files of an `<input webkitdirectory>`: each carries its path from the picked folder in `webkitRelativePath`. */
export function sourceFilesOf(files: readonly FileLike[]): readonly SourceFile[] {
	return files.map((file) => ({ path: file.webkitRelativePath === undefined || file.webkitRelativePath === "" ? file.name : file.webkitRelativePath, read: () => file.text() }));
}

/** The first path segment shared by all files (the folder's name), or the fallback. */
export function rootName(files: readonly SourceFile[], fallback = "folder"): string {
	const first = files[0]?.path.split("/")[0];
	return first !== undefined && files.every((file) => file.path.split("/")[0] === first) ? first : fallback;
}
