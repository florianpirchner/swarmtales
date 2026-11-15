// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** `swt log verify`: checks a run folder and says whether its log holds. */
import { resolve } from "node:path";
import { formatIssue } from "@swarmtales/contracts";
import { verifyRun } from "@swarmtales/runlog";
import type { CliIo } from "./main.ts";

/**
 * Verifies the run folder and prints `ok, <n> lines, head <hash>`, or the first issue with its line; a log that
 * holds but has no end prints `unfinished, ...`. A resumed run's line ends with `, continuity holds` when `previous`
 * was given and the run continues that folder's run, and with `, continuity not checked` without `previous`; a run
 * that does not continue it is broken (`SWT-L007`). With `json` the whole verdict is printed as one JSON line.
 *
 * @param directory - The run folder, absolute or relative to the current directory.
 * @param json - Print the verdict as JSON.
 * @param io - Where the command prints and what its current directory is.
 * @param previous - `--previous`: the folder of the run this run resumed from; continuity is not checked when absent.
 * @returns The exit code: 0 the log holds and the run ended, 1 it is broken, 3 it holds and the run has no end.
 *
 * @public
 */
export function logVerify(directory: string, json: boolean, io: CliIo, previous?: string): number {
	const verdict = verifyRun(resolve(io.cwd, directory), previous === undefined ? {} : { previous: resolve(io.cwd, previous) });
	const continuity = verdict.continuity === undefined ? "" : `, continuity ${verdict.continuity === "holds" ? "holds" : "not checked"}`;
	const [first] = verdict.issues;
	if (json) io.out(JSON.stringify(verdict));
	else if (first !== undefined) io.err(formatIssue(first));
	else io.out(`${verdict.finished ? "ok" : "unfinished"}, ${String(verdict.lines)} lines, head ${verdict.head ?? "none"}${continuity}`);
	return !verdict.ok ? 1 : verdict.finished ? 0 : 3;
}
