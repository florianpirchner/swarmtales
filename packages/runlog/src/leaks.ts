// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The leak scan of a run folder: which of its files hold what a given test calls a leak. */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * Reads every file under `directory`, in every folder below it, and returns the paths in which `leaks` answers
 * true. A file is read as UTF-8 text; the scan never returns, prints or keeps what it read.
 *
 * @param directory - The folder to scan: a run folder.
 * @param leaks - The test of one file's text: `leaks` of the key broker.
 * @returns The paths of the files that hold a leak, relative to `directory` with `/` between the parts, sorted;
 * empty when no file does.
 * @throws What the file system throws when the folder or a file of it cannot be read.
 * @example
 * ```ts
 * const files = findLeaks("runs/quarry-001", broker.leaks); // ["events.jsonl"] when a key reached the log
 * ```
 *
 * @public
 */
export function findLeaks(directory: string, leaks: (text: string) => boolean): readonly string[] {
	return readdirSync(directory, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => join(entry.parentPath, entry.name))
		.filter((file) => leaks(readFileSync(file, "utf8")))
		.map((file) => relative(directory, file).split(sep).join("/"))
		.sort();
}
