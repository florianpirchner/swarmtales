// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `pnpm release:check [<version>] [--branch <name>] [--no-build]`: the check of a release candidate (`13-m6-spec.md`
 * 6.3, issue M6-21). It builds the workspace, packs every package of the published list into a temporary folder,
 * runs the content check of 6.2 on each tarball (`tarball.ts`) and `swt scan` over all of them, checks the published
 * list and its version lines (the gate `release-list.test.ts`, and the platform's at `<version>` when given), that
 * `THIRD-PARTY-LICENSES.md` is fresh, that the tree is clean and that the head is on the line of work (`develop` once
 * it exists, `rewrite/develop` until the switch, A5), and prints the owner's publish commands in dependency order.
 * It publishes nothing: the publish is the owner's (O12). Exits 1 on a problem.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { REPO_ROOT } from "../lib/files.ts";
import { cliScanner, type Scanner } from "./data-repo.ts";
import { commitOf, gitRead } from "./git.ts";
import { type ListedPackage, publishOrder, readList, versionProblems } from "./list.ts";
import { readTarball, type TarballExpectation, tarballProblems, unpackInto } from "./tarball.ts";

/** The files the root `NOTICE` names that only a clone holds (6.2). */
export const CLONE_ONLY: readonly string[] = ["LICENSE-FAQ.md", "THIRD-PARTY-LICENSES.md", "third_party/"];

/**
 * The checks of the clone: a clean tree, and the head on the line of work.
 *
 * @param root - The clone.
 * @param branch - The branch the head must be on.
 * @returns One line per problem.
 */
export function treeProblems(root: string, branch: string): readonly string[] {
	const status = gitRead(root, ["status", "--porcelain"]);
	const problems = status === undefined ? ["git status cannot be read"] : status.trim() === "" ? [] : [`the tree is not clean: ${String(status.trim().split("\n").length)} changed or untracked path(s)`];
	if (commitOf(root, branch) === undefined) problems.push(`the clone holds no branch ${branch}`);
	else if (gitRead(root, ["merge-base", "--is-ancestor", "HEAD", branch]) === undefined) problems.push(`the head is not on ${branch}`);
	return problems;
}

/**
 * The owner's publish commands (O12), in dependency order; printed, never run.
 *
 * @param packages - The listed packages.
 * @returns The commands with their comments.
 */
export function publishCommands(packages: readonly ListedPackage[]): readonly string[] {
	return [
		"# O12, the owner's hand, after the milestone review of M6 and O2: publish in dependency order; pnpm asks for the 2FA code",
		...publishOrder(packages).map((entry) => `pnpm --dir ${entry.folder} publish --access public`),
		"# check: pnpm release:names --owner <npm user> shows every name held by the owner",
	];
}

/** Runs a command in a folder; the problem it gives, or none. */
function run(command: string, args: readonly string[], cwd: string): string | undefined {
	const done = spawnSync(command, args, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
	return done.status === 0 ? undefined : `\`${[command, ...args].join(" ")}\` failed in ${cwd}: ${(done.stderr || done.stdout).trim().split("\n").slice(-3).join(" / ")}`;
}

/**
 * Packs every listed package and checks each tarball (6.2), then scans the unpacked tarballs.
 *
 * @param root - The repository root.
 * @param packages - The listed packages.
 * @param scan - The leak scan of a folder.
 * @returns What was packed, and one line per problem.
 */
export function packAndCheck(root: string, packages: readonly ListedPackage[], scan: Scanner): { lines: readonly string[]; problems: readonly string[] } {
	const temp = mkdtempSync(join(tmpdir(), "swt-release-"));
	const expected: TarballExpectation = { licence: readFileSync(join(root, "LICENSE"), "utf8"), cloneOnly: CLONE_ONLY, localPaths: [root] };
	const problems: string[] = [];
	let files = 0;
	try {
		for (const [index, entry] of packages.entries()) {
			const into = join(temp, "packed", String(index));
			mkdirSync(into, { recursive: true });
			const failed = run("pnpm", ["pack", "--pack-destination", into], join(root, entry.folder));
			const tarball = readdirSync(into).find((name) => name.endsWith(".tgz"));
			if (failed !== undefined || tarball === undefined) {
				problems.push(`${entry.name}: ${failed ?? "pnpm pack wrote no tarball"}`);
				continue;
			}
			const content = readTarball(join(into, tarball));
			files += content.size;
			problems.push(...tarballProblems(content, expected).map((problem) => `${entry.name}: ${problem}`));
			unpackInto(content, join(temp, "unpacked", String(index)));
		}
		const outcome = scan(join(temp, "unpacked"));
		if (outcome.clean !== true) problems.push(outcome.clean === null ? "`swt scan` scanned nothing: no key variable is set" : "`swt scan` found a held key value in a tarball");
		return { lines: [`packed ${String(packages.length)} packages, ${String(files)} files; swt scan: ${outcome.clean === true ? "clean" : "not clean"}`], problems };
	} finally {
		rmSync(temp, { recursive: true, force: true });
	}
}

/** The branch of `--branch`, or the line of work: `develop` once the clone holds it, `rewrite/develop` before (A5). */
function branchOf(args: readonly string[]): string {
	const at = args.indexOf("--branch");
	return at >= 0 ? (args[at + 1] ?? "") : commitOf(REPO_ROOT, "develop") === undefined ? "rewrite/develop" : "develop";
}

function main(args: readonly string[]): number {
	const branch = branchOf(args);
	const packages = readList(REPO_ROOT);
	const version = args.find((arg, index) => !arg.startsWith("--") && args[index - 1] !== "--branch");
	const problems = [...versionProblems(packages, version), ...treeProblems(REPO_ROOT, branch)];
	if (run("pnpm", ["exec", "vitest", "run", "scripts/gates/release-list.test.ts"], REPO_ROOT) !== undefined) problems.push("the gate of the published list fails: pnpm exec vitest run scripts/gates/release-list.test.ts");
	if (run(process.execPath, ["scripts/check-licences.ts", "--check"], REPO_ROOT) !== undefined) problems.push("THIRD-PARTY-LICENSES.md is stale or the licence gate fails: run pnpm check:licences");
	const built = args.includes("--no-build") ? undefined : run("pnpm", ["build"], REPO_ROOT);
	const packed = packAndCheck(REPO_ROOT, packages, cliScanner(REPO_ROOT));
	problems.push(...(built === undefined ? [] : [built]), ...packed.problems);
	for (const problem of problems) console.error(`release:check: ${problem}`);
	const green = [...publishCommands(packages), `release:check: green on ${branch}; every command above is the owner's (O12)`];
	for (const line of [...packed.lines, ...(problems.length === 0 ? green : [`release:check: ${String(problems.length)} problem(s); nothing to publish`])]) console.log(line);
	return problems.length === 0 ? 0 : 1;
}

if (process.argv[1] === import.meta.filename) process.exitCode = main(process.argv.slice(2));
