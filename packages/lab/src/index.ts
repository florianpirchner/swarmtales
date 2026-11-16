// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Facts of a run, statistics, experiments and the computed run report. The issues of milestone M2 fill this package.
 *
 * @packageDocumentation
 */
export { LabError, RunRefused } from "./errors.ts";
export { type NoiseFloor, NoiseFloorSchema, type NoiseSummary, parseNoiseFloor, SummarySchema } from "./experiment/noise-schema.ts";
export { type ExperimentResults, ExperimentResultsSchema, parseExperimentResults } from "./experiment/results.ts";
export { type ExperimentSpec, ExperimentSpecSchema, parseExperimentSpec, parseLabFile } from "./experiment/spec.ts";
export { type Effect, pairedEffect, share, unpairedEffect } from "./stats/effect.ts";
export { BOOTSTRAP_SEED, summarize } from "./stats/summary.ts";
export { shareWithinNoise, type Tolerance, withinNoise } from "./stats/tolerance.ts";
export { ACTOR_KEYS, factsOf, type FactValue, type RunFacts } from "./facts/facts.ts";
export { chargeOf } from "./facts/charge.ts";
export { readRun } from "./facts/read.ts";
export { COMPARE_FIELDS, comparable } from "./experiment/compare.ts";
export { checkMetrics, type PlannedRun, planRuns } from "./experiment/plan.ts";
export { type ExperimentOptions, type MetricTable, type PlayRun, type RunOutcome, runExperiment } from "./experiment/run.ts";
export { type ExperimentState, ExperimentStateSchema, readExperimentState, resolveRunFolder, type RunRecord } from "./experiment/state.ts";
export { analyse } from "./experiment/analyse.ts";
export { LOOPHOLE_HEADING, NO_LOOPHOLE_PART, renderRunReport, type RunReportOptions } from "./report/run-report.ts";
export { renderSeriesReport } from "./report/series-report.ts";
export { type Analysis, centipawns, type ChessEngine, type Score } from "./chess/engine.ts";
export { analyseGame, analyseRun, analysisMarkdown, chessGamesOf, type ChessLine, type ChessMove, classOf, type GameAnalysis, type MoveClass, type ScoredPly, type SideSummary } from "./chess/analyse.ts";
