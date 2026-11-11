# @swarmtales/viewer-ui

The run viewer's React components (SUL licence). A host calls `mountViewer(element, host)`; the viewer reads runs
only through `@swarmtales/viewer-core`. Views: run list, overview with chain badge, replay (scrubber, lanes,
virtualised event list, who-writes-to-whom graph, story views), report with `#seq` links, charts, compare, and the
story graph (React Flow, a column layout of its own: level backbone, rule cards with action chips, branches, act boxes) with a run overlay. The package is consumed as source by a bundler (Vite, esbuild);
it has no build step. The chain check runs in a Web Worker (`src/verify-worker.ts`, falls back to the main thread).

The host contract is in [docs/design/viewer-build.md](../../docs/design/viewer-build.md). Tests: `test/viewer-ui/`.
Typecheck with `pnpm typecheck`; run it through `apps/viewer-web` (`pnpm --filter @swarmtales/viewer-web dev`).
