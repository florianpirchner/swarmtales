// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The state of the platform's source tree, for the run manifest (`kernel.commit`, `kernel.dirty`) and for the
 * refusal of a confirmatory run on a tree that is not clean (`SWT-C023`, lesson P443). This is the only file
 * that asks git, and it asks git only inside a clone of the platform (lesson P502).
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { SwtIssue } from "@swarmtales/contracts";
import { Type } from "typebox";
import { Value } from "typebox/value";

const PACKAGE_DIRECTORY = fileURLToPath(new URL("..", import.meta.url));
const GIT_TIMEOUT_MS = 10_000;
/** The name of the `package.json` at the root of a clone of the repository, as `swt doctor` finds a clone (K15). */
const WORKSPACE = "swarmtales-workspace";
const Named = Type.Object({ name: Type.Optional(Type.String({ description: "The package name" })) }, { description: "The field of a `package.json` that tells the root of a clone" });

/**
 * What git says about the platform's source tree. In a clone, `commit` and `dirty` are absent when git gives no
 * answer. Outside a clone (an installed command line) git is not asked, so a user's project is never taken for the
 * platform's tree: both are absent and `installed` is true.
 *
 * @public
 */
export interface SourceTree {
	/** True when the command line runs from an installed package, not from a clone: the versions in the manifest name its source. */
	readonly installed?: boolean;
	/** The commit the tree is at. */
	readonly commit?: string;
	/** Whether the tree has changes that are not committed; a file git does not know counts as a change. */
	readonly dirty?: boolean;
}

// Whether a directory holds the `package.json` of a clone's root.
function workspaceAt(directory: string): boolean {
	try {
		const value: unknown = JSON.parse(readFileSync(join(directory, "package.json"), "utf8"));
		return Value.Check(Named, value) && value.name === WORKSPACE;
	} catch {
		return false;
	}
}

/**
 * The root of the clone of the platform that holds a directory: the nearest directory at or above it whose
 * `package.json` is named `swarmtales-workspace`, with no `node_modules` folder between the two.
 *
 * @param directory - An absolute directory, such as the command line's own package folder.
 * @returns The root, or undefined when the directory is in no clone (an installed package).
 *
 * @public
 */
export function cloneRoot(directory: string): string | undefined {
	for (let at = directory; ; at = dirname(at)) {
		if (workspaceAt(at)) return relative(at, directory).split(sep).includes("node_modules") ? undefined : at;
		if (dirname(at) === at) return undefined;
	}
}

/**
 * Reads the commit and the state of the platform's source tree from git, inside a clone only.
 *
 * @param directory - The command line's own package folder, or another directory of a clone; its own when left out.
 * @returns The commit and whether the tree is dirty; an empty object when git gives no answer in a clone;
 * `{ installed: true }` outside a clone, where git is not asked.
 * @example
 * ```ts
 * const { commit, dirty } = readSourceTree();
 * ```
 *
 * @public
 */
export function readSourceTree(directory: string = PACKAGE_DIRECTORY): SourceTree {
	const root = cloneRoot(directory);
	if (root === undefined) return { installed: true };
	const git = (...args: readonly string[]): string => execFileSync("git", ["-C", root, ...args], { encoding: "utf8", timeout: GIT_TIMEOUT_MS, stdio: ["ignore", "pipe", "ignore"] }).trim();
	try {
		const commit = git("rev-parse", "--verify", "HEAD");
		return { commit, dirty: git("status", "--porcelain").length > 0 };
	} catch {
		return {};
	}
}

/**
 * Whether a confirmatory run is refused for its source tree: in a clone, unless git reports the tree clean. An
 * installed command line plays one: its source is the release that the versions of the manifest name.
 *
 * @param tree - What `readSourceTree` said.
 * @returns True when the tree is a clone's and not known to be clean.
 *
 * @public
 */
export function treeRefused(tree: SourceTree): boolean {
	return tree.installed !== true && tree.dirty !== false;
}

/**
 * The facts of a tree that the run manifest records: its commit and its state, when git gave them.
 *
 * @param tree - What `readSourceTree` said.
 * @returns The fields `commit` and `dirty` that are set.
 *
 * @public
 */
export function treeFacts(tree: SourceTree): Pick<SourceTree, "commit" | "dirty"> {
	return { ...(tree.commit === undefined ? {} : { commit: tree.commit }), ...(tree.dirty === undefined ? {} : { dirty: tree.dirty }) };
}

/**
 * `SWT-C023`: a confirmatory run on a clone's source tree that is dirty, or not known to be clean.
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
