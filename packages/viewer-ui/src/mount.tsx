import { createRoot } from "react-dom/client";
import { App } from "./components/App.tsx";
import type { ViewerHost } from "./host.ts";
import "@xyflow/react/dist/style.css";
import "./styles/theme.css";
import "./styles/layout.css";
import "./styles/replay.css";
import "./styles/charts.css";

export interface ViewerHandle {
	unmount(): void;
}

/** Shows the viewer in `element`: the run list of `host.source`, and every view of the runs in it. */
export function mountViewer(element: HTMLElement, host: ViewerHost): ViewerHandle {
	const root = createRoot(element);
	root.render(<App host={host} />);
	return {
		unmount() {
			root.unmount();
		},
	};
}
