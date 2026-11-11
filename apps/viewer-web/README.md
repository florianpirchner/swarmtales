# @swarmtales/viewer-web

The run viewer as a static page (SUL licence, private). It reads runs in the browser; nothing is uploaded.

- `pnpm --filter @swarmtales/viewer-web dev`: exports the story and view data, then starts Vite.
- `pnpm --filter @swarmtales/viewer-web build`: writes a static `dist/` that any web server can host (relative base).
  `pnpm build` at the root builds it too. Nothing is deployed.
- `pnpm --filter @swarmtales/viewer-web preview`: serves `dist/`.

Sources: pick a folder, drop a folder, the File System Access API (Chromium), or GitHub
(`?repo=owner/name&ref=main&path=stories/chess/runs`; one git-trees request lists the files, raw.githubusercontent.com
serves them). A token for a private repository is typed into the page and kept in memory only.

Build time: `scripts/export-viewer-data.ts` writes `public/viewer-data.json` (not committed) with every registered
story as JSON (for the story graph) and the `mechanics/*/views.json` view descriptors.
