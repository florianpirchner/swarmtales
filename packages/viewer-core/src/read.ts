// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** Reads of the files beside the log: a file that cannot be read or does not fit becomes an issue, not a failed load. */
import type { LoadIssue } from "./events.ts";
import { parseJsonFile } from "./files.ts";
import type { RunSource } from "./source.ts";

/**
 * Runs an optional read: a source that rejects (a rate limit, a folder that went away) gives an issue.
 *
 * @param read - The read.
 * @param file - The path that is read, for the issue.
 * @param issues - The list the issue is added to.
 * @returns What the read gives, or `undefined` when it rejected.
 */
export async function optional<T>(read: () => Promise<T>, file: string, issues: LoadIssue[]): Promise<T | undefined> {
	try {
		return await read();
	} catch (error) {
		issues.push({ file, reason: `could not be read${error instanceof Error && error.message !== "" ? ` (${error.message})` : ""}` });
		return undefined;
	}
}

/**
 * Reads a JSON file of a run folder and checks its shape.
 *
 * @param source - Where the files are read from.
 * @param path - The path of the file.
 * @param check - The check of the expected shape.
 * @param issues - The list an issue is added to when the file cannot be read or does not fit.
 * @returns The value, or `undefined` when the file is missing, unreadable or of another shape.
 */
export async function readJson<T>(source: RunSource, path: string, check: (value: unknown) => value is T, issues: LoadIssue[]): Promise<T | undefined> {
	const text = await optional(() => source.readText(path), path, issues);
	if (text === undefined) return undefined;
	const parsed = parseJsonFile(text, check);
	if ("reason" in parsed) {
		issues.push({ file: path, reason: parsed.reason });
		return undefined;
	}
	return parsed.value;
}
