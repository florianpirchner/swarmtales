/**
 * Bundles the VS Code extension (`pnpm --filter swarmtales-vscode bundle`, part of `build`) into `apps/vscode/dist/`:
 * the desktop host (`extension-node.cjs`), the web host (`extension-browser.js`), the webview page's
 * script and style (`webview.js`, `webview.css`) and the story schema for the YAML/JSON validation.
 * `viewer-data.json` is written beside them by `../../scripts/export-viewer-data.ts` (the package's `export-data`).
 * Offline and fast: esbuild only.
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { build, type BuildOptions } from "esbuild";

const APP = import.meta.dirname;
const ROOT = resolve(APP, "..", "..");
const DIST = join(APP, "dist");
mkdirSync(DIST, { recursive: true });

const shared: BuildOptions = {
	bundle: true,
	conditions: ["development"],
	logLevel: "warning",
	minify: true,
	sourcemap: false,
	target: "es2022",
	legalComments: "none",
};

await Promise.all([
	// The extension hosts: `vscode` is provided by the editor.
	build({ ...shared, entryPoints: [join(APP, "src", "entry-node.ts")], outfile: join(DIST, "extension-node.cjs"), platform: "node", format: "cjs", external: ["vscode"] }),
	build({ ...shared, entryPoints: [join(APP, "src", "entry-browser.ts")], outfile: join(DIST, "extension-browser.js"), platform: "browser", format: "cjs", external: ["vscode"] }),
	// The webview: one classic script (no chunks, so the CSP needs only a nonce). The viewer asks for a
	// module worker through `new URL(..., import.meta.url)`; without `import.meta.url` that throws and
	// the viewer runs the chain check on the main thread.
	build({
		...shared,
		entryPoints: [join(APP, "src", "webview", "main.ts")],
		outfile: join(DIST, "webview.js"),
		platform: "browser",
		format: "iife",
		define: { "import.meta.url": "undefined", "process.env.NODE_ENV": '"production"' },
		loader: { ".woff": "dataurl", ".woff2": "dataurl", ".svg": "dataurl", ".png": "dataurl" },
	}),
]);
copyFileSync(join(ROOT, "story.schema.json"), join(DIST, "story.schema.json"));
console.log("vscode extension: apps/vscode/dist (extension-node.cjs, extension-browser.js, webview.js, webview.css, story.schema.json)");
