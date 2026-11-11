/**
 * `@swarmtales/viewer-core`: the pure core of the run viewer (docs/design/viewer-build.md). It reads
 * run folders through a `RunSource`, verifies the signed log with `@swarmtales/chain`, indexes the
 * events and derives what the views draw. No `node:*`, no DOM, no React: it runs in a browser, a Web
 * Worker and Node, and knows no game (events are open records, stories are read by their structure).
 *
 * The index exports what the viewer's hosts use; the other helpers (the default vocabularies,
 * `parseEvents`, `messagesOf`, `spreadOf`, ...) are exported by their source files.
 */
export { joinPath, memorySource, type RunSource, type RunSourceEntry } from "./source.ts";
export type { RunEvent } from "./events.ts";
export { findRuns, loadRun, type RunModel, type RunSummary } from "./load.ts";
export { verifyRun, type RunVerification } from "./verify.ts";
export { keyFingerprint } from "@swarmtales/chain";
export { indexRun, type RunIndex } from "./run-index.ts";
export { actorLanes, toolCounts, typeCounts, usageByMinute, usageTotals, type Lane } from "./series.ts";
export { messageGraph, type MessageGraph } from "./messages.ts";
export { compareRuns, type Comparison } from "./compare.ts";
export { reportLinks } from "./report-links.ts";
export { storyGraph, type GraphEdge, type GraphNode, type StoryGraph } from "./story-graph.ts";
export { runOverlay, type RunOverlay } from "./overlay.ts";
export { storyHashOf } from "./story-hash.ts";
export type { Vocabulary } from "./vocabulary.ts";
