// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `pnpm lint`: ESLint over the whole repository, in several processes, each in a 4 GB heap. The typed rules keep
 * every program of a process in memory, so one process over all folders of a workspace root runs out of its heap
 * (measured for `mechanics`, decision A108); the folders of the workspace roots (`packages`, `mechanics`, `games`,
 * `samples`, `apps`) are linted in groups of `GROUP`, and everything else in one more process. Each process builds
 * its own programs, so small groups repeat type work: measured cold and alone on 4 cores (A108), groups of 3 took
 * 994 core-seconds (326 s, 3.1 GB at most), of 4 906 (306 s, 4.1 GB), of 6 816 (283 s, 4.4 GB; beside the other
 * lanes the check then peaked at 6903 MB of its 6144), one process alone 526 s for groups of 3 and of 6. So the groups
 * stay at 3 and `PARALLEL` processes run side by side (M4-71: the full check runs lint beside the typecheck and the
 * tests, inside its 6 GB).
 * `--parallel <n>` sets the number of processes, `--group <n>` the folders of one process (0: one process per root).
 */
import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";

/** Folders of one process, unless `--group <n>` says otherwise; 0 is one process per workspace root. */
const GROUP = 3;
/** Processes side by side, unless `--parallel <n>` says otherwise. */
const PARALLEL = 2;
/** The whole number after `--<name>`, at least `least`; `fallback` without the flag. */
function option(name: string, fallback: number, least: number): number {
	const at = process.argv.indexOf(`--${name}`);
	const value = at === -1 ? fallback : Number(process.argv[at + 1]);
	if (!Number.isInteger(value) || value < least) throw new Error(`lint: --${name} takes a whole number of at least ${String(least)}, not "${process.argv[at + 1] ?? ""}"`);
	return value;
}
const parallel = option("parallel", PARALLEL, 1);
const group = option("group", GROUP, 0);
/** The workspace folders that are linted group by group. */
const SPLIT = ["packages", "mechanics", "games", "samples", "apps"];

const folders = (root: string): string[] =>
	readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => `${root}/${entry.name}`).sort();

const groups = (all: readonly string[]): string[][] =>
	Array.from({ length: Math.ceil(all.length / group) }, (_, index) => all.slice(index * group, (index + 1) * group));

const runs: string[][] = [
	// Everything else: the scripts and the files at the root.
	[".", ...SPLIT.flatMap((root) => ["--ignore-pattern", `${root}/**`])],
	...SPLIT.flatMap((root) => (group === 0 ? [[root]] : groups(folders(root)))),
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
