// SPDX-License-Identifier: Apache-2.0
/**
 * The city slice as a game family: `game.ts` stays the one game of the committed timelines, and this file is what
 * `swt run --set briefed=true` is given for a run with model residents. The default params give the game of `game.ts`,
 * with the same data and the same hash.
 */
import { defineGameFamily } from "@swarmtales/sdk";
import { Type } from "typebox";
import { sliceGame } from "./game.ts";

const Params = Type.Object(
	{ briefed: Type.Boolean({ default: false, description: "Every resident gets a briefing, and the court tells every resident when its session opens." }) },
	{ description: "The variants of the city slice." },
);

/**
 * The family of the city slice: `{ briefed: true }` is the variant for a run with model residents.
 *
 * @example
 * ```ts
 * const resolved = resolveGame({ game: sliceFamily, params: { briefed: true }, schedulers: { turns }, prompts });
 * ```
 *
 * @public
 */
export const sliceFamily = defineGameFamily(Params, (params) => sliceGame(params));

export default sliceFamily;
