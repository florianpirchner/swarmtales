// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `node scripts/release/legacy-runs.ts [--sign-off "<name> <email>"]`: stages the recorded runs of the old platform
 * (`stories/<name>/runs/` and `examples/` at `v0-final`, the class "run data" of `links.ts`) into the local branch
 * `data/legacy-staging` (`13-m6-spec.md` 7.2 row 3, decision A129, O8). The branch's one commit sits on the head of
 * the run data branch and adds `legacy/stories/…` and `legacy/examples/…` at their old relative paths, a sha256
 * manifest (`sha256sum -c` reads it) and the report of `swt scan` over the staged files, so the owner pushes it to
 * the data repository after O8 as a fast-forward of its `main`.
 *
 * The trees are put together from the objects the clone holds (no file is copied into git, no archive is made); the
 * staged files are written once into a temporary folder for the manifest and the scan. It writes one local ref and
 * pushes nothing. A held key value, a scan that scanned nothing, or nothing to stage writes no branch and exits 1.
 * The manifest's digest depends on the files of `v0-final` alone, so the owner's run on his clone must print the
 * digest that the record of M6-18 holds ({@link RECORDED_DIGEST}).
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { REPO_ROOT } from "../lib/files.ts";
import { cliScanner, DATA_REPOSITORY, DATA_DEFAULT_BRANCH, type Scanner } from "./data-repo.ts";
import { commitOf, exportTree, gitRead } from "./git.ts";
import { DATA_BRANCHES, OLD_STATE } from "./links.ts";

/** The local branch the old runs are staged into; never pushed by an agent (A129). */
export const STAGING_BRANCH = "data/legacy-staging";

/** The folder of the data repository that holds the old runs, at their relative paths of `v0-final`. */
export const LEGACY_FOLDER = "legacy";

/** The manifest's file on the branch: one line `<sha256>  <path>` per staged file, sorted by path. */
export const MANIFEST_FILE = `${LEGACY_FOLDER}/MANIFEST-v0-final.sha256`;

/** The scan report's file on the branch. */
export const SCAN_FILE = `${LEGACY_FOLDER}/SCAN-v0-final.json`;

/** The sha256 of the manifest of `v0-final`, as the run of M6-18 recorded it in `docs/ISSUE-RECORD.md`. */
export const RECORDED_DIGEST = "9d4b3780b51325c071335c7187dd9d60aad8ce6c3f430151e033ebad356a363f";

/** The input of {@link stageLegacyRuns}. */
export interface StageOptions {
	/** The clone. */
	readonly root: string;
	/** The old state; {@link OLD_STATE} when left out. */
	readonly source?: string;
	/** The run data branch the staged commit sits on; the first of {@link DATA_BRANCHES} the clone holds when left out. */
	readonly base?: string;
	/** The leak scan of the staged files; {@link cliScanner} in the command. */
	readonly scan: Scanner;
	/** A `Signed-off-by` line's value for the commit, the person who runs the staging. */
	readonly signOff?: string;
	/** The digest the manifest must have; the command passes {@link RECORDED_DIGEST}. A different one writes no branch. */
	readonly expectedDigest?: string;
}

/** What the staging staged: the numbers the record holds. */
export interface Staged {
	/** The commit of the branch. */
	readonly commit: string;
	/** The number of staged files. */
	readonly files: number;
	/** Their bytes. */
	readonly bytes: number;
	/** The largest file's bytes. */
	readonly largest: number;
	/** The sha256 of the manifest's text. */
	readonly digest: string;
}

/** The result of {@link stageLegacyRuns}. */
export interface StageResult {
	/** What was staged, the digest and the owner's commands. */
	readonly lines: readonly string[];
	/** One line per problem; the branch is written only when it is empty. */
	readonly problems: readonly string[];
	/** What was staged; absent when a problem stopped the staging. */
	readonly staged?: Staged;
}

interface Entry {
	readonly mode: string;
	readonly type: string;
	readonly id: string;
	readonly name: string;
}

function gitWrite(root: string, args: readonly string[], input: string): string {
	return execFileSync("git", args, { cwd: root, input, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

/** The entries of one tree, or none when the clone does not hold it. */
function entriesOf(root: string, tree: string): readonly Entry[] {
	return (gitRead(root, ["ls-tree", "-z", tree]) ?? "").split("\0").flatMap((line) => {
		const match = /^(\d+) (\w+) ([0-9a-f]+)\t(.+)$/s.exec(line);
		return match?.[1] === undefined || match[2] === undefined || match[3] === undefined || match[4] === undefined ? [] : [{ mode: match[1], type: match[2], id: match[3], name: match[4] }];
	});
}

const makeTree = (root: string, entries: readonly Entry[]): string =>
	gitWrite(root, ["mktree", "-z"], entries.map((entry) => `${entry.mode} ${entry.type} ${entry.id}\t${entry.name}\0`).join(""));

const blob = (root: string, text: string): string => gitWrite(root, ["hash-object", "-w", "--stdin"], text);

const subtree = (name: string, id: string): Entry => ({ mode: "040000", type: "tree", id, name });

/** The tree of the run data of the old state: `stories/<name>/runs` and `examples`, nothing else of it. */
function runDataTree(root: string, source: string): string | undefined {
	const stories = entriesOf(root, `${source}:stories`).flatMap((story) => {
		const runs = story.type === "tree" ? entriesOf(root, story.id).find((entry) => entry.name === "runs" && entry.type === "tree") : undefined;
		return runs === undefined ? [] : [subtree(story.name, makeTree(root, [runs]))];
	});
	const examples = entriesOf(root, source).find((entry) => entry.name === "examples" && entry.type === "tree");
	const top = [...(stories.length === 0 ? [] : [subtree("stories", makeTree(root, stories))]), ...(examples === undefined ? [] : [examples])];
	return top.length === 0 ? undefined : makeTree(root, top);
}

/**
 * The manifest of a staged folder.
 *
 * @param folder - The folder the staged tree was written into.
 * @param paths - The paths of its files, relative to it.
 * @returns The manifest's text (paths under {@link LEGACY_FOLDER}, sorted) and the numbers of the files.
 */
export function manifestOf(folder: string, paths: readonly string[]): { readonly text: string; readonly bytes: number; readonly largest: number } {
	let bytes = 0;
	let largest = 0;
	const lines = [...paths].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)).map((path) => {
		const content = readFileSync(join(folder, path));
		bytes += content.length;
		largest = Math.max(largest, content.length);
		return `${createHash("sha256").update(content).digest("hex")}  ${LEGACY_FOLDER}/${path}\n`;
	});
	return { text: lines.join(""), bytes, largest };
}

const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");

/** Writes the run data tree into a temporary folder, makes the manifest and scans it. */
function manifestAndScan(root: string, tree: string, scan: Scanner): { manifest: ReturnType<typeof manifestOf> & { files: number }; report: string } | string {
	const folder = mkdtempSync(join(tmpdir(), "swt-legacy-runs-"));
	try {
		const files = exportTree(root, tree, folder);
		const paths = (gitRead(root, ["ls-tree", "-r", "--name-only", "-z", tree]) ?? "").split("\0").filter((path) => path !== "");
		const manifest = { ...manifestOf(folder, paths), files };
		const outcome = scan(folder);
		if (outcome.clean === null) return "`swt scan` scanned nothing: no key variable is set, so no value can be looked for; nothing was staged";
		if (!outcome.clean) return "`swt scan` found a held key value in the old runs; nothing was staged";
		const report = { source: "v0-final", files, bytes: manifest.bytes, manifest: MANIFEST_FILE, manifestSha256: sha256(manifest.text), scan: { clean: true, files: outcome.files } };
		return { manifest, report: `${JSON.stringify(report, null, "\t")}\n` };
	} finally {
		rmSync(folder, { recursive: true, force: true });
	}
}

/** The root tree of the base with the old runs, the manifest and the report added under {@link LEGACY_FOLDER}. */
function stagedTree(root: string, base: string, runData: string, manifest: string, report: string): string | undefined {
	const rootEntries = entriesOf(root, base);
	const current = rootEntries.find((entry) => entry.name === LEGACY_FOLDER);
	const legacy = current === undefined ? [] : entriesOf(root, current.id);
	const added = [...entriesOf(root, runData), { mode: "100644", type: "blob", id: blob(root, manifest), name: MANIFEST_FILE.slice(LEGACY_FOLDER.length + 1) }, { mode: "100644", type: "blob", id: blob(root, report), name: SCAN_FILE.slice(LEGACY_FOLDER.length + 1) }];
	if (legacy.some((entry) => added.some((add) => add.name === entry.name))) return undefined;
	const folder = makeTree(root, [...legacy, ...added]);
	return makeTree(root, [...rootEntries.filter((entry) => entry.name !== LEGACY_FOLDER), subtree(LEGACY_FOLDER, folder)]);
}

/**
 * The owner's commands after O8, printed and never run.
 *
 * @param commit - The commit of the staging branch.
 * @returns The commands, with the checks around them.
 */
export function stagingCommands(commit: string): readonly string[] {
	const url = `https://github.com/${DATA_REPOSITORY}.git`;
	return [
		"# after O8, the owner's hand: the old runs into the data repository, a fast-forward of its main",
		`git push ${url} ${commit}:refs/heads/${DATA_DEFAULT_BRANCH}`,
		`# check, in a checkout of ${DATA_REPOSITORY}: \`sha256sum -c ${MANIFEST_FILE}\` passes for every line`,
	];
}

/**
 * Stages the old runs into {@link STAGING_BRANCH}.
 *
 * @param options - The clone, the old state, the base branch, the leak scan and the sign-off.
 * @returns What was staged and the owner's commands; the branch is written only when `problems` is empty.
 * @throws What git throws when an object cannot be written or the ref cannot be set.
 */
export function stageLegacyRuns(options: StageOptions): StageResult {
	const inputs = resolveInputs(options);
	if (typeof inputs === "string") return { lines: [], problems: [inputs] };
	const { root, source, base, baseRef, runData } = inputs;
	const made = manifestAndScan(root, runData, options.scan);
	if (typeof made === "string") return { lines: [], problems: [made] };
	const digest = sha256(made.manifest.text);
	if (options.expectedDigest !== undefined && digest !== options.expectedDigest) return { lines: [`manifest digest: ${digest}`], problems: [`the manifest digest differs from the record of M6-18 (${options.expectedDigest}); nothing was staged`] };
	const tree = stagedTree(root, base, runData, made.manifest.text, made.report);
	if (tree === undefined) return { lines: [], problems: [`${baseRef} already holds a path of the staging under ${LEGACY_FOLDER}/`] };
	const signOff = options.signOff === undefined ? "" : `\nSigned-off-by: ${options.signOff}\n`;
	const message = `Legacy runs of v0-final, staged (M6-18)\n\n${String(made.manifest.files)} files, manifest sha256 ${digest}\n${signOff}`;
	const commit = gitWrite(root, ["commit-tree", tree, "-p", base, "-F", "-"], message);
	gitWrite(root, ["update-ref", `refs/heads/${STAGING_BRANCH}`, commit], "");
	const staged = { commit, files: made.manifest.files, bytes: made.manifest.bytes, largest: made.manifest.largest, digest };
	const lines = [
		`staged ${String(staged.files)} files, ${(staged.bytes / 1e6).toFixed(1)} MB (largest ${(staged.largest / 1e6).toFixed(2)} MB) of ${source.slice(0, 8)} on ${baseRef} (${base.slice(0, 8)})`,
		`branch ${STAGING_BRANCH} at ${commit}, local only`,
		`manifest digest: ${digest}`,
		...stagingCommands(commit),
	];
	return { lines, problems: [], staged };
}

/** The commits and the run data tree of a staging, or why there is nothing to stage. */
function resolveInputs(options: StageOptions): { root: string; source: string; base: string; baseRef: string; runData: string } | string {
	const { root } = options;
	const source = commitOf(root, options.source ?? OLD_STATE);
	const baseRef = options.base ?? DATA_BRANCHES.find((name) => commitOf(root, name) !== undefined) ?? DATA_BRANCHES[0];
	const base = commitOf(root, baseRef);
	if (source === undefined) return `the clone does not hold the old state ${options.source ?? OLD_STATE}`;
	if (base === undefined) return `the clone holds no branch ${baseRef}`;
	const runData = runDataTree(root, source);
	if (runData === undefined) return "the old state holds no `stories/<name>/runs/` and no `examples/`; nothing was staged";
	return { root, source, base, baseRef, runData };
}

function main(args: readonly string[]): number {
	const at = args.indexOf("--sign-off");
	const signOff = at >= 0 ? args[at + 1] : undefined;
	const result = stageLegacyRuns({ root: REPO_ROOT, scan: cliScanner(REPO_ROOT), expectedDigest: RECORDED_DIGEST, ...(signOff === undefined ? {} : { signOff }) });
	for (const line of result.lines) console.log(line);
	for (const problem of result.problems) console.error(`legacy-runs: ${problem}`);
	console.log(result.problems.length === 0 ? "legacy-runs: staged locally; the push is the owner's (O8)" : `legacy-runs: ${String(result.problems.length)} problem(s)`);
	return result.problems.length === 0 ? 0 : 1;
}

if (process.argv[1] === import.meta.filename) process.exitCode = main(process.argv.slice(2));
