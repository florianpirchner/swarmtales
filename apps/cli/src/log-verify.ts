// SPDX-License-Identifier: Apache-2.0
/** `swt log verify`: checks a run folder and says whether its log holds. */
import { resolve } from "node:path";
import { formatIssue } from "@swarmtales/contracts";
import { verifyRun } from "@swarmtales/runlog";
import type { CliIo } from "./main.ts";

/**
 * Verifies the run folder and prints `ok, <n> lines, head <hash>`, or the first issue with its line; a log that
 * holds but has no end prints `unfinished, ...`. With `json` the whole verdict is printed as one JSON line.
 *
 * @param directory - The run folder, absolute or relative to the current directory.
 * @param json - Print the verdict as JSON.
 * @param io - Where the command prints and what its current directory is.
 * @returns The exit code: 0 the log holds and the run ended, 1 it is broken, 3 it holds and the run has no end.
 *
 * @public
 */
export function logVerify(directory: string, json: boolean, io: CliIo): number {
	const verdict = verifyRun(resolve(io.cwd, directory));
	const [first] = verdict.issues;
	if (json) io.out(JSON.stringify(verdict));
	else if (first !== undefined) io.err(formatIssue(first));
	else io.out(`${verdict.finished ? "ok" : "unfinished"}, ${String(verdict.lines)} lines, head ${verdict.head ?? "none"}`);
	return !verdict.ok ? 1 : verdict.finished ? 0 : 3;
}
