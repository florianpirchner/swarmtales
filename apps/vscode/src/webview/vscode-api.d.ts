/** The one global a VS Code webview gets: a channel to the extension host. */
declare function acquireVsCodeApi(): { postMessage(message: unknown): void };
