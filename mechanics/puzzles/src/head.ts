/**
 * The heads of the puzzles mechanic. `puzzlesHead` has the shape the wave 3.0 plan froze (it is what
 * `test/mechanics/packages.test.ts` reads: the shared APIs and the events it owns); `puzzlesWorkHead`
 * is the one the mechanic is built from: the same, plus the real options and state.
 */
import { Type } from "typebox";
import type { ContextOf, StateSetup, ViewOf } from "@swarmtales/contracts";
import { defineHead } from "@swarmtales/kernel";
import { ChannelsApi, ExileApi, ProgressionApi, PuzzlesApi } from "@swarmtales/mechanic-shared";
import { PUZZLES_EVENTS, PUZZLES_PROMPTS, PuzzlesOptions, type PuzzlesState } from "./model.ts";
import { TeamPlanner } from "./teams.ts";

export const puzzlesHead = defineHead({
	id: "puzzles",
	summary: "The deal of each level: fragments, factors, teams and exclusions.",
	options: Type.Object({}),
	state: () => undefined,
	events: { ...PUZZLES_EVENTS },
	provides: [PuzzlesApi],
	uses: [ChannelsApi, ProgressionApi, ExileApi],
});

export function freshPlanner(setup: Pick<StateSetup<typeof PuzzlesOptions>, "options" | "residents" | "rng">): TeamPlanner {
	return new TeamPlanner(setup.options.levels, setup.residents, setup.rng);
}

export const puzzlesWorkHead = defineHead({
	id: "puzzles",
	summary: puzzlesHead.summary,
	options: PuzzlesOptions,
	state: (setup): PuzzlesState => ({ levels: new Map(), cityFactors: new Map(), exclusions: new Map(), planner: freshPlanner(setup) }),
	events: { ...PUZZLES_EVENTS },
	prompts: PUZZLES_PROMPTS,
	provides: [PuzzlesApi],
	uses: [ChannelsApi, ProgressionApi, ExileApi],
});

export type PuzzlesCtx = ContextOf<typeof puzzlesWorkHead>;
export type PuzzlesView = ViewOf<typeof puzzlesWorkHead>;
