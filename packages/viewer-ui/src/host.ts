/**
 * The contract between the viewer and the place it runs in (the static page, the VS Code webview):
 * `mountViewer(element, host)` in `mount.tsx` takes a `ViewerHost`. The host knows files and where
 * they come from; the viewer knows nothing else (docs/design/viewer-build.md, "viewer-ui host contract").
 */
import type { RunSource, Vocabulary } from "@swarmtales/viewer-core";
import type { ViewDescriptor } from "./views.ts";

export interface ViewerHost {
	/** Where run files are read from; its root is searched for run folders (folders with an `events.jsonl`). */
	readonly source: RunSource;
	/** A name for the top bar (the folder, the repository). */
	readonly title?: string;
	/** Story JSON by story id (`swt story show <name> --json`), for the story graph of a run. */
	readonly stories?: Readonly<Record<string, unknown>>;
	/** Story-specific views (`mechanics/<id>/views.json`): which event draws which renderer. */
	readonly views?: readonly ViewDescriptor[];
	/** Opens a file of the source in the host's own editor (a path relative to the source root); without it the buttons are not shown. */
	readonly openExternal?: (path: string) => void;
	/** How the logs are read where the defaults do not fit: actor rules, message types, the overlay's event names (each added to viewer-core's defaults). */
	readonly vocabulary?: Vocabulary;
	/** A story to show first in the Story tab (a story file the user picked), by its name and its plain JSON. */
	readonly initialStory?: { readonly name: string; readonly story: unknown };
	/**
	 * Starts the chain-check worker where the viewer's own module worker cannot load (the VS Code webview
	 * builds it as a blob). Without it the viewer tries its module worker, then checks on the main thread.
	 */
	readonly verifyWorker?: () => Worker;
}
