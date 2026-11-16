// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `node scripts/release/links.ts`: the classes of every link to the old state (`v0-final`) and to the run data
 * (`data/runs`) in the Markdown files of the repository (`13-m6-spec.md` 7.2, decision A129). Each class has the
 * target that `--write` (issue M6-28, after O8) rewrites the link to:
 *
 * | Class | What the link names | Target after O8 |
 * |---|---|---|
 * | run data | a path on `data/runs`, or `stories/<name>/runs/` or `examples/` at `v0-final` | the data repository (`legacy/<path>` for the old runs) |
 * | carried doc | a paper under `docs/ideas/` or `docs/design/` at `v0-final` | `docs/history/` (issue M6-19) |
 * | old code | any other path at `v0-final`, or the old state as a whole | a code span `v0-final:<path>` and a sentence on the bundle |
 * | unknown | a path the old state or the branch does not hold | none: the gate fails |
 *
 * Prints the count of each class and every unknown link; exits 1 when one is unknown or none is found.
 */
import { listFiles, readText, REPO_ROOT } from "../lib/files.ts";
import { commitOf, treePaths } from "./git.ts";

/** The commit of the tag `v0-final` and of the branch `legacy` (DECISIONS 8.3, A130); the clone needs one of them. */
export const OLD_STATE = "a73e6a9214767509c042cf572ba87ef586e133cc";

/** Where the run data branch is looked for, in this order: the remote's branch, then a local one. */
export const DATA_BRANCHES = ["origin/data/runs", "data/runs"] as const;

/** The class of a link. */
export type LinkClass = "run data" | "carried doc" | "old code" | "unknown";

/** One link to the old state or to the run data. */
export interface Link {
	/** The Markdown file, relative to the root. */
	readonly file: string;
	/** The line, counted from 1. */
	readonly line: number;
	/** What the link points into. */
	readonly ref: "v0-final" | "data/runs";
	/** The path inside it, without a leading or trailing slash, an anchor or a closing full stop; empty for the whole. */
	readonly path: string;
}

/** The trees the links are judged against. */
export interface Trees {
	/** The paths of the old state. */
	readonly old: ReadonlySet<string>;
	/** The paths of the head of `data/runs`. */
	readonly data: ReadonlySet<string>;
}

const LINK = /https:\/\/github\.com\/florianpirchner\/swarmtales\/(?:tree|blob)\/(v0-final|data\/runs)(?=[/\s)\]>"'`<#]|$)(\/[^\s)\]>"'`<]*)?/g;
const RUN_DATA = /^(?:stories\/[^/]+\/runs|examples)(?:\/|$)/;
const CARRIED_DOC = /^docs\/(?:ideas|design)(?:\/|$)/;

function cleanPath(raw: string): string {
	const path = raw.replace(/[#?].*$/s, "").replace(/[.,;:]+$/, "").replace(/^\/+|\/+$/g, "");
	try {
		return decodeURIComponent(path);
	} catch {
		return path;
	}
}

/**
 * Finds the links to `v0-final` and to `data/runs` in a Markdown text.
 *
 * @param file - The file's path, for the result.
 * @param text - The text.
 * @returns The links, in the order of the text.
 */
export function findLinks(file: string, text: string): readonly Link[] {
	return text.split("\n").flatMap((content, index) =>
		[...content.matchAll(LINK)].map((match) => ({
			file,
			line: index + 1,
			ref: match[1] === "data/runs" ? ("data/runs" as const) : ("v0-final" as const),
			path: cleanPath(match[2] ?? ""),
		})),
	);
}

/**
 * Gives a link its class.
 *
 * @param link - The link.
 * @param trees - The old state and the run data branch.
 * @returns The class; `unknown` when the tree it points into does not hold its path.
 */
export function classify(link: Link, trees: Trees): LinkClass {
	if (link.ref === "data/runs") return link.path === "" || trees.data.has(link.path) ? "run data" : "unknown";
	if (link.path === "") return "old code";
	if (!trees.old.has(link.path)) return "unknown";
	if (RUN_DATA.test(link.path)) return "run data";
	return CARRIED_DOC.test(link.path) ? "carried doc" : "old code";
}

/**
 * Reads the two trees from the clone.
 *
 * @param root - The clone.
 * @returns The trees, or the reason they cannot be read: a clone without the old state or the data branch cannot
 * judge a link, and the gate then fails rather than pass on nothing.
 */
export function readTrees(root: string): Trees | string {
	const old = treePaths(root, OLD_STATE);
	if (old === undefined) return `the clone does not hold the old state ${OLD_STATE.slice(0, 7)} (fetch the branch \`legacy\` or the tag \`v0-final\`)`;
	const branch = DATA_BRANCHES.map((name) => commitOf(root, name)).find((commit) => commit !== undefined);
	const data = branch === undefined ? undefined : treePaths(root, branch);
	if (data === undefined) return `the clone holds none of ${DATA_BRANCHES.join(", ")} (fetch the branch \`data/runs\`)`;
	return { old, data };
}

/** A link and its class. */
export interface ClassifiedLink extends Link {
	/** The class. */
	readonly linkClass: LinkClass;
}

/**
 * Finds and classifies the links of every Markdown file of the repository.
 *
 * @param trees - The trees from {@link readTrees}.
 * @param root - The repository root; the work tree of this repository when left out.
 * @returns Every link with its class, file by file.
 */
export function classifyRepository(trees: Trees, root: string = REPO_ROOT): readonly ClassifiedLink[] {
	return listFiles(".", (path) => path.endsWith(".md"), root).flatMap((file) =>
		findLinks(file, readText(file, root)).map((link) => ({ ...link, linkClass: classify(link, trees) })),
	);
}

/**
 * Says what is wrong with the classes: an unknown link, or no link at all.
 *
 * @param links - The classified links.
 * @returns One line per problem; empty when every link has a class.
 */
export function linkProblems(links: readonly ClassifiedLink[]): readonly string[] {
	if (links.length === 0) return ["no link to `v0-final` or `data/runs` was found; nothing was classified"];
	return links
		.filter((link) => link.linkClass === "unknown")
		.map((link) => `${link.file}:${String(link.line)}: ${link.ref}/${link.path} has no class (the ${link.ref === "data/runs" ? "branch" : "old state"} holds no such path)`);
}

/**
 * Counts the links per target and class.
 *
 * @param links - The classified links.
 * @returns One line per target and class that occurs, in the order they first occur, as
 * `v0-final, run data: 120 links in 9 files`.
 */
export function classCounts(links: readonly ClassifiedLink[]): readonly string[] {
	const groups = new Map<string, ClassifiedLink[]>();
	for (const link of links) groups.set(`${link.ref}, ${link.linkClass}`, [...(groups.get(`${link.ref}, ${link.linkClass}`) ?? []), link]);
	return [...groups].map(([group, found]) => `${group}: ${String(found.length)} links in ${String(new Set(found.map((link) => link.file)).size)} files`);
}

function main(args: readonly string[]): number {
	if (args.includes("--write")) {
		console.error("links: --write is issue M6-28 and waits for the data repository (O8); nothing was written");
		return 2;
	}
	const trees = readTrees(REPO_ROOT);
	const links = typeof trees === "string" ? [] : classifyRepository(trees);
	for (const line of classCounts(links)) console.log(`links: ${line}`);
	const problems = typeof trees === "string" ? [trees] : linkProblems(links);
	for (const problem of problems) console.error(`links: ${problem}`);
	return problems.length === 0 ? 0 : 1;
}

if (process.argv[1] === import.meta.filename) process.exitCode = main(process.argv.slice(2));
