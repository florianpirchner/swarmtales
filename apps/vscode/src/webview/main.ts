/** The webview's entry: mounts the viewer over a `RunSource` that asks the extension host for files. */
import { mountViewer, type ViewerHandle } from "@swarmtales/viewer-ui";
import { isInit, parseToWebview, type InitMessage, type ToHostMessage } from "../protocol.ts";
import { rpcSource } from "../rpc-source.ts";

const api = acquireVsCodeApi();
const post = (message: ToHostMessage): void => { api.postMessage(message); };
const rpc = rpcSource({ post });
let mounted: ViewerHandle | undefined;

/** The chain-check worker's code, inlined by `build.ts`. */
declare const __SWT_VERIFY_WORKER__: string;
let workerUrl: string | undefined;

/** Starts the chain-check worker from a blob URL (the CSP allows `worker-src blob:` and nothing else). */
function verifyWorker(): Worker {
	workerUrl ??= URL.createObjectURL(new Blob([__SWT_VERIFY_WORKER__], { type: "text/javascript" }));
	return new Worker(workerUrl);
}

function start(init: InitMessage, element: HTMLElement): void {
	mounted?.unmount();
	if (init.hash !== undefined) {
		try {
			window.history.replaceState(null, "", init.hash);
		} catch {
			// A webview without a usable history just starts on the run list.
		}
	}
	mounted = mountViewer(element, {
		source: rpc.source,
		title: init.title,
		stories: init.stories,
		views: init.views,
		openExternal: (path) => { post({ type: "openFile", path }); },
		verifyWorker,
		...(init.initialStory === undefined ? {} : { initialStory: init.initialStory }),
	});
}

const root = document.getElementById("root");
if (root !== null) {
	window.addEventListener("message", (event: MessageEvent<unknown>) => {
		const message = parseToWebview(event.data);
		if (message === undefined) return;
		if (isInit(message)) start(message, root);
		else rpc.accept(message);
	});
	post({ type: "ready" });
}
