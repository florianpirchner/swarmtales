/**
 * Puts the viewer into a webview: the page (strict CSP), the message bridge and the folder it may read.
 * Used by the commands (a panel of their own) and by the custom editor of `events.jsonl` (the editor's panel).
 */
import * as vscode from "vscode";
import { answer, safeRelative } from "./folder-files.ts";
import { buildHtml, makeNonce } from "./html.ts";
import { parseToHost, type InitMessage } from "./protocol.ts";
import { type ViewerData } from "./viewer-data.ts";
import { workspaceFiles } from "./workspace-fs.ts";

export interface ViewerOptions {
	/** The folder the viewer reads; the webview sees paths relative to it and nothing else. */
	readonly root: vscode.Uri;
	readonly title: string;
	/** Where the viewer starts (`#run=...&view=replay`). */
	readonly hash?: string;
	/** A story from a file the user opened, shown next to the bundled ones. */
	readonly extraStories?: Readonly<Record<string, unknown>>;
	/** The story the Story tab shows first (the file the user opened the graph for). */
	readonly initialStory?: { readonly name: string; readonly story: unknown };
}

/** The webview options every viewer page needs: scripts on, and only the extension's `dist` readable. */
export function webviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
	return { enableScripts: true, localResourceRoots: [vscode.Uri.joinPath(extensionUri, "dist")] };
}

/** Makes `panel` show the viewer for `options.root`. */
export function showViewer(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, data: ViewerData, options: ViewerOptions): void {
	const { webview } = panel;
	webview.options = webviewOptions(extensionUri);
	const dist = vscode.Uri.joinPath(extensionUri, "dist");
	webview.html = buildHtml({
		nonce: makeNonce(),
		cspSource: webview.cspSource,
		scriptUri: webview.asWebviewUri(vscode.Uri.joinPath(dist, "webview.js")).toString(),
		styleUri: webview.asWebviewUri(vscode.Uri.joinPath(dist, "webview.css")).toString(),
		title: options.title,
	});
	const files = workspaceFiles(options.root);
	const init: InitMessage = {
		type: "init",
		title: options.title,
		stories: { ...data.stories, ...options.extraStories },
		views: [...data.views],
		...(options.hash === undefined ? {} : { hash: options.hash }),
		...(options.initialStory === undefined ? {} : { initialStory: options.initialStory }),
	};
	const listener = webview.onDidReceiveMessage((raw: unknown) => {
		const message = parseToHost(raw);
		if (message === undefined) return;
		switch (message.type) {
			case "ready":
				void webview.postMessage(init);
				return;
			case "rpc":
				void answer(files, message).then((reply) => webview.postMessage(reply));
				return;
			case "openFile": {
				const path = safeRelative(message.path);
				if (path === undefined || path === "") return;
				void vscode.window.showTextDocument(vscode.Uri.joinPath(options.root, ...path.split("/")), { preview: true });
				return;
			}
		}
	});
	panel.onDidDispose(() => { listener.dispose(); });
}
