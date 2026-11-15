// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The head of the `puzzles` mechanic: its options, its state with the snapshot, its events, prompts and the services it provides and uses. */
import { defineHead, type CtxOf, type StateSetup } from "@swarmtales/sdk";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { LevelPiecesService } from "@swarmtales/mechanic-progression/contract";
import { HeldPiecesService } from "@swarmtales/mechanic-standoff/contract";
import { PuzzlesService } from "./contract.ts";
import { loadLevels, PUZZLES_PROMPTS, PuzzlesEvents, PuzzlesOptions, PuzzlesSlice, saveLevels, type PuzzlesState } from "./model.ts";
import { TeamPlanner } from "./teams.ts";

function freshPlanner(setup: StateSetup<typeof PuzzlesOptions>): TeamPlanner {
	return new TeamPlanner(setup.options.levels, setup.residents, setup.rng);
}

/**
 * The head of the puzzles: everything that can be read without running a handler.
 *
 * @public
 */
export const puzzlesHead = defineHead({
	id: "puzzles",
	package: "@swarmtales/mechanic-puzzles",
	summary: "The deal of each level: fragments, factors, teams, the hand-over guard, and what is left of them after an exile.",
	options: PuzzlesOptions,
	state: PuzzlesSlice,
	start: (setup): PuzzlesState => ({ levels: new Map(), exclusions: new Map(), standings: new Map(), struck: [], cityFactors: new Map(), delivered: new Set(), planner: freshPlanner(setup) }),
	snapshot: { save: saveLevels, load: (data, setup): PuzzlesState => loadLevels(data, freshPlanner(setup)) },
	events: PuzzlesEvents.events,
	prompts: PUZZLES_PROMPTS,
	provides: [LevelPiecesService, PuzzlesService, HeldPiecesService],
	// Both are optional: without `exile` nobody is banished, without `channels` no fragment was sent.
	uses: [ExileService, ChannelsService],
});

/**
 * The context of the puzzles' hooks and listeners.
 *
 * @public
 */
export type PuzzlesCtx = CtxOf<typeof puzzlesHead>;

/** What the readers of the deal need: the context of a handler, or the view of a fact. */
export type PuzzlesReader = Pick<PuzzlesCtx, "options"> & { readonly state: Readonly<PuzzlesState> };
