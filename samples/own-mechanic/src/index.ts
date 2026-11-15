// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Sample 5: a mechanic of your own. The mechanic `marks` lets residents mark a suspect; the mechanic `tribunal`
 * listens to its event and owns a decision; the game `../game.ts` loads both. The tutorial is
 * `docs/tutorials/mechanic.md`.
 *
 * @packageDocumentation
 */
export { MarksEvents, MarksService } from "./contract.ts";
export { marks, marksHead } from "./marks.ts";
export { SENTENCE, tribunal } from "./tribunal.ts";
