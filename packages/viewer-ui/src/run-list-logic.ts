// SPDX-License-Identifier: Apache-2.0
import type { RunSummary } from "@swarmtales/viewer-core";

/** What the run list is sorted by. */
export type SortKey = "date" | "cost" | "name";

/**
 * Sorts the runs of the list.
 *
 * @param runs - The runs.
 * @param by - The column.
 * @param descending - True for the largest first.
 * @returns The sorted runs.
 */
export function sortRuns(runs: readonly RunSummary[], by: SortKey, descending: boolean): readonly RunSummary[] {
	const value = (run: RunSummary): string | number => (by === "date" ? (run.startedAt ?? "") : by === "cost" ? (run.costUsd ?? -1) : run.dir);
	const sorted = [...runs].sort((left, right) => {
		const a = value(left);
		const b = value(right);
		return a < b ? -1 : a > b ? 1 : 0;
	});
	return descending ? sorted.reverse() : sorted;
}

/**
 * Keeps the runs of one game whose name, game or title holds a text.
 *
 * @param runs - The runs.
 * @param story - The game's name; an empty text keeps every game.
 * @param text - The text to find; an empty text keeps every run.
 * @returns The runs that fit.
 */
export function filterRuns(runs: readonly RunSummary[], story: string, text: string): readonly RunSummary[] {
	const needle = text.trim().toLowerCase();
	return runs.filter((run) => (story === "" || run.story === story) && (needle === "" || `${run.dir} ${run.title ?? ""} ${run.story ?? ""}`.toLowerCase().includes(needle)));
}

