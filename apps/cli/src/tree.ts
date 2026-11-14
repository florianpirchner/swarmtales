// SPDX-License-Identifier: Apache-2.0
/**
 * The state of the platform's source tree, for the run manifest (`kernel.commit`, `kernel.dirty`) and for the
 * refusal of a confirmatory run on a tree that is not clean (`SWT-C023`, lesson P443). This is the only file
 * that asks git.
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { SwtIssue } from "@swarmtales/contracts";

const PACKAGE_DIRECTORY = fileURLToPath(new URL("..", import.meta.url));
const GIT_TIMEOUT_MS = 10_000;

/**
 * What git says about a source tree. Both fields are absent when the tree is no git checkout (an installed
 * package) or git cannot be run.
 *
 * @public
 */
export interface SourceTree {
	/** The commit the tree is at. */
	readonly commit?: string;
	/** Whether the tree has changes that are not committed; a file git does not know counts as a change. */
	readonly dirty?: boolean;
}

/**
 * Reads the commit and the state of a source tree from git.
 *
 * @param directory - A directory inside the tree; the command line's own package when left out.
 * @returns The commit and whether the tree is dirty; an empty object when git gives no answer.
 * @example
 * ```ts
 * const { commit, dirty } = readSourceTree();
 * ```
 *
 * @public
 */
export function readSourceTree(directory: string = PACKAGE_DIRECTORY): SourceTree {
	const git = (...args: readonly string[]): string => execFileSync("git", ["-C", directory, ...args], { encoding: "utf8", timeout: GIT_TIMEOUT_MS, stdio: ["ignore", "pipe", "ignore"] }).trim();
	try {
		const commit = git("rev-parse", "--verify", "HEAD");
		return { commit, dirty: git("status", "--porcelain").length > 0 };
	} catch {
		return {};
	}
}

/**
 * `SWT-C023`: a confirmatory run on a source tree that is dirty, or not known to be clean.
 *
 * @param tree - What git said about the tree.
 * @returns The issue.
 *
 * @public
 */
export function confirmatoryDirty(tree: SourceTree): SwtIssue {
	return {
		code: "SWT-C023",
		summary: tree.dirty === true ? "`confirmatory` needs a clean source tree, and this one has changes that are not committed" : "`confirmatory` needs a clean source tree, and git gives no state for this one",
		why: "A confirmatory run names the commit that played it. With changes that are not committed, or without a commit, nobody can play the run again from its manifest.",
		fix: "Commit or remove the changes (`git status` lists them; a file git does not know counts) and write run folders outside the checkout, or use the purpose `pilot` or `exploratory`.",
	};
}
