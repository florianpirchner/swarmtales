// SPDX-License-Identifier: Apache-2.0
/**
 * The contract between the viewer and the place it runs in (the static page, the VS Code webview):
 * `mountViewer(element, setup)` in `mount.tsx` takes a `ViewerSetup`. The host knows files and where
 * they come from; the viewer knows nothing else.
 */
import type { RunSource, Vocabulary } from "@swarmtales/viewer-core";
import type { GameInfo } from "./games.ts";
import type { ViewDescriptor } from "./views.ts";

/**
 * What the place the viewer runs in gives it: where the files come from, and what it knows about them.
 *
 * @public
 */
export interface ViewerSetup {
	/** Where run files are read from; its root is searched for run folders (folders with an `events.jsonl`). */
	readonly source: RunSource;
	/** A name for the top bar (the folder, the repository). */
	readonly title?: string;
	/** Game descriptions for the Games tab (README, tools, event types per story folder); without them the tab says so. */
	readonly games?: readonly GameInfo[];
	/** Story-specific views (`mechanics/<id>/views.json`): which event draws which renderer. */
	readonly views?: readonly ViewDescriptor[];
	/** Opens a file of the source in the host's own editor (a path relative to the source root); without it the buttons are not shown. */
	readonly openExternal?: (path: string) => void;
	/** How the logs are read where the defaults do not fit: actor rules and message types (each added to viewer-core's defaults). */
	readonly vocabulary?: Vocabulary;
	/**
	 * Starts the chain-check worker where the viewer's own module worker cannot load (the VS Code webview
	 * builds it as a blob). Without it the viewer tries its module worker, then checks on the main thread.
	 */
	readonly verifyWorker?: () => Worker;
}
