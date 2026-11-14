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
