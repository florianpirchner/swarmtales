// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The code-line budgets of the engine (DECISIONS.md, D13). A code line is a non-blank, non-comment line of a
 * `.ts` file under `src/`, tests excluded; `code-lines.ts` counts it.
 */
import { countCodeLines } from "./code-lines.ts";
import { isTestFile, listFiles, readText, REPO_ROOT } from "./files.ts";

/** One budget: a named set of package folders and the most code lines they may hold together. */
export interface Budget {
	readonly name: string;
	readonly max: number;
	readonly folders: readonly string[];
}

/**
 * The folders of the engine: kernel, authoring (sdk), the turn scheduler and run assembly. The issue that creates
 * the package for the turn scheduler and run assembly keeps its folder in this list.
 */
export const ENGINE_FOLDERS = ["packages/kernel", "packages/sdk", "packages/engine"] as const;

/**
 * Packages under `packages/` that are not part of the engine. A new package is added here or to
 * {@link ENGINE_FOLDERS}; a test fails on a package in neither, so no code leaves the budget unseen.
 */
export const OUTSIDE_ENGINE = [
	"packages/contracts", "packages/chain", "packages/prompts", "packages/runlog", "packages/testkit", "packages/models",
	"packages/lab", "packages/viewer-core", "packages/viewer-ui", "packages/swarmtales",
] as const;

/** The two budgets. The second one stops the first from being met by moving code next door. */
export const BUDGETS: readonly Budget[] = [
	{ name: "kernel", max: 1500, folders: ["packages/kernel"] },
	{ name: "engine total", max: 4100, folders: ENGINE_FOLDERS },
];

/**
 * Says whether a file counts toward a budget.
 *
 * @param path - The path, relative to the repository root.
 * @returns True for a `.ts` or `.tsx` file under a `src/` folder that is not a test. A hand-written `.d.ts` file and
 * a folder named `test` under `src/` count: types are code, and no code leaves the budget by its name. A package
 * holds source only under `src/` and `test/` (`scripts/gates/workspace.test.ts`).
 */
export function isBudgetFile(path: string): boolean {
	return /(^|\/)src\//.test(path) && /\.tsx?$/.test(path) && !isTestFile(path);
}

/**
 * Counts the code lines of a set of package folders.
 *
 * @param folders - The package folders, relative to the root. A folder that does not exist counts as empty.
 * @param root - The root to read from; the repository root when left out.
 * @returns The sum of the code lines of their budget files.
 */
export function codeLinesOf(folders: readonly string[], root: string = REPO_ROOT): number {
	return folders
		.flatMap((folder) => listFiles(folder, isBudgetFile, root))
		.reduce((sum, file) => sum + countCodeLines(readText(file, root), file), 0);
}
