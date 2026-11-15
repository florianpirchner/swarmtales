// SPDX-License-Identifier: Apache-2.0
/**
 * The `holdem` mechanic: fixed-limit Texas Hold'em for solo seats, heads-up or at a full table. A match is several
 * games of several hands; the button moves one seat per hand. The deal is seeded; with `duplicate` on (the default)
 * every game replays the same deals with the seats moved one place, so over as many games as there are seats every
 * seat plays every position's cards once and the luck of the deal cancels out of the match totals. Hands have no
 * stacks (the raise cap bounds a hand), so there is no all-in and no side pot.
 *
 * This package holds the head, the cards (`cards.ts`) and the betting model (`model.ts`) so far; the flow, the texts
 * and the mechanic itself follow (issue M4-38).
 *
 * @packageDocumentation
 */
export { holdemHead, type HoldemCtx, type HoldemToolCtx, type HoldemView } from "./head.ts";
export { HoldemSlice, type HoldemState } from "./model.ts";
