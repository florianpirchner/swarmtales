// SPDX-License-Identifier: Apache-2.0
/**
 * Facts of a run, statistics, experiments and the computed run report. The issues of milestone M2 fill this package.
 *
 * @packageDocumentation
 */
export { LabError } from "./errors.ts";
export { type NoiseFloor, NoiseFloorSchema, type NoiseSummary, parseNoiseFloor, SummarySchema } from "./experiment/noise-schema.ts";
export { type ExperimentResults, ExperimentResultsSchema, parseExperimentResults } from "./experiment/results.ts";
export { type ExperimentSpec, ExperimentSpecSchema, parseExperimentSpec, parseLabFile } from "./experiment/spec.ts";
export { type Effect, pairedEffect, share, unpairedEffect } from "./stats/effect.ts";
export { BOOTSTRAP_SEED, summarize } from "./stats/summary.ts";
export { shareWithinNoise, type Tolerance, withinNoise } from "./stats/tolerance.ts";
export { factsOf, type FactValue, type RunFacts } from "./facts/facts.ts";
export { readRun } from "./facts/read.ts";
export { COMPARE_FIELDS, comparable } from "./experiment/compare.ts";
export { type PlannedRun, planRuns } from "./experiment/plan.ts";
export { type ExperimentOptions, type ExperimentState, ExperimentStateSchema, type MetricTable, type PlayRun, readExperimentState, type RunOutcome, type RunRecord, runExperiment } from "./experiment/run.ts";
export { analyse } from "./experiment/analyse.ts";
export { LOOPHOLE_HEADING, NO_LOOPHOLE_PART, renderRunReport } from "./report/run-report.ts";
export { renderSeriesReport } from "./report/series-report.ts";
