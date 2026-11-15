// SPDX-License-Identifier: Apache-2.0
/**
 * Scripted and fake drivers, play, fixture mechanic, conformance checks and the oracle runner. The issues of milestone M1 fill this package.
 *
 * @packageDocumentation
 */
export { fakeDriver, idleDriver, scriptedDriver, type CallRecord, type Plan, type PlannedCall } from "./drivers.ts";
export { play, testKernel, type Played, type PlayOptions, type TestKernel } from "./play.ts";
export { metricsOf } from "./metrics.ts";
export { replay, type ReplayInput, type ReplayResult } from "./replay.ts";
export { checkReplay, checkResumeEveryBoundary, sampleBoundaries, type StandingDrivers, type StandingOptions } from "./standing.ts";

export { checkDeterminism, checkOptionsDocumented, checkPackage, checkSnapshotRoundTrip, type ConformanceOptions } from "./conformance.ts";
export { guessNumber, guessNumberHead } from "./fixtures/index.ts";

export { countsOf, eventBurst, projectCalls, projectionRest, renumbered, ORACLE_FORMAT, ORACLE_VERSION, OracleEntrySchema, OracleSchema, playOracle, projectionDifference, projectLog, projectOracle, readOracle, runOracle, timelineOf, withEndsTurn, type Oracle, type OracleCall, type OracleEntry, type OracleLevel, type OracleMismatch, type OracleSetup, type OracleSource, type ProjectedEvent, type ProjectionDifference, type ProjectionSelector } from "./oracle/index.ts";
