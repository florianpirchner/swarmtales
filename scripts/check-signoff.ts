// SPDX-License-Identifier: Apache-2.0
/**
 * `pnpm check:signoff [<revision range>]`: every commit carries the `Signed-off-by` line of a person (Developer
 * Certificate of Origin, see CONTRIBUTING.md and `lib/signoff.ts`). Without an argument it checks every commit
 * that `HEAD` reaches; merge commits are left out, because a hosting service writes them.
 *
 * The check never passes on nothing: outside a git checkout, on a history that a shallow clone cut off and on an
 * empty range it fails.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "./lib/files.ts";
import { LOG_FORMAT, parseLog, unsigned } from "./lib/signoff.ts";

function git(...args: readonly string[]): string | undefined {
	try {
		return execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
	} catch {
		return undefined;
	}
}

function fail(reason: string): number {
	console.error(`signoff: ${reason}`);
	return 1;
}

/** Says whether the range reaches a commit whose parents a shallow clone left out, so older commits are hidden. */
function reachesShallowBoundary(range: string): boolean {
	const commonDir = git("rev-parse", "--path-format=absolute", "--git-common-dir")?.trim();
	const reached = git("rev-list", range);
	if (commonDir === undefined || reached === undefined) return true;
	const file = join(commonDir, "shallow");
	const boundary = new Set(existsSync(file) ? readFileSync(file, "utf8").split("\n").filter((line) => line !== "") : []);
	return reached.split("\n").some((hash) => boundary.has(hash));
}

function main(range: string): number {
	if (git("rev-parse", "--is-inside-work-tree")?.trim() !== "true") return fail("not a git checkout; the sign-off of the commits cannot be checked");
	if (reachesShallowBoundary(range)) return fail(`the history of ${range} is cut off (shallow clone); fetch the whole history (fetch-depth: 0)`);
	const output = git("log", "--no-merges", `--format=${LOG_FORMAT}`, range);
	if (output === undefined) return fail(`git log ${range} failed`);
	const commits = parseLog(output);
	if (commits.length === 0) return fail(`no commit in ${range}; nothing was checked`);
	const missing = unsigned(commits);
	for (const line of missing) console.error(`signoff: ${line}`);
	if (missing.length > 0) return fail(`${missing.length} of ${commits.length} commit(s) without a valid sign-off; see CONTRIBUTING.md`);
	console.log(`signoff: ${commits.length} commit(s), each signed off by a person`);
	return 0;
}

process.exitCode = main(process.argv[2] ?? "HEAD");
