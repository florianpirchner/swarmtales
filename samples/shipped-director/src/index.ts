// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Sample 4: a Director placed in a small game, with its dial at two values read from the log. The shipped Directors
 * of `@swarmtales/city-directors` need the City's run frame, so the Director is the sample's own, the coach, woken
 * by a tick trigger (`../README.md`, "What is new").
 *
 * @packageDocumentation
 */
export { coach, COACH_REMINDER, CoachOptions } from "./coach.ts";
export { default } from "../game.ts";
