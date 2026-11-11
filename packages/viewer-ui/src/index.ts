/**
 * `@swarmtales/viewer-ui`: the run viewer's React components. A host (the static page in
 * `apps/viewer-web`, the VS Code webview) calls `mountViewer(element, host)`; see docs/design/viewer-build.md.
 */
export { mountViewer, type ViewerHandle } from "./mount.tsx";
export type { ViewerHost } from "./host.ts";
// The view descriptor types and `parseViews` are at `@swarmtales/viewer-ui/views`.
