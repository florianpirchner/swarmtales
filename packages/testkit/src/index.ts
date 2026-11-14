// SPDX-License-Identifier: Apache-2.0
/**
 * Scripted and fake drivers, play, fixture mechanic, conformance checks and the oracle runner. The issues of milestone M1 fill this package.
 *
 * @packageDocumentation
 */
export { fakeDriver, idleDriver, scriptedDriver, type CallRecord, type Plan, type PlannedCall } from "./drivers.ts";
export { play, testKernel, type Played, type PlayOptions, type TestKernel } from "./play.ts";
