// SPDX-License-Identifier: Apache-2.0
/** File helpers shared by the gates. Paths are relative to the repository root and use forward slashes. */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

/** The repository root. */
export const REPO_ROOT = resolve(import.meta.dirname, "..", "..");

/**
 * Folders that no gate reads: dependencies, build output, local run output and git's own files. Git ignores them
 * all; a test fails on a tracked file inside one.
 */
export const SKIPPED_FOLDERS: ReadonlySet<string> = new Set(["node_modules", "dist", "dist-types", "temp", ".git", "runs", "worktrees"]);

/**
 * Lists the files under a folder of the repository, in a stable order.
 *
 * @param directory - The folder, relative to the root; `"."` is the whole repository.
 * @param keep - Says whether a file (by its relative path) belongs to the result.
 * @param root - The root to read from; the repository root when left out.
 * @returns The relative paths of the kept files. A folder that does not exist gives an empty list.
 */
export function listFiles(directory: string, keep: (path: string) => boolean, root: string = REPO_ROOT): readonly string[] {
	const absolute = join(root, directory);
	if (!existsSync(absolute)) return [];
	const found: string[] = [];
	for (const entry of readdirSync(absolute, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, "en"))) {
		const path = directory === "." ? entry.name : `${directory}/${entry.name}`;
		if (entry.isDirectory()) {
			if (!SKIPPED_FOLDERS.has(entry.name)) found.push(...listFiles(path, keep, root));
		} else if (keep(path)) found.push(path);
	}
	return found;
}

/**
 * Reads a text file of the repository.
 *
 * @param path - The path, relative to the root.
 * @param root - The root to read from; the repository root when left out.
 * @returns The file's text.
 */
export function readText(path: string, root: string = REPO_ROOT): string {
	return readFileSync(join(root, path), "utf8");
}

/** The suffixes of source files: what carries an SPDX header and what the linter reads. */
export const SOURCE_SUFFIXES = [".ts", ".tsx", ".js", ".mjs", ".cjs"] as const;

/**
 * Says whether a path names a source file.
 *
 * @param path - The path.
 * @returns True for a TypeScript or JavaScript file.
 */
export function isSourceFile(path: string): boolean {
	return SOURCE_SUFFIXES.some((suffix) => path.endsWith(suffix));
}

/**
 * Says whether a path names a test file.
 *
 * @param path - The path.
 * @returns True for `*.test.ts` and for files in the `test` folder of a package (`<folder>/<package>/test/`). A
 * folder named `test` under `src/` is not one: code there counts as code.
 */
export function isTestFile(path: string): boolean {
	return /\.test\.tsx?$/.test(path) || /^[^/]+\/[^/]+\/test\//.test(path);
}
