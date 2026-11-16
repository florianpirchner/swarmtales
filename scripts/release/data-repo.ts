// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `node scripts/release/data-repo.ts [--ref <branch>]`: the dry run of the data repository (`13-m6-spec.md` 7.1, O8,
 * decision A129). The run data branch `data/runs` moves to the repository `swarmtales-runs` with one push of its
 * head, so every commit id stays true. The dry run is the only mode: it reads the clone, lists what the first push
 * holds, checks the branch and prints the owner's commands. It pushes nothing and creates nothing.
 *
 * Checks: the branch has its `README.md` and the project's `LICENSE` (A65, byte-equal to the root's); every row of
 * every `games/<name>/RUNS.md` names a path and a data commit that exist on the branch; every link to `data/runs`
 * has a class (`links.ts`); `swt scan` is clean over the files of the head. Exits 1 on a problem.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { REPO_ROOT } from "../lib/files.ts";
import { commitOf, exportTree, gitRead, treePaths } from "./git.ts";
import { classCounts, classifyRepository, DATA_BRANCHES, linkProblems } from "./links.ts";
import { allRunsRows, rowProblem } from "./runs-index.ts";

/** The data repository of O8. */
export const DATA_REPOSITORY = "florianpirchner/swarmtales-runs";

/** The branch the head of `data/runs` becomes in the data repository, and its default branch. */
export const DATA_DEFAULT_BRANCH = "main";

/** What a leak scan of a folder found: `clean` is `null` when nothing was scanned because no key is held. */
export interface ScanOutcome {
	readonly clean: boolean | null;
	readonly files: number;
}

/** Scans a folder for held key values. */
export type Scanner = (folder: string) => ScanOutcome;

/** The input of {@link dryRun}. */
export interface DryRunOptions {
	/** The clone, with the work tree whose runs indexes and links are checked. */
	readonly root: string;
	/** The branch; the first of {@link DATA_BRANCHES} the clone holds when left out. */
	readonly ref?: string;
	/** The leak scan; {@link cliScanner} in the command. */
	readonly scan: Scanner;
}

/** The result of {@link dryRun}. */
export interface DryRunResult {
	/** What the first push holds, the counts, and the owner's commands. */
	readonly lines: readonly string[];
	/** One line per problem; the dry run passes when it is empty. */
	readonly problems: readonly string[];
}

const ScanLine = Type.Object({
	clean: Type.Union([Type.Boolean(), Type.Null()], { description: "True when no file holds a held key value; null when nothing was scanned" }),
	files: Type.Number({ description: "The number of files scanned" }),
}, { description: "The JSON line of `swt scan --json`" });

/**
 * The leak scan of the command line: `swt scan <folder> --json`, run from the CLI's source with the environment of
 * this process, which only the CLI reads (`apps/cli/src/env.ts`).
 *
 * @param root - The repository root that holds `apps/cli`.
 * @returns The scanner.
 * @throws SyntaxError or TypeError when the command prints no JSON line of the expected shape.
 */
export function cliScanner(root: string): Scanner {
	return (folder) => {
		const run = spawnSync(process.execPath, ["--conditions=development", join(root, "apps/cli/src/bin.ts"), "scan", folder, "--json"], { encoding: "utf8" });
		const last = run.stdout.trim().split("\n").at(-1) ?? "";
		const parsed: unknown = JSON.parse(last === "" ? "null" : last);
		if (!Value.Check(ScanLine, parsed)) throw new TypeError("data-repo: `swt scan --json` printed no result line");
		return { clean: parsed.clean, files: parsed.files };
	};
}

/**
 * The owner's commands of O8, printed by the dry run and never run by it.
 *
 * @param head - The full commit id of the branch's head.
 * @returns The commands, with the check after them.
 */
export function ownerCommands(head: string): readonly string[] {
	const url = `https://github.com/${DATA_REPOSITORY}.git`;
	return [
		"# O8, the owner's hand: create the data repository and push the run data branch as its default branch",
		`gh repo create ${DATA_REPOSITORY} --private --description "Run data of Swarm Tales"`,
		`git push ${url} ${head}:refs/heads/${DATA_DEFAULT_BRANCH}`,
		`gh repo edit ${DATA_REPOSITORY} --default-branch ${DATA_DEFAULT_BRANCH}`,
		`# check: \`git ls-remote ${url} refs/heads/${DATA_DEFAULT_BRANCH}\` prints ${head}`,
	];
}

function fileProblems(root: string, head: string): readonly string[] {
	const problems: string[] = [];
	if (gitRead(root, ["cat-file", "-e", `${head}:README.md`]) === undefined) problems.push("the branch has no README.md");
	const licence = gitRead(root, ["cat-file", "blob", `${head}:LICENSE`]);
	if (licence === undefined) problems.push("the branch has no LICENSE; add the project's LICENSE (A65) in one data commit");
	else if (licence !== readFileSync(join(root, "LICENSE"), "utf8")) problems.push("the branch's LICENSE is not the project's (A65): it differs from the root LICENSE");
	return problems;
}

function scanProblems(root: string, head: string, scan: Scanner): { line: string; problems: readonly string[] } {
	const folder = mkdtempSync(join(tmpdir(), "swt-data-repo-"));
	try {
		const written = exportTree(root, head, folder);
		const outcome = scan(folder);
		if (outcome.clean === null) return { line: "scan: not scanned", problems: ["`swt scan` scanned nothing: no key variable is set, so no value can be looked for"] };
		const line = `scan: ${outcome.clean ? "clean" : "a held key value found"}, ${String(outcome.files)} of ${String(written)} files`;
		return { line, problems: outcome.clean ? [] : ["`swt scan` found a held key value on the branch; the branch is not pushed"] };
	} finally {
		rmSync(folder, { recursive: true, force: true });
	}
}

function holdings(root: string, ref: string, head: string): readonly string[] {
	const sizes = (gitRead(root, ["ls-tree", "-r", "-l", head]) ?? "").trim().split("\n").map((line) => Number(line.split(/\s+/)[3]) || 0);
	const top = (gitRead(root, ["ls-tree", "--name-only", head]) ?? "").trim().split("\n").join(", ");
	const megabytes = (sizes.reduce((sum, size) => sum + size, 0) / 1e6).toFixed(1);
	return [`the first push holds ${ref} at ${head}: ${String(sizes.length)} files, ${megabytes} MB`, `top level: ${top}`];
}

/**
 * The dry run of the data repository.
 *
 * @param options - The clone, the branch and the leak scan.
 * @returns What it found and the owner's commands; it passes when `problems` is empty.
 */
export function dryRun(options: DryRunOptions): DryRunResult {
	const { root } = options;
	const ref = options.ref ?? DATA_BRANCHES.find((name) => commitOf(root, name) !== undefined) ?? DATA_BRANCHES[0];
	const head = commitOf(root, ref);
	const data = head === undefined ? undefined : treePaths(root, head);
	if (head === undefined || data === undefined) return { lines: [], problems: [`the clone holds no branch ${ref}`] };
	const rows = allRunsRows(root);
	const rowProblems = rows.flatMap((row) => rowProblem(root, head, row) ?? []);
	const links = classifyRepository({ old: new Set(), data }, root).filter((link) => link.ref === "data/runs");
	const linkIssues = links.length === 0 ? [] : linkProblems(links);
	const scan = scanProblems(root, head, options.scan);
	const lines = [
		...holdings(root, ref, head),
		`runs indexes: ${String(rows.length)} rows, ${String(rows.length - rowProblems.length)} with a path and a data commit on the branch`,
		...classCounts(links).map((line) => `links: ${line}`),
		scan.line,
		...ownerCommands(head),
	];
	const problems = [...fileProblems(root, head), ...(rows.length === 0 ? ["no row of a runs index names a data commit; nothing was checked"] : rowProblems), ...linkIssues, ...scan.problems];
	return { lines, problems };
}

function main(args: readonly string[]): number {
	const at = args.indexOf("--ref");
	const ref = at >= 0 ? args[at + 1] : undefined;
	const result = dryRun({ root: REPO_ROOT, scan: cliScanner(REPO_ROOT), ...(ref === undefined ? {} : { ref }) });
	for (const line of result.lines) console.log(line);
	for (const problem of result.problems) console.error(`data-repo: ${problem}`);
	console.log(result.problems.length === 0 ? "data-repo: the dry run passes; the push is the owner's (O8)" : `data-repo: ${String(result.problems.length)} problem(s)`);
	return result.problems.length === 0 ? 0 : 1;
}

if (process.argv[1] === import.meta.filename) process.exitCode = main(process.argv.slice(2));
