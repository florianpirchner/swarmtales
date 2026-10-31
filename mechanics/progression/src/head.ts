/**
 * The heads of the progression mechanic. `progressionHead` has the shape the wave 3.0 plan froze
 * (what `test/mechanics/packages.test.ts` reads); `progressionWorkHead` is the one the mechanic is
 * built from: the real options and state.
 */
import { Type } from "typebox";
import type { ContextOf } from "@swarmtales/contracts";
import { defineHead } from "@swarmtales/kernel";
import { ChannelsApi, ExileApi, LedgerApi, MarksApi, NamesApi, ProgressionApi, PuzzlesApi, ReceiptsApi, StandoffTribunalApi } from "@swarmtales/mechanic-shared";
import { doorIn, freshState, PROGRESSION_EVENTS, PROGRESSION_PROMPTS, ProgressionOptions, type ProgressionState } from "./model.ts";

export const progressionHead = defineHead({
	id: "progression",
	summary: "Levels, submissions, doors, acts and the ranking.",
	options: Type.Object({}),
	state: () => undefined,
	events: { ...PROGRESSION_EVENTS },
	provides: [ProgressionApi],
	requires: [PuzzlesApi, LedgerApi, ChannelsApi, ReceiptsApi],
	uses: [ExileApi, MarksApi, NamesApi, StandoffTribunalApi],
});

export const progressionWorkHead = defineHead({
	id: "progression",
	summary: progressionHead.summary,
	options: ProgressionOptions,
	state: ({ options, residents }): ProgressionState => freshState(residents, options.startLevel, doorIn(options)),
	events: { ...PROGRESSION_EVENTS },
	prompts: PROGRESSION_PROMPTS,
	provides: [ProgressionApi],
	requires: [PuzzlesApi, LedgerApi, ChannelsApi, ReceiptsApi],
	uses: [ExileApi, MarksApi, NamesApi, StandoffTribunalApi],
});

export type ProgressionCtx = ContextOf<typeof progressionWorkHead>;
