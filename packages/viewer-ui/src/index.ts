// SPDX-License-Identifier: Apache-2.0
/**
 * The run viewer's React components. The place the viewer runs in (the static page in `apps/viewer-web`)
 * calls `mountViewer(element, setup)`.
 *
 * @packageDocumentation
 */
export { mountViewer, type ViewerHandle } from "./mount.tsx";
export type { ViewerSetup } from "./setup.ts";
export { parseGames, type GameInfo } from "./games.ts";
export { parseViews, type ParsedViews, type ViewDescriptor } from "./views.ts";
