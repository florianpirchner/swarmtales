import type { RunSummary } from "@swarmtales/viewer-core";

export type SortKey = "date" | "cost" | "name";

export function sortRuns(runs: readonly RunSummary[], by: SortKey, descending: boolean): readonly RunSummary[] {
	const value = (run: RunSummary): string | number => (by === "date" ? (run.startedAt ?? "") : by === "cost" ? (run.costUsd ?? -1) : run.dir);
	const sorted = [...runs].sort((left, right) => {
		const a = value(left);
		const b = value(right);
		return a < b ? -1 : a > b ? 1 : 0;
	});
	return descending ? sorted.reverse() : sorted;
}

export function filterRuns(runs: readonly RunSummary[], story: string, text: string): readonly RunSummary[] {
	const needle = text.trim().toLowerCase();
	return runs.filter((run) => (story === "" || run.story === story) && (needle === "" || `${run.dir} ${run.title ?? ""} ${run.story ?? ""}`.toLowerCase().includes(needle)));
}

