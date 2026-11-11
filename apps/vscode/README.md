# Swarm Tales for VS Code (`swarmtales-vscode`)

The run viewer inside VS Code, github.dev, vscode.dev and Codespaces (SUL licence, private, not published).
One extension with two entry points: `browser` (web extension) and `main` (desktop and Codespaces).

## Commands

| Command | Where | What |
|---|---|---|
| Swarm Tales: Open Run | explorer, right click on a folder | Opens the viewer on a run folder (has `events.jsonl`) or a folder of runs. Warns when there is none. |
| Swarm Tales: Open Run Browser | palette | The viewer on the workspace folder: lists every run. |
| Swarm Tales: Open Story Graph | `*.story.yaml`, `*.story.json`, `story.yaml` (explorer, editor title, palette) | Opens the Story tab; the file is offered in the story picker. |
| Swarm Tales: Run Story… | desktop and Codespaces, trusted workspaces only | Opens a terminal with `pnpm swt run --story <file>` typed but **not executed** (a run costs money). A path with characters outside letters, digits, `_ . @ + = , -` and `/` is refused (rename the file or type the command yourself). |

Also: a custom editor for `events.jsonl` (priority `option`, so the text editor stays the default; "Reopen Editor
With… > Swarm Tales Run Viewer") that opens the viewer on the file's folder.

Story files get schema validation and completion from `story.schema.json` (`yamlValidation` for the Red Hat YAML
extension, `jsonValidation` for JSON). The YAML extension is a soft recommendation: without it the contribution does nothing.

## Build and install

```
pnpm --filter swarmtales-vscode build      # dist/: both hosts, the webview bundle, story data, schema (esbuild, offline, seconds)
pnpm --filter swarmtales-vscode package    # swarmtales-vscode.vsix (@vscode/vsce, --no-dependencies); never published
code --install-extension apps/vscode/swarmtales-vscode.vsix
```

Packaging is not part of `pnpm check`. Marketplace and Open VSX publishing wait for Flo's go.

## github.dev, vscode.dev and Codespaces

- **Codespaces / desktop / remote:** install the `.vsix` (Extensions view > ... > Install from VSIX). The `main` entry runs next to the files.
- **github.dev / vscode.dev:** a web extension cannot be installed from a `.vsix` there. Unpublished options: run
  `npx @vscode/test-web --extensionDevelopmentPath=apps/vscode <folder>` (serves a local VS Code for the web with the
  extension; needs network for the first download of VS Code), or the command "Developer: Install Extension from
  Location..." in a desktop-hosted web server. A published extension is the only route for plain github.dev; that is open.
- Files are read through `vscode.workspace.fs`, which works on the virtual file systems of github.dev.

## Design

- The webview (`dist/webview.js`, one classic script) calls `mountViewer` with a `RunSource` whose `list` and `readText`
  are requests over `postMessage` (`src/rpc-source.ts`); the host answers from `vscode.workspace.fs` (`src/folder-files.ts`).
- Strict CSP: `default-src 'none'`, `script-src 'nonce-...'` (one script), styles/images/fonts from the extension only,
  `worker-src blob:` (the chain-check worker, see below), no `connect-src`, no frames, no remote anything. `style-src` has `'unsafe-inline'` because React and React Flow set `style`
  attributes. `localResourceRoots` is the extension's `dist/` alone.
- Webview messages are untrusted: every message is parsed with Typebox (closed objects) before the host acts. Paths are
  relative to the opened folder; `..`, absolute paths, drive letters, backslashes and names ending in a dot or a space are
  refused, and nothing is listed or read through a symbolic link. The webview gets no tokens and no absolute paths.
- Untrusted workspaces: the viewer works (it only reads); Run Story is off (`untrustedWorkspaces: limited`).
- **Worker:** `build.ts` bundles the viewer's `verify-worker.ts` as a classic script and inlines its code in
  `webview.js`; the webview starts it from a blob URL (`ViewerHost.verifyWorker`), the only way a webview loads a worker.
  If it cannot start, the viewer checks on the main thread after a paint.
- Stories and view descriptors are exported at build time by `scripts/export-viewer-data.ts` into `dist/viewer-data.json`.
- "Open file" buttons (e.g. `agents/A01.md`) send `openFile`; the host opens it in an editor tab.
- Not verified in a real VS Code in this repository's sandbox (the VS Code download host is blocked): see
  `docs/design/viewer-build.md`, "VS Code extension".

Tests: `test/vscode/` (protocol parsing, RPC source, run-folder detection, CSP/html).
