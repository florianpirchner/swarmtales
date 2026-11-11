/**
 * `@swarmtales/viewer-core`: the pure core of the run viewer (docs/design/viewer-build.md). It reads
 * run folders through a `RunSource`, verifies the signed log with `@swarmtales/chain`, indexes the
 * events and derives what the views draw. No `node:*`, no DOM, no React: it runs in a browser, a Web
 * Worker and Node, and knows no game (events are open records, stories are read by their structure).
 */
export { joinPath, memorySource, type RunSource, type RunSourceEntry } from "./source.ts";
export { ACTOR_FIELDS, actorOf, numberField, parseEvents, stringField, type LoadIssue, type RunEvent } from "./events.ts";
export { RunMetaSchema, UsageFileSchema, type RunMeta, type UsageFile } from "./files.ts";
export { findRuns, loadRun, type FindRunsOptions, type RunModel, type RunSummary, type Transcript } from "./load.ts";
export { verifyRun, type RunVerification, type VerifyRunOptions } from "./verify.ts";
export { indexRun, type RunIndex } from "./run-index.ts";
export {
	actorLanes,
	messageGraph,
	messageOf,
	toolCounts,
	typeCounts,
	usageByMinute,
	usageTotals,
	type Count,
	type Lane,
	type Message,
	type MessageEdge,
	type MessageGraph,
	type UsagePoint,
	type UsageTotals,
} from "./series.ts";
export { compareRuns, spreadOf, type CompareRow, type Comparison, type RunMetric, type Spread } from "./compare.ts";
export { reportLinks, type ReportLink } from "./report-links.ts";
export { storyGraph, type GraphEdge, type GraphNode, type GraphNodeKind, type StoryGraph } from "./story-graph.ts";
export { DEFAULT_VOCABULARY, runOverlay, type NodeVisit, type OverlayVocabulary, type RunOverlay } from "./overlay.ts";
