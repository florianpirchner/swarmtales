// SPDX-License-Identifier: Apache-2.0
/**
 * `pnpm lint`: ESLint over the whole repository, in several processes. The typed rules keep every program of a
 * process in memory, so one process over all packages runs out of its 4 GB heap; the folders of `packages` and
 * `mechanics` are linted in groups, and everything else in a last process.
 */
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";

/** Folders of one process. */
const GROUP = 8;
/** The workspace folders that are linted group by group. */
const SPLIT = ["packages", "mechanics"];

const folders = (root: string): string[] =>
	readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => `${root}/${entry.name}`).sort();

const groups = (all: readonly string[]): string[][] =>
	Array.from({ length: Math.ceil(all.length / GROUP) }, (_, index) => all.slice(index * GROUP, (index + 1) * GROUP));

const runs: string[][] = [
	...SPLIT.flatMap((root) => groups(folders(root))),
	[".", ...SPLIT.flatMap((root) => ["--ignore-pattern", `${root}/**`])],
];
for (const args of runs) {
	const result = spawnSync(process.execPath, ["--max-old-space-size=4096", "node_modules/eslint/bin/eslint.js", ...args], { stdio: "inherit" });
	if (result.status !== 0) {
		process.exitCode = result.status ?? 1;
		break;
	}
}
