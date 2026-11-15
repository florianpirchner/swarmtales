// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The `/contract` sub-path of this mechanic: what other mechanics may import besides `/rules`. The morris-referee
 * listens to the events and scores every turn with the search, in its own copy of the position.
 *
 * @packageDocumentation
 */
export { MorrisEvents } from "./events.ts";
export { ENGINE } from "./model.ts";
export { classify, scoreTurn, type MoveClass, type TurnScore } from "./search.ts";
