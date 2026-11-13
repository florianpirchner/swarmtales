# @swarmtales/viewer-web

The run viewer as a static page (SUL licence, private). It reads runs in the browser; nothing is uploaded.

- `pnpm --filter @swarmtales/viewer-web dev`: exports the story and view data, then starts Vite.
- `pnpm --filter @swarmtales/viewer-web build`: writes a static `dist/` that any web server can host (relative base).
  `pnpm build` at the root builds it too.
- `pnpm --filter @swarmtales/viewer-web build:pages`: the GitHub Pages build. It leaves the stories out of
  `viewer-data.json` (the story view then reads the story from the run's own `000-run.json`) and runs
  `scripts/check-pages-artifact.ts`, which fails unless `dist/` holds only `index.html`, `viewer-data.json` and
  `assets/*.js|css`, with no source maps, local paths or keys.
- `pnpm --filter @swarmtales/viewer-web preview`: serves `dist/`.

Sources: pick a folder, drop a folder, the File System Access API (Chromium), or GitHub
(`?repo=owner/name&ref=main&path=stories/chess/runs`; one git-trees request lists the files, raw.githubusercontent.com
serves them). A token for a private repository is typed into the page and kept in memory only.

Build time: `scripts/export-viewer-data.ts` writes `public/viewer-data.json` (not committed) with every registered
story as JSON (for the story graph), the `mechanics/*/views.json` view descriptors, and the Games tab's data
(`scripts/viewer-games.ts`: per story folder its README, variants, tools with the text the residents read, and the
mechanics with their event types).

The Replay tab lists **highlights**: the lines the run's report cites (`#seq`, with the report's sentence), rare actions
(an event type seen at most three times) and notable ones (refusals, forgeries, verdicts, ...), each with the actor's
last thought before it (`highlightsOf` in viewer-core; no model call).

## GitHub Pages

`.github/workflows/pages.yml` builds with `build:pages` and deploys `dist/` on a push to `main` that touches the viewer
(or by hand). The page is public even while the repository is private: it holds the app only, never runs or stories.
Runs of a private repository are read in the browser with a fine-grained token (read access to contents), which is
typed or pasted into the page and sent only to `api.github.com`; the page's Content Security Policy allows no other
host. By default it is kept in memory only (gone on reload). Ticking "Remember on this device" keeps it in
`localStorage` until the box is unticked and Open is pressed again; then a `?repo=` link opens right away. The Pages
origin `<owner>.github.io` is shared by every Pages site of the owner, so this is opt-in and meant for a read-only
token of one repository. A link such as
`https://<owner>.github.io/swarmtales/?repo=owner/name&path=stories/chess/runs` fills the form; the token is pasted
there and Open loads the runs.

One-time setup in the repository settings: Actions allowed, and Pages > Source "GitHub Actions". `ci.yml` runs only by
hand, so enabling Actions starts no checks.

## A private copy with runs inside

`tsx scripts/bundle-viewer-runs.ts --out <dist> --title <title> <run-folder>...` packs run folders into a built viewer:
one `runs/<name>.json` per folder (only the files the viewer reads, no per-minute snapshots) and `runs/index.json`. The
page opens them at start, without GitHub or a token. Meant for a private copy, such as a claude.ai artifact; the Pages
check refuses a `runs/` folder.
