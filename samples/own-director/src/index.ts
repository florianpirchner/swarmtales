// SPDX-License-Identifier: Apache-2.0
/**
 * Sample 6: a Director of your own. The mechanic `crew` proposes a captain as a decision with a window, the Director
 * `steward` reads the proposal and may amend it, and the game `../game.ts` loads both with the Human Hand. The
 * tutorial is `docs/tutorials/director.md`.
 *
 * @packageDocumentation
 */
export { CAPTAIN, crew } from "./crew.ts";
export { steward, STEWARD_FALLBACK } from "./steward.ts";
