// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The build's view and game data (`public/viewer-data.json`); a build without the file has neither. */
import { parseGames, parseViews, type GameInfo, type ViewDescriptor } from "@swarmtales/viewer-ui";
import { Type } from "typebox";
import { Check } from "typebox/value";

const DataFile = Type.Object(
	{
		views: Type.Array(Type.Unknown({ description: "One view descriptor, checked by the viewer" }), { description: "The view descriptors of the mechanics" }),
		games: Type.Optional(Type.Array(Type.Unknown({ description: "One game description, checked by the viewer" }), { description: "The game descriptions for the Games tab" })),
	},
	{ description: "The data file a build of the page carries" },
);

/** What the page hands to the viewer beside the runs. */
export interface ViewerData {
	readonly views: readonly ViewDescriptor[];
	readonly games: readonly GameInfo[];
}

const NOTHING: ViewerData = { views: [], games: [] };

/** Reads the data file's JSON; a bad or missing file gives no views and no games (the viewer still works). */
export function parseViewerData(value: unknown): ViewerData {
	if (!Check(DataFile, value)) return NOTHING;
	return { views: parseViews(JSON.stringify(value.views), "viewer-data.json").views, games: parseGames(value.games ?? []) };
}

/** Fetches and reads the data file; a page without one gets no views and no games. */
export async function loadViewerData(url: string): Promise<ViewerData> {
	try {
		const response = await fetch(url);
		return response.ok ? parseViewerData(await response.json()) : NOTHING;
	} catch {
		return NOTHING;
	}
}
