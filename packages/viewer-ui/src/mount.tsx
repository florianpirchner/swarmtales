// SPDX-License-Identifier: Apache-2.0
import { createRoot } from "react-dom/client";
import { App } from "./components/App.tsx";
import type { ViewerSetup } from "./setup.ts";
import "./styles/theme.css";
import "./styles/layout.css";
import "./styles/replay.css";
import "./styles/charts.css";

/**
 * A mounted viewer.
 *
 * @public
 */
export interface ViewerHandle {
	/** Takes the viewer out of its element. */
	unmount(): void;
}

/**
 * Shows the viewer in `element`: the run list of `setup.source`, and every view of the runs in it.
 *
 * @param element - The element the viewer fills.
 * @param setup - Where the runs come from and what the caller knows about them.
 * @returns The handle that takes the viewer out again.
 * @public
 */
export function mountViewer(element: HTMLElement, setup: ViewerSetup): ViewerHandle {
	const root = createRoot(element);
	root.render(<App setup={setup} />);
	return {
		unmount() {
			root.unmount();
		},
	};
}
