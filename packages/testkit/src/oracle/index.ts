// SPDX-License-Identifier: Apache-2.0
/** The oracle runner: the file format, the reader, the fold of a log into oracle entries, and the comparison. */
export { ORACLE_FORMAT, ORACLE_VERSION, OracleEntrySchema, OracleSchema, type Oracle, type OracleCall, type OracleEntry, type OracleSetup, type OracleSource } from "./format.ts";
export { countsOf, readOracle } from "./read.ts";
export { runOracle, type OracleLevel, type OracleMismatch } from "./run.ts";
export { timelineOf } from "./timeline.ts";
