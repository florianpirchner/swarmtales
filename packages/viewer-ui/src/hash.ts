/** The viewer's place in the page's `location.hash`, e.g. `#run=stories/chess/runs/x/run&view=replay&seq=57`; a bare `#seq=57` is valid. */
export const VIEW_IDS = ["runs", "overview", "replay", "report", "charts", "compare", "story"] as const;
export type ViewId = (typeof VIEW_IDS)[number];

export interface ViewerLocation {
	readonly run?: string;
	readonly view?: ViewId;
	readonly seq?: number;
}

export function isViewId(value: string): value is ViewId {
	return VIEW_IDS.some((id) => id === value);
}

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

export function formatHash(location: ViewerLocation): string {
	const params = new URLSearchParams();
	if (location.run !== undefined) params.set("run", location.run);
	if (location.view !== undefined) params.set("view", location.view);
	if (location.seq !== undefined) params.set("seq", String(location.seq));
	const text = params.toString();
	return text === "" ? "" : `#${text}`;
}
