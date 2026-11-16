// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `node scripts/release/switch-main.ts [--remote <name>] [--target <commit>] [--pulls <file.json>] [--verify]`: the
 * switch of `main` to the new platform, prepared (`13-m6-spec.md` 7.3 and 7.4, O3, decision A130). It reads the
 * remote with `git ls-remote` and the open pull requests against `main` with `gh api`, both read-only, checks, and
 * prints the owner's commands: the owed tags, the retargets of open pull requests to `legacy`, the force push of
 * `main` with its lease, `develop`, the default branch and O4. `--verify` checks the remote after the switch. It
 * writes no ref, locally or on the remote. Exits 1 on a problem.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { REPO_ROOT } from "../lib/files.ts";
import { commitOf, gitRead } from "./git.ts";
import { LEGACY_COMMIT, MILESTONE_CLOSES, type OwedTag, owedTags, REWRITE_ROOT } from "./tags.ts";

/** The repository whose `main` is switched. */
export const REPOSITORY = "florianpirchner/swarmtales";

/** An open pull request whose base is `main`. */
export interface OpenPull {
	readonly number: number;
	readonly title: string;
}

/** Reads the open pull requests against `main`; `undefined` when they cannot be read. */
export type PullSource = () => readonly OpenPull[] | undefined;

/** Where the switch stands: no `v0-final` on the remote, ready, done, or held by a problem. */
export type SwitchState = "tag missing" | "ready" | "switched" | "blocked";

/** The input of {@link checkSwitch} and {@link verifySwitch}. */
export interface SwitchOptions {
	/** The local clone that holds the target and the history. */
	readonly root: string;
	/** The remote to read: a name of the clone's remotes or a URL or path. */
	readonly remote: string;
	/** The commit `main` becomes; the close of the last milestone of {@link MILESTONE_CLOSES} when left out. */
	readonly target?: string;
	/** The open pull requests against `main`. */
	readonly pulls: PullSource;
	/** The tags of 7.4 with `v0-final` first; {@link owedTags} of the clone in the command. */
	readonly tags: readonly OwedTag[];
	/** The commit of `legacy` and `v0-final`; {@link LEGACY_COMMIT} when left out. */
	readonly legacy?: string;
	/** The root the target descends from; {@link REWRITE_ROOT} when left out. */
	readonly rewriteRoot?: string;
}

/** The result of a check or a verify. */
export interface SwitchResult {
	readonly state: SwitchState;
	/** What was read, and the owner's commands. */
	readonly lines: readonly string[];
	/** One line per problem; empty when the step may go ahead. */
	readonly problems: readonly string[];
}

/** The refs of a remote: branches and tags by name, each tag at the commit it points at. */
export interface RemoteRefs {
	readonly heads: ReadonlyMap<string, string>;
	readonly tags: ReadonlyMap<string, string>;
}

/**
 * Reads the branches and tags of a remote, read-only. An annotated tag is taken at its commit (`^{}`).
 *
 * @param root - The clone to run in.
 * @param remote - The remote's name, URL or path.
 * @returns The refs, or `undefined` when the remote cannot be read.
 */
export function remoteRefs(root: string, remote: string): RemoteRefs | undefined {
	const listing = gitRead(root, ["ls-remote", "--heads", "--tags", remote]);
	if (listing === undefined) return undefined;
	const heads = new Map<string, string>();
	const tags = new Map<string, string>();
	for (const [id = "", ref = ""] of listing.trim().split("\n").map((line) => line.split("\t"))) {
		if (ref.startsWith("refs/heads/")) heads.set(ref.slice("refs/heads/".length), id);
		else if (ref.endsWith("^{}")) tags.set(ref.slice("refs/tags/".length, -3), id);
		else if (ref.startsWith("refs/tags/") && !tags.has(ref.slice("refs/tags/".length))) tags.set(ref.slice("refs/tags/".length), id);
	}
	return { heads, tags };
}

const PullList = Type.Array(Type.Object({
	number: Type.Integer({ description: "The pull request's number" }),
	title: Type.String({ description: "The pull request's title" }),
}, { description: "An open pull request, as the GitHub API lists it" }), { description: "The open pull requests whose base is `main`" });

/**
 * Parses a list of pull requests from JSON text: the answer of the GitHub API or a file of the same shape.
 *
 * @param text - The JSON text.
 * @returns The pull requests, or `undefined` when the text is not such a list.
 */
export function parsePulls(text: string): readonly OpenPull[] | undefined {
	try {
		const parsed: unknown = JSON.parse(text);
		return Value.Check(PullList, parsed) ? parsed.map((pull) => ({ number: pull.number, title: pull.title })) : undefined;
	} catch {
		return undefined;
	}
}

/** The open pull requests against `main`, read with `gh api` (read-only). */
export const ghPulls: PullSource = () => {
	try {
		return parsePulls(execFileSync("gh", ["api", `repos/${REPOSITORY}/pulls?state=open&base=main&per_page=100`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
	} catch {
		return undefined;
	}
};

const short = (id: string | undefined): string => (id === undefined ? "nothing" : id.slice(0, 8));

/** The commit of `legacy` and `v0-final` for these options. */
const legacyOf = (options: SwitchOptions): string => options.legacy ?? LEGACY_COMMIT;

/** The name of the target: the option, or the close of the last milestone. */
const targetName = (options: SwitchOptions): string => options.target ?? MILESTONE_CLOSES.at(-1)?.commit ?? "";

/** The full id of the target, or `undefined` when the clone does not hold it. */
const targetOf = (options: SwitchOptions): string | undefined => commitOf(options.root, targetName(options));

/** The tag commands of the owner: set a tag the clone lacks, then send it; a tag on the remote at its commit is left. */
function tagCommands(options: SwitchOptions, refs: RemoteRefs, tags: readonly OwedTag[]): { lines: string[]; problems: string[] } {
	const lines: string[] = [];
	const problems: string[] = [];
	for (const tag of tags) {
		const commit = commitOf(options.root, tag.commit);
		const local = commitOf(options.root, `refs/tags/${tag.name}`);
		const remote = refs.tags.get(tag.name);
		if (commit === undefined) problems.push(`${tag.name}: the clone holds no commit ${tag.commit} (${tag.source})`);
		else if (remote !== undefined && remote !== commit) problems.push(`${tag.name}: on the remote at ${short(remote)}, owed at ${short(commit)}`);
		else if (local !== undefined && local !== commit) problems.push(`${tag.name}: in the clone at ${short(local)}, owed at ${short(commit)}`);
		else if (remote === undefined) {
			const optional = tag.optional === true ? " (optional)" : "";
			lines.push(`# ${tag.name} at ${commit}${optional}: ${tag.source}`);
			if (local === undefined) lines.push(`git tag -a ${tag.name} ${commit} -m "${tag.name}"`);
			lines.push(`git push origin refs/tags/${tag.name}`);
		}
	}
	return { lines, problems };
}

/** The checks of the target: in the clone, descended from the root, its check recorded green in its message. */
function targetProblems(options: SwitchOptions, target: string | undefined): string[] {
	if (target === undefined) return [`the clone holds no target commit ${targetName(options)}`];
	const root = options.rewriteRoot ?? REWRITE_ROOT;
	const problems: string[] = [];
	if (gitRead(options.root, ["merge-base", "--is-ancestor", root, target]) === undefined) problems.push(`the target ${short(target)} does not descend from rewrite/root ${short(root)}`);
	if (!/^pnpm check: green$/m.test(gitRead(options.root, ["log", "-1", "--format=%B", target]) ?? "")) problems.push(`the target ${short(target)} records no green check ("pnpm check: green" in its message)`);
	return problems;
}

/** The commands after the tags: retargets, the force push with its lease, `develop`, the default branch, O4. */
function switchCommands(legacy: string, target: string, pulls: readonly OpenPull[]): string[] {
	return [
		...pulls.flatMap((pull) => [`# open pull request #${String(pull.number)} against main: ${pull.title}`, `gh pr edit ${String(pull.number)} --repo ${REPOSITORY} --base legacy`]),
		"# O3: main becomes the new platform; the lease refuses if main is no longer the old platform",
		`git push origin ${target}:refs/heads/main --force-with-lease=main:${legacy}`,
		"git push origin rewrite/develop:refs/heads/develop",
		`gh repo edit ${REPOSITORY} --default-branch main`,
		"# O4: Actions on; protect main, develop and legacy; required checks `check` and `Licence gate` (docs/RELEASE.md)",
		"# check: node scripts/release/switch-main.ts --verify",
		`# undo while legacy exists: git push origin ${legacy}:refs/heads/main --force-with-lease=main:${target}`,
	];
}

/**
 * The read-only checks of the switch and the owner's commands.
 *
 * @param options - The clone, the remote, the target, the pull requests and the tags.
 * @returns The state: `tag missing` prints the push of `v0-final` alone, `ready` prints every command, `switched`
 *   points to `--verify`, `blocked` names its problems.
 */
export function checkSwitch(options: SwitchOptions): SwitchResult {
	const legacy = legacyOf(options);
	const refs = remoteRefs(options.root, options.remote);
	if (refs === undefined) return { state: "blocked", lines: [], problems: [`the remote ${options.remote} cannot be read`] };
	const [v0, ...rest] = options.tags;
	const seen = [`remote: main at ${short(refs.heads.get("main"))}, legacy at ${short(refs.heads.get("legacy"))}, v0-final at ${short(refs.tags.get("v0-final"))}`];
	const held = refs.heads.get("legacy") === legacy ? [] : [`legacy is at ${short(refs.heads.get("legacy"))} on the remote, not at ${short(legacy)}`];
	if (refs.tags.get("v0-final") === undefined && v0 !== undefined) {
		const push = tagCommands(options, refs, [v0]);
		return { state: "tag missing", lines: [...seen, ...push.lines], problems: [...held, "push the tag first: v0-final is not on the remote", ...push.problems] };
	}
	if (refs.tags.get("v0-final") !== legacy) held.push(`v0-final is at ${short(refs.tags.get("v0-final"))} on the remote, not at ${short(legacy)}`);
	const target = targetOf(options);
	const problems = [...held, ...targetProblems(options, target)];
	if (target !== undefined && refs.heads.get("main") === target) return { state: problems.length === 0 ? "switched" : "blocked", lines: [...seen, "main is at the target: switched; check it with --verify"], problems };
	return readySwitch(options, refs, rest, { seen, problems, target });
}

/** The rest of {@link checkSwitch} before the switch: the lease, the pull requests, the tags and the commands. */
function readySwitch(options: SwitchOptions, refs: RemoteRefs, rest: readonly OwedTag[], found: { seen: readonly string[]; problems: readonly string[]; target: string | undefined }): SwitchResult {
	const legacy = legacyOf(options);
	const problems = [...found.problems];
	if (refs.heads.get("main") !== legacy) problems.push(`main is at ${short(refs.heads.get("main"))} on the remote, neither the old platform nor the target; the lease would refuse`);
	const pulls = options.pulls();
	if (pulls === undefined) problems.push("the open pull requests against main cannot be read; retarget them to legacy before the push");
	const tags = tagCommands(options, refs, rest);
	const target = found.target ?? "<target>";
	const lines = [...found.seen, `target: ${target}`, ...tags.lines, ...switchCommands(legacy, target, pulls ?? [])];
	const all = [...problems, ...tags.problems];
	return { state: all.length === 0 ? "ready" : "blocked", lines, problems: all };
}

/**
 * The check after the switch: `main` at the target, `develop` at `rewrite/develop`, `legacy` and `v0-final` unchanged.
 *
 * @param options - As for {@link checkSwitch}; the pull requests and the tags are not read.
 * @returns `switched` when every ref holds, `blocked` with one problem per ref that does not.
 */
export function verifySwitch(options: SwitchOptions): SwitchResult {
	const legacy = legacyOf(options);
	const refs = remoteRefs(options.root, options.remote);
	if (refs === undefined) return { state: "blocked", lines: [], problems: [`the remote ${options.remote} cannot be read`] };
	const target = targetOf(options);
	const expected: readonly [string, string | undefined, string | undefined][] = [
		["main", refs.heads.get("main"), target],
		["develop", refs.heads.get("develop"), refs.heads.get("rewrite/develop") ?? commitOf(options.root, "rewrite/develop")],
		["legacy", refs.heads.get("legacy"), legacy],
		["v0-final", refs.tags.get("v0-final"), legacy],
	];
	const problems = expected.filter(([, at, want]) => want === undefined || at !== want).map(([name, at, want]) => `${name} is at ${short(at)} on the remote, not at ${short(want)}`);
	const lines = expected.map(([name, at]) => `${name}: ${short(at)}`);
	return { state: problems.length === 0 ? "switched" : "blocked", lines, problems };
}

function main(args: readonly string[]): number {
	const flag = (name: string): string | undefined => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
	const file = flag("--pulls");
	const owed = owedTags(REPO_ROOT);
	const target = flag("--target");
	const options: SwitchOptions = {
		root: REPO_ROOT,
		remote: flag("--remote") ?? "origin",
		pulls: file === undefined ? ghPulls : () => parsePulls(readFileSync(file, "utf8")),
		tags: owed.tags,
		...(target === undefined ? {} : { target }),
	};
	const result = args.includes("--verify") ? verifySwitch(options) : checkSwitch(options);
	for (const line of result.lines) console.log(line);
	const problems = [...owed.problems, ...result.problems];
	for (const problem of problems) console.error(`switch-main: ${problem}`);
	console.log(`switch-main: ${result.state}${problems.length === 0 ? "" : `, ${String(problems.length)} problem(s)`}; every command above is the owner's (O3)`);
	return problems.length === 0 ? 0 : 1;
}

if (process.argv[1] === import.meta.filename) process.exitCode = main(process.argv.slice(2));
