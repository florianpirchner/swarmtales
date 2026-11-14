// SPDX-License-Identifier: Apache-2.0
/**
 * Scripted and fake drivers, play, fixture mechanic, conformance checks and the oracle runner. The issues of milestone M1 fill this package.
 *
 * @packageDocumentation
 */
export { fakeDriver, idleDriver, scriptedDriver, type CallRecord, type Plan, type PlannedCall } from "./drivers.ts";
export { play, testKernel, type Played, type PlayOptions, type TestKernel } from "./play.ts";

export { checkDeterminism, checkOptionsDocumented, checkPackage, checkSnapshotRoundTrip, type ConformanceOptions } from "./conformance.ts";
export { guessNumber, guessNumberHead } from "./fixtures/index.ts";

export { countsOf, ORACLE_FORMAT, ORACLE_VERSION, OracleEntrySchema, OracleSchema, readOracle, runOracle, timelineOf, type Oracle, type OracleCall, type OracleEntry, type OracleLevel, type OracleMismatch, type OracleSetup, type OracleSource } from "./oracle/index.ts";
