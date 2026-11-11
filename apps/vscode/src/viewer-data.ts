/** The stories and views bundled at build time (`dist/viewer-data.json`, written by `scripts/export-viewer-data.ts`). */
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

export const NO_DATA: ViewerData = { stories: {}, views: [] };

/** Reads the data file's text; a bad file gives no stories and no views (the viewer still works). */
export function parseViewerData(text: string): ViewerData {
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch {
		return NO_DATA;
	}
	if (!Check(DataFile, value)) return NO_DATA;
	const stories: Record<string, unknown> = { ...value.stories };
	for (const [old, current] of Object.entries(value.aliases)) {
		const story = Object.entries(value.stories).find(([key]) => key === current)?.[1];
		if (story !== undefined) stories[old] = story;
	}
	return { stories, views: parseViews(JSON.stringify(value.views), "viewer-data.json").views };
}
