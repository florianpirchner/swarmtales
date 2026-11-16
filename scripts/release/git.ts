// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Read-only git for the release scripts (`13-m6-spec.md` 6.3): every call here reads the local clone, or, for
 * `switch-main.ts`, lists a remote's refs with `git ls-remote`. None writes a ref; what the owner runs against a
 * remote is printed, never run.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const BUFFER = 512 * 1024 * 1024;

/**
 * Runs one git command that reads.
 *
 * @param root - The clone to run in.
 * @param args - The arguments.
 * @returns What git printed, or `undefined` when git failed (an unknown commit, a missing path).
 */
export function gitRead(root: string, args: readonly string[]): string | undefined {
	try {
		return execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: BUFFER, stdio: ["ignore", "pipe", "ignore"] });
	} catch {
		return undefined;
	}
}

/**
 * Resolves a revision to the full id of its commit.
 *
 * @param root - The clone.
 * @param revision - A branch, a tag or a short or full commit id.
 * @returns The full commit id, or `undefined` when the clone holds no such commit.
 */
export function commitOf(root: string, revision: string): string | undefined {
	return gitRead(root, ["rev-parse", "--verify", "--quiet", `${revision}^{commit}`])?.trim();
}

/**
 * The paths of a commit's tree: every file and every folder above a file, without a trailing slash.
 *
 * @param root - The clone.
 * @param commit - The commit.
 * @returns The paths, or `undefined` when the commit is not in the clone.
 */
export function treePaths(root: string, commit: string): ReadonlySet<string> | undefined {
	const listing = gitRead(root, ["ls-tree", "-r", "--name-only", "-z", commit]);
	if (listing === undefined) return undefined;
	const paths = new Set<string>();
	for (const file of listing.split("\0").filter((entry) => entry !== "")) {
		const parts = file.split("/");
		for (let end = 1; end <= parts.length; end += 1) paths.add(parts.slice(0, end).join("/"));
	}
	return paths;
}

/** The blobs of a commit's tree: the id and the path of each. */
function blobsOf(root: string, commit: string): readonly { readonly id: string; readonly path: string }[] {
	const listing = gitRead(root, ["ls-tree", "-r", "-z", commit]) ?? "";
	return listing
		.split("\0")
		.map((entry) => /^\d+ blob ([0-9a-f]+)\t(.+)$/s.exec(entry))
		.flatMap((match) => (match?.[1] === undefined || match[2] === undefined ? [] : [{ id: match[1], path: match[2] }]));
}

/**
 * Writes the files of a commit into a folder, as a checkout would, without touching the clone's index, its work tree
 * or its list of worktrees. The blobs are read through `git cat-file --batch`, a few hundred at a time.
 *
 * @param root - The clone.
 * @param commit - The commit.
 * @param target - The folder to write into; it is created.
 * @returns The number of files written.
 * @throws What git or the file system throws when a blob cannot be read or a file cannot be written.
 */
export function exportTree(root: string, commit: string, target: string): number {
	const blobs = blobsOf(root, commit);
	for (let start = 0; start < blobs.length; start += 200) {
		const chunk = blobs.slice(start, start + 200);
		const output = execFileSync("git", ["cat-file", "--batch"], { cwd: root, input: `${chunk.map((blob) => blob.id).join("\n")}\n`, maxBuffer: BUFFER });
		let offset = 0;
		for (const blob of chunk) {
			const header = output.indexOf(10, offset);
			const size = Number(output.subarray(offset, header).toString("utf8").split(" ")[2]);
			const file = join(target, blob.path);
			mkdirSync(dirname(file), { recursive: true });
			writeFileSync(file, output.subarray(header + 1, header + 1 + size));
			offset = header + 1 + size + 1;
		}
	}
	return blobs.length;
}
