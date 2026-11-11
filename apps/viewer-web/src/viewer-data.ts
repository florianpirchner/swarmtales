/** The build's story and view data (`public/viewer-data.json`, written by `pnpm export-data`). */
import { parseViews, type ViewDescriptor } from "@swarmtales/viewer-ui/views";
import { Type } from "typebox";
import { Check } from "typebox/value";

const DataFile = Type.Object({
	stories: Type.Record(Type.String(), Type.Unknown()),
	/** Old story names and the current name they stand for. */
	aliases: Type.Record(Type.String(), Type.String()),
	views: Type.Array(Type.Unknown()),
});

export interface ViewerData {
	readonly stories: Readonly<Record<string, unknown>>;
	readonly views: readonly ViewDescriptor[];
}

/** Reads the data file's JSON; a bad or missing file gives no stories and no views (the viewer still works). */
export function parseViewerData(value: unknown): ViewerData {
	if (!Check(DataFile, value)) return { stories: {}, views: [] };
	const stories: Record<string, unknown> = { ...value.stories };
	for (const [old, current] of Object.entries(value.aliases)) {
		const story = Object.entries(value.stories).find(([key]) => key === current)?.[1];
		if (story !== undefined) stories[old] = story;
	}
	return { stories, views: parseViews(JSON.stringify(value.views), "viewer-data.json").views };
}

export async function loadViewerData(url: string): Promise<ViewerData> {
	try {
		const response = await fetch(url);
		return response.ok ? parseViewerData(await response.json()) : { stories: {}, views: [] };
	} catch {
		return { stories: {}, views: [] };
	}
}
