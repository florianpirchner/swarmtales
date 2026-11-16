// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The rows of the runs indexes (`games/<name>/RUNS.md`, decision A15) and their check against the run data branch:
 * every row names a path and a data commit, the commit is on the branch, and the path is in the commit's tree, so
 * every "data commit" stays true when the branch moves to the data repository with its commit ids (A129).
 */
import { listFiles, readText } from "../lib/files.ts";
import { commitOf, gitRead } from "./git.ts";

/** One row of a runs index. */
export interface RunsRow {
	/** The index file, relative to the root. */
	readonly file: string;
	/** The line, counted from 1. */
	readonly line: number;
	/** The first code span of the column "Path on `data/runs`", without a trailing slash; empty when it has none. */
	readonly path: string;
	/** The first commit id of the column "Data commit"; empty when it has none. */
	readonly commit: string;
}

const PATH_COLUMN = "Path on `data/runs`";
const COMMIT_COLUMN = "Data commit";

const cellsOf = (line: string): readonly string[] => line.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map((cell) => cell.trim());

/**
 * Reads the rows of the tables of one runs index whose head has the columns "Path on `data/runs`" and "Data commit".
 *
 * @param file - The file's path, for the result.
 * @param text - The file's text.
 * @returns The rows, in the order of the file.
 */
export function runsRows(file: string, text: string): readonly RunsRow[] {
	const rows: RunsRow[] = [];
	let columns: Columns | undefined;
	text.split("\n").forEach((line, index) => {
		const cells = line.trimStart().startsWith("|") ? cellsOf(line) : undefined;
		if (cells === undefined || columns === undefined) {
			columns = cells === undefined ? undefined : columnsOf(cells);
			return;
		}
		if (!cells.every((cell) => /^:?-+:?$/.test(cell))) rows.push({ file, line: index + 1, ...rowOf(cells, columns) });
	});
	return rows;
}

/** The places of the two columns in a table's head. */
interface Columns {
	readonly path: number;
	readonly commit: number;
}

function columnsOf(cells: readonly string[]): Columns | undefined {
	const path = cells.indexOf(PATH_COLUMN);
	const commit = cells.indexOf(COMMIT_COLUMN);
	return path >= 0 && commit >= 0 ? { path, commit } : undefined;
}

function rowOf(cells: readonly string[], columns: Columns): { path: string; commit: string } {
	const path = /`([^`]+)`/.exec(cells[columns.path] ?? "")?.[1]?.replace(/\/+$/, "") ?? "";
	const commit = /`([0-9a-f]{7,40})`/.exec(cells[columns.commit] ?? "")?.[1] ?? "";
	return { path, commit };
}

/**
 * Reads the rows of every runs index of the repository.
 *
 * @param root - The repository root.
 * @returns The rows, index by index.
 */
export function allRunsRows(root: string): readonly RunsRow[] {
	return listFiles("games", (path) => /^games\/[^/]+\/RUNS\.md$/.test(path), root).flatMap((file) => runsRows(file, readText(file, root)));
}

/**
 * Says what is wrong with one row against the branch.
 *
 * @param root - The clone.
 * @param head - The full commit id of the branch's head.
 * @param row - The row.
 * @returns The problem, or `undefined` when the row's commit is on the branch and holds its path.
 */
export function rowProblem(root: string, head: string, row: RunsRow): string | undefined {
	const where = `${row.file}:${String(row.line)}`;
	if (row.path === "" || row.commit === "") return `${where}: the row names no path or no data commit`;
	const commit = commitOf(root, row.commit);
	if (commit === undefined) return `${where}: the data commit ${row.commit} is not in the clone`;
	if (gitRead(root, ["merge-base", "--is-ancestor", commit, head]) === undefined) return `${where}: the data commit ${row.commit} is not on the branch`;
	if (gitRead(root, ["cat-file", "-e", `${commit}:${row.path}`]) === undefined) return `${where}: ${row.path} is not in the data commit ${row.commit}`;
	return undefined;
}
