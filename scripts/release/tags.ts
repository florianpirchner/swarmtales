// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The tags owed to the remote (`13-m6-spec.md` 7.4): `v0-final`, the runtime revisions from 3 to the kernel's, the
 * milestone tags and the two optional run tags. The commits of the runtime tags are read from
 * `docs/RUNTIME-REVISIONS.md` and `docs/refactoring-before-release/RESUME.md`; the milestone closes and the run
 * commits are written here with their source. Every tag is set and sent by the owner (O3); this file only reads.
 */
import { readText } from "../lib/files.ts";
import { commitOf } from "./git.ts";

/** One tag the owner sets and sends. */
export interface OwedTag {
	/** The tag's name. */
	readonly name: string;
	/** The commit, as the source names it (short or full). */
	readonly commit: string;
	/** Where the commit is named. */
	readonly source: string;
	/** True for a tag that 7.4 calls optional. */
	readonly optional?: boolean;
}

/** The commit of the old platform: `legacy`, `main` before the switch and the tag `v0-final` (DECISIONS 8.3). */
export const LEGACY_COMMIT = "a73e6a9214767509c042cf572ba87ef586e133cc";

/** The root of the rewrite, the branch `rewrite/root` (A5). */
export const REWRITE_ROOT = "89927a027113f08f7f93b9765fba59dc5f847170";

/**
 * The close commit of each milestone, as the record or a decision names it: the commit after which the milestone
 * was called closed. M6 is added when its review closes it.
 */
export const MILESTONE_CLOSES: readonly OwedTag[] = [
	{ name: "milestone-m1", commit: "ec4dab5", source: "docs/ISSUE-RECORD.md row 57, \"M1 done\"" },
	{ name: "milestone-m2", commit: "7b2a862", source: "docs/ISSUE-RECORD.md row 134, M2-27 closes the review of M2" },
	{ name: "milestone-m3", commit: "936e8de", source: "docs/ISSUE-RECORD.md row 139, \"decision A28 closes M3\"" },
	{ name: "milestone-m4", commit: "390448d", source: "M4-72 closes the review of M4 (decision A141)" },
	{ name: "milestone-m5", commit: "4604a127", source: "DECISIONS.md A117, \"M5 is closed\"" },
];

/** The two run commits on no branch (finding 7 of `docs/M5-REVIEW.md`); 7.4 calls their tags optional. */
export const RUN_TAGS: readonly OwedTag[] = [
	{ name: "runs/m5-5a", commit: "8e11ab1e", source: "docs/M5-REVIEW.md finding 7", optional: true },
	{ name: "runs/m5-5c", commit: "0d119aa9", source: "docs/M5-REVIEW.md finding 7", optional: true },
];

/** The files that name the commits of the runtime tags. */
export const TAG_SOURCES = ["docs/RUNTIME-REVISIONS.md", "docs/refactoring-before-release/RESUME.md"] as const;

/** "`runtime-r4` (`b158a5b`)" and "`runtime-r7` at the merge of … (`d022725`)", in prose. */
const NAME_FIRST = /`runtime-r(\d+)`[^`]{0,80}?\(`([0-9a-f]{7,40})`\)/g;
/** "commit `4271ceb` (PR #145, tag `runtime-r2`)", in a row of the revisions table. */
const COMMIT_FIRST = /commit `([0-9a-f]{7,40})` \([^)`]*tag `runtime-r(\d+)`\)/g;

/** The pairs of revision and commit that a text names. */
function namedPairs(text: string): readonly { readonly revision: number; readonly commit: string }[] {
	const first = [...text.matchAll(NAME_FIRST)].map((match) => ({ revision: Number(match[1]), commit: match[2] ?? "" }));
	const second = [...text.matchAll(COMMIT_FIRST)].map((match) => ({ revision: Number(match[2]), commit: match[1] ?? "" }));
	return [...first, ...second];
}

/** The runtime revision of the kernel, read from its source. */
export function kernelRevision(root: string): number {
	const match = /RUNTIME_REVISION = (\d+);/.exec(readText("packages/kernel/src/revision.ts", root));
	return Number(match?.[1] ?? 0);
}

/**
 * The runtime tags from revision 3 to the kernel's, with the commits the two sources name.
 *
 * @param root - The clone, whose docs and kernel are read and whose history must hold each commit.
 * @returns The tags, and one line per problem: a revision no source names, two commits for one revision, or a commit
 *   the clone does not hold.
 */
export function runtimeTags(root: string): { readonly tags: readonly OwedTag[]; readonly problems: readonly string[] } {
	const found = new Map<number, OwedTag>();
	const problems: string[] = [];
	for (const source of TAG_SOURCES) {
		for (const pair of namedPairs(readText(source, root))) {
			if (pair.revision < 3) continue;
			const tag = { name: `runtime-r${String(pair.revision)}`, commit: pair.commit, source };
			const before = found.get(pair.revision);
			if (before === undefined) found.set(pair.revision, tag);
			else if (commitOf(root, before.commit) !== commitOf(root, pair.commit)) problems.push(`${tag.name}: ${before.source} names ${before.commit}, ${source} names ${pair.commit}`);
		}
	}
	const tags: OwedTag[] = [];
	for (let revision = 3; revision <= kernelRevision(root); revision += 1) {
		const tag = found.get(revision);
		if (tag === undefined) problems.push(`runtime-r${String(revision)}: no commit is named in ${TAG_SOURCES.join(" or ")}`);
		else tags.push(tag);
	}
	return { tags, problems };
}

/**
 * Every tag of 7.4 that is owed now, in the order the owner sends them: `v0-final` first.
 *
 * @param root - The clone.
 * @param legacy - The commit of `v0-final`.
 * @returns The tags and the problems of {@link runtimeTags}, with one more for every commit the clone does not hold.
 */
export function owedTags(root: string, legacy: string = LEGACY_COMMIT): { readonly tags: readonly OwedTag[]; readonly problems: readonly string[] } {
	const runtime = runtimeTags(root);
	const tags = [{ name: "v0-final", commit: legacy, source: "DECISIONS.md 8.3" }, ...runtime.tags, ...MILESTONE_CLOSES, ...RUN_TAGS];
	const missing = tags.filter((tag) => commitOf(root, tag.commit) === undefined).map((tag) => `${tag.name}: the clone holds no commit ${tag.commit} (${tag.source})`);
	return { tags, problems: [...runtime.problems, ...missing] };
}
