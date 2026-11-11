import type { RunEvent } from "@swarmtales/viewer-core";

/** The position in `events` (sorted by seq) of the last event at or before `seq`; 0 when `seq` is before the first. */
export function positionOf(events: readonly RunEvent[], seq: number): number {
	let low = 0;
	let high = events.length;
	while (low < high) {
		const middle = (low + high) >> 1;
		if ((events[middle]?.seq ?? Infinity) <= seq) low = middle + 1;
		else high = middle;
	}
	return Math.max(0, low - 1);
}

/** The rows of a windowed list that are visible (plus a margin of `overscan` rows each side). */
export function visibleRange(scrollTop: number, viewport: number, rowHeight: number, total: number, overscan = 6): { readonly start: number; readonly end: number } {
	const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
	const end = Math.min(total, Math.ceil((scrollTop + viewport) / rowHeight) + overscan);
	return { start, end };
}

/** A scroll offset that brings row `index` into view, or `undefined` when it already is. */
export function scrollToShow(index: number, scrollTop: number, viewport: number, rowHeight: number): number | undefined {
	const top = index * rowHeight;
	if (top < scrollTop || top + rowHeight > scrollTop + viewport) return Math.max(0, top - viewport / 2 + rowHeight / 2);
	return undefined;
}
