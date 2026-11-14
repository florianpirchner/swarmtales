// SPDX-License-Identifier: Apache-2.0
/** The viewer's place in the page's `location.hash`, e.g. `#run=stories/chess/runs/x/run&view=replay&seq=57`; a bare `#seq=57` is valid. */
export const VIEW_IDS = ["runs", "games", "overview", "replay", "report", "charts", "compare"] as const;
/** The id of one tab. */
export type ViewId = (typeof VIEW_IDS)[number];

/** The viewer's place: the run, the tab and the seq. */
export interface ViewerLocation {
	readonly run?: string;
	readonly view?: ViewId;
	readonly seq?: number;
}

/**
 * Says whether a text is the id of a tab.
 *
 * @param value - The text.
 * @returns True for an id of a tab.
 */
export function isViewId(value: string): value is ViewId {
	return VIEW_IDS.some((id) => id === value);
}

/**
 * Reads the viewer's place from the hash of the page.
 *
 * @param hash - The hash, with or without its `#`.
 * @returns The place; a part the hash does not name is left out.
 */
export function parseHash(hash: string): ViewerLocation {
	const params = new URLSearchParams(hash.replace(/^#/, ""));
	const run = params.get("run");
	const view = params.get("view");
	const seq = Number(params.get("seq") ?? Number.NaN);
	return {
		...(run === null || run === "" ? {} : { run }),
		...(view !== null && isViewId(view) ? { view } : {}),
		...(Number.isInteger(seq) && seq >= 0 ? { seq } : {}),
	};
}

/**
 * Writes the viewer's place as the hash of the page.
 *
 * @param location - The place.
 * @returns The hash with its `#`, or an empty text for no place.
 */
export function formatHash(location: ViewerLocation): string {
	const params = new URLSearchParams();
	if (location.run !== undefined) params.set("run", location.run);
	if (location.view !== undefined) params.set("view", location.view);
	if (location.seq !== undefined) params.set("seq", String(location.seq));
	const text = params.toString();
	return text === "" ? "" : `#${text}`;
}
