// SPDX-License-Identifier: Apache-2.0
/**
 * Game: the city slice, the smallest part of the City of Keys with a Director and the Human Hand.
 *
 * @packageDocumentation
 */
export { default, sliceGame, type SliceOptions } from "../game.ts";
export { sliceFamily } from "../family.ts";
export { briefing, type BriefingFacts } from "../briefing.ts";
export { AMENDED_HAND, HAND, SCRIPT, WARDEN_ANSWERS, callsOf, type HandLine, type ScriptedCall } from "./scripts.ts";
export { WARDEN_FALLBACK, warden } from "./warden.ts";
