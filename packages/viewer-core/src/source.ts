// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Where a viewer reads run files from: a dropped folder,
 * the File System Access API, GitHub's raw files, `vscode.workspace.fs`, or a map in memory for
 * tests. Paths are relative to the source's root, separated by `/`; `""` is the root.
 */

/**
 * One entry of a directory of a source.
 *
 * @public
 */
export interface RunSourceEntry {
	/** The name of the entry, without its folder. */
	readonly name: string;
	/** A file or a directory. */
	readonly kind: "file" | "dir";
}

/**
 * Where a viewer reads run files from.
 *
 * @public
 */
export interface RunSource {
	/** Entries of a directory, relative to the source root, "" is the root; empty when it does not exist. */
	list(dir: string): Promise<readonly RunSourceEntry[]>;
	/** File content as text, or undefined when missing. */
	readText(path: string): Promise<string | undefined>;
}

/**
 * Joins path parts with `/`, dropping empty parts and leading or trailing slashes.
 *
 * @param parts - The parts of the path.
 * @returns The path, relative to the root of the source.
 * @public
 */
export function joinPath(...parts: readonly string[]): string {
	return parts
		.flatMap((part) => part.split("/"))
		.filter((part) => part !== "" && part !== ".")
		.join("/");
}

/**
 * A source over a map of path to text (tests, a parsed archive, files already in memory). Directories are implied by the paths.
 *
 * @param files - The texts by path.
 * @returns The source.
 * @public
 */
export function memorySource(files: Readonly<Record<string, string>>): RunSource {
	const texts = new Map(Object.entries(files).map(([path, text]) => [joinPath(path), text]));
	return {
		list(dir) {
			const prefix = joinPath(dir);
			const entries = new Map<string, RunSourceEntry["kind"]>();
			for (const path of texts.keys()) {
				if (prefix !== "" && !path.startsWith(`${prefix}/`)) continue;
				const rest = prefix === "" ? path : path.slice(prefix.length + 1);
				const [name, ...deeper] = rest.split("/");
				if (name === undefined || name === "") continue;
				entries.set(name, deeper.length > 0 ? "dir" : (entries.get(name) ?? "file"));
			}
			return Promise.resolve([...entries].map(([name, kind]) => ({ name, kind })).sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0)));
		},
		readText(path) {
			return Promise.resolve(texts.get(joinPath(path)));
		},
	};
}
