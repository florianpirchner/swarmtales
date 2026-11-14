# @swarmtales/viewer-web

The viewer page: the run viewer as a static page. It reads runs in the browser; nothing is uploaded.

- `pnpm --filter @swarmtales/viewer-web dev`: starts Vite.
- `pnpm --filter @swarmtales/viewer-web build`: writes a static `dist/` that any web server can serve (relative
  base). `pnpm build` at the root builds it too.
- `pnpm --filter @swarmtales/viewer-web preview`: serves `dist/`.

Sources: pick a folder, drop a folder, the File System Access API (Chromium), or GitHub
(`?repo=owner/name&ref=main&path=<folder>`; one git-trees request lists the files, raw.githubusercontent.com serves
them). A token for a private repository is typed into the page and kept in memory, unless "Remember on this device"
is ticked. Runs packed next to the page (`runs/index.json`) open at start. A run of the new platform (a folder with a
`manifest.json`) and a run of the old platform both open; the old runs of this repository are read with `ref=legacy`.

A build may carry `public/viewer-data.json` with the view descriptors of the mechanics and the game descriptions
for the Games tab; without the file the page has neither and still works.

The code is carried from the old platform. Not carried yet: the script that writes `viewer-data.json`, the script
that packs runs next to the page, the Pages workflow and the check of its artifact.

## Third-party dependencies

| Package | Version | Licence | For |
|---|---|---|---|
| `react`, `react-dom` | 19.3.1 | MIT | the launcher |
| `vite` (development) | 7.3.8 | MIT | the build of the page |
| `@vitejs/plugin-react` (development) | 5.2.0 | MIT | JSX in that build |
| `@types/react`, `@types/react-dom` (development) | 19.3.0 | MIT | types |
