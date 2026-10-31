/**
 * The heads of the progression mechanic. `progressionHead` has the shape the wave 3.0 plan froze
 * (what `test/mechanics/packages.test.ts` reads); `progressionWorkHead` is the one the mechanic is
 * built from: the real options and state, and the local extras (`puzzles-extras` is called,
 * `progression-extras` is provided; docs/design/carve-requests-T3.md).
 */
import { Type } from "typebox";
import type { ContextOf } from "@swarmtales/contracts";
import { defineApi, defineHead } from "@swarmtales/kernel";
import { ChannelsApi, ExileApi, LedgerApi, MarksApi, ProgressionApi, ReceiptsApi, PuzzlesApi } from "@swarmtales/mechanic-shared";
import { doorIn, freshState, PROGRESSION_EVENTS, PROGRESSION_PROMPTS, ProgressionOptions, type ProgressionState } from "./model.ts";
import { PuzzlesExtrasApi } from "./puzzles-extras.ts";

export const progressionHead = defineHead({
	id: "progression",
	summary: "Levels, submissions, doors, acts and the ranking.",
	options: Type.Object({}),
	state: () => undefined,
	events: { ...PROGRESSION_EVENTS },
	provides: [ProgressionApi],
	requires: [PuzzlesApi, LedgerApi, ChannelsApi, ReceiptsApi],
	uses: [ExileApi, MarksApi],
});

/** What others need from progression beyond the frozen API (requests 5 to 7). */
export const ProgressionExtrasApi = defineApi({
	name: "progression-extras",
	summary: "Penalty prices, blame charges and the end of an act.",
	methods: {
		nextPenalty: {
			kind: "query",
			summary: "What the resident's next wrong code in this act costs (old `nextPenalty`).",
			input: Type.Object({ resident: Type.String() }),
			output: Type.Number(),
		},
		nextBlamePenalty: {
			kind: "query",
			summary: "What the resident pays for its next lost blame in this act (old `nextBlamePenalty`).",
			input: Type.Object({ resident: Type.String() }),
			output: Type.Number(),
		},
		chargeBlame: {
			kind: "command",
			summary: "A lost blame: returns its price and the count climbs (old `#chargeBlame`).",
			input: Type.Object({ resident: Type.String() }),
			output: Type.Number(),
		},
		endAct: {
			kind: "command",
			summary: "The act starting at `fromLevel` is over (old `#endAct`, the tribunal reaching its target); false when it was over already.",
			input: Type.Object({ fromLevel: Type.Integer({ minimum: 1 }) }),
			output: Type.Boolean(),
		},
	},
});

export const progressionWorkHead = defineHead({
	id: "progression",
	summary: progressionHead.summary,
	options: ProgressionOptions,
	state: ({ options, residents }): ProgressionState => freshState(residents, options.startLevel, doorIn(options)),
	events: { ...PROGRESSION_EVENTS },
	prompts: PROGRESSION_PROMPTS,
	provides: [ProgressionApi, ProgressionExtrasApi],
	requires: [PuzzlesApi, PuzzlesExtrasApi, LedgerApi, ChannelsApi, ReceiptsApi],
	uses: [ExileApi, MarksApi],
});

export type ProgressionCtx = ContextOf<typeof progressionWorkHead>;
