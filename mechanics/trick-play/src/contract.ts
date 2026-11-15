// SPDX-License-Identifier: Apache-2.0
/**
 * The service contract of the mechanic `trick-play`: the only file another mechanic imports. It holds the service
 * `trick-play`, the events, the rules of a trick as pure functions and the Monte Carlo worth of a hand, which a
 * reference listener or an offline script may share.
 *
 * @packageDocumentation
 */
export { TrickPlayEvents } from "./events.ts";
export { legalCards, orderAfter, roundPoints, trickWinner, trumpNamer, Phase, PlaySchema, Scoring, type Play } from "./model.ts";
export { expectedTricks } from "./reference.ts";
export { TrickPlayService } from "./service.ts";
