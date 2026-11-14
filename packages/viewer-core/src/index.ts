// SPDX-License-Identifier: Apache-2.0
/**
 * The pure part of the run viewer. It reads run folders through a `RunSource`, verifies the signed log with
 * `@swarmtales/chain`, indexes the events and derives what the views draw. No `node:*`, no DOM, no React: it
 * runs in a browser, a Web Worker and Node, and knows no game (events are open records). A run of the new
 * platform is read by the envelope reader, an old run by the legacy reader; `loadRun` picks.
 *
 * The index exports what the places the viewer runs in use; the other helpers (the default vocabularies,
 * `parseEvents`, `parseEnvelopes`, `messagesOf`, `spreadOf`, ...) are exported by their source files.
 *
 * @packageDocumentation
 */
export { joinPath, memorySource, type RunSource, type RunSourceEntry } from "./source.ts";
export type { ActorRule, ActorVocabulary, LoadIssue, RunEvent } from "./events.ts";
export type { RunMeta, UsageFile } from "./files.ts";
export { findRuns, loadRun, type FindRunsOptions, type LoadRunOptions, type RunModel, type RunSummary, type Transcript } from "./load.ts";
export { verifyRun, type RunVerification, type VerifyRunOptions } from "./verify.ts";
export { keyFingerprint } from "@swarmtales/chain";
export { indexRun, type RunIndex } from "./run-index.ts";
export { actorLanes, toolCounts, typeCounts, usageByTick, usageTotals, type Count, type Lane, type UsagePoint, type UsageTotals } from "./series.ts";
export { messageGraph, type MessageEdge, type MessageGraph, type MessageRule, type MessageVocabulary } from "./messages.ts";
export { compareRuns, type CompareRow, type Comparison, type RunMetric, type Spread } from "./compare.ts";
export { reportLinks, type ReportLink } from "./report-links.ts";
export { highlightsOf, type Highlight } from "./highlights.ts";
export type { Vocabulary } from "./vocabulary.ts";
export { DECISIONS_SOURCE, HUMAN, HUMAN_HAND_SOURCE, projectRun, RUN_SOURCE, TAKE_TOOL } from "./projection.ts";
export type { Activation, Call, Decision, Firing, Pause, ResumeMarker, RunProjection, Suspension } from "./projection-model.ts";
