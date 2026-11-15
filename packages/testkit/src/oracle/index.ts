// SPDX-License-Identifier: Apache-2.0
/** The oracle runner: the file format, the reader, the fold of a log into oracle entries, and the comparison. */
export { ORACLE_FORMAT, ORACLE_VERSION, OracleEntrySchema, OracleSchema, type Oracle, type OracleCall, type OracleEntry, type OracleSetup, type OracleSource } from "./format.ts";
export { countsOf, readOracle, withEndsTurn } from "./read.ts";
export { eventBurst, projectCalls, projectionDifference, projectionRest, projectLog, projectOracle, renumbered, type ProjectedEvent, type ProjectionDifference, type ProjectionSelector } from "./project.ts";
export { playOracle, runOracle, type OracleLevel, type OracleMismatch } from "./run.ts";
export { timelineOf } from "./timeline.ts";
