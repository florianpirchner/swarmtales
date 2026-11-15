// SPDX-License-Identifier: Apache-2.0
/**
 * `pnpm lint`: ESLint over the whole repository, in several processes, each in a 4 GB heap. The typed rules keep
 * every program of a process in memory, so one process over all packages runs out of its heap; the folders of the
 * workspace roots (`packages`, `mechanics`, `games`, `samples`, `apps`) are linted in groups, and everything else in
 * one more process. A program costs about the same in any group, so small groups cost little more time and much less
 * memory, and `PARALLEL` of them run side by side (M4-71: the full check runs lint beside the typecheck and the
 * tests, inside its 6 GB). `--parallel <n>` sets the number of processes.
 */
import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";

/** Folders of one process. */
const GROUP = 3;
/** Processes side by side, unless `--parallel <n>` says otherwise. */
const PARALLEL = 2;
const flag = process.argv.indexOf("--parallel");
const parallel = flag === -1 ? PARALLEL : Number(process.argv[flag + 1]);
if (!Number.isInteger(parallel) || parallel < 1) throw new Error(`lint: --parallel takes a whole number of at least 1, not "${process.argv[flag + 1] ?? ""}"`);
/** The workspace folders that are linted group by group. */
const SPLIT = ["packages", "mechanics", "games", "samples", "apps"];

const folders = (root: string): string[] =>
	readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => `${root}/${entry.name}`).sort();

const groups = (all: readonly string[]): string[][] =>
	Array.from({ length: Math.ceil(all.length / GROUP) }, (_, index) => all.slice(index * GROUP, (index + 1) * GROUP));

const runs: string[][] = [
	// Everything else: the scripts and the files at the root.
	[".", ...SPLIT.flatMap((root) => ["--ignore-pattern", `${root}/**`])],
	...SPLIT.flatMap((root) => groups(folders(root))),
];

const lint = (args: readonly string[]): Promise<number> =>
	new Promise((resolve) => {
		const child = spawn(process.execPath, ["--max-old-space-size=4096", "node_modules/eslint/bin/eslint.js", ...args], { stdio: "inherit" });
		child.once("error", () => {
			resolve(1);
		});
		child.once("exit", (code) => {
			resolve(code ?? 1);
		});
	});

let failed = 0;
const worker = async (): Promise<void> => {
	for (let args = runs.shift(); args !== undefined && failed === 0; args = runs.shift()) {
		const code = await lint(args);
		if (code !== 0) failed = code;
	}
};
await Promise.all(Array.from({ length: parallel }, worker));
process.exitCode = failed;
