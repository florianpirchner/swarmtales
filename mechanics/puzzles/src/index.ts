/**
 * The `puzzles` mechanic (carve step 7, team T3, docs/design/carve-team-T3.md): the deal of each
 * level (fragments and factors), teams, the secrets the guard keeps off the board, and the
 * exclusions after an exile. The old code is `World#dealLevel` and its neighbours.
 */
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { defineMechanic } from "@swarmtales/kernel";
import { dealLevel, lastLevelOf, openingLevels } from "./deal.ts";
import { leakOf, secretsOf } from "./guard.ts";
import { freshPlanner, puzzlesWorkHead } from "./head.ts";
import { loadLevels, PuzzlesSlice, PuzzlesSliceV0, saveLevels } from "./model.ts";
import { puzzlesImplementation } from "./services.ts";
import { HOOK_ORDER, PuzzlesApi } from "@swarmtales/mechanic-shared";
import { repairAfterResume } from "./resume.ts";

export { puzzlesHead } from "./head.ts";

export const puzzles = defineMechanic(puzzlesWorkHead, (kit) => ({
	services: [kit.provide(PuzzlesApi, puzzlesImplementation)],
	hooks: {
		runStarted: {
			order: HOOK_ORDER.runStarted.puzzles,
			run: (ctx) => {
				const dealt = new Set(openingLevels(ctx));
				for (let level = ctx.options.startLevel; level <= lastLevelOf(ctx); level++) {
					// Behind a door only the teams are planned, so layout errors surface at the start.
					if (dealt.has(level)) dealLevel(ctx, level);
					else ctx.state.planner.teamsOf(level);
				}
			},
		},
		// A resumed run repairs its levels after the door, the act starts and the locks (old `World#restore`, world.ts:3124-3135; R2-D9).
		runResumed: { order: HOOK_ORDER.runResumed.puzzles, run: repairAfterResume },
	},
	guard: {
		secrets: (resident, minRun, ctx) => secretsOf(ctx, resident, minRun),
		leaks: (text, secrets, minRun, ctx) => leakOf(ctx, text, secrets, minRun),
	},
	facts: {
		dealt: kit.fact(Type.Array(Type.Integer()), (view) => [...view.state.levels.keys()].sort((a, b) => a - b)),
		exclusions: kit.fact(Type.Array(Type.Object({ level: Type.Integer(), excluded: Type.Array(Type.String()) })), (view) =>
			[...view.state.exclusions].map(([level, excluded]) => ({ level, excluded: [...excluded] })),
		),
	},
	snapshot: kit.snapshot({
		version: 1,
		schema: PuzzlesSlice,
		save: saveLevels,
		load: (data, setup) => loadLevels(data, freshPlanner(setup)),
		migrations: {
			// The converter's version-0 slice is the old world's `levels`, `cityFactors` and `exclusions`.
			0: (old) => {
				const legacy = Parse(PuzzlesSliceV0, old);
				return { levels: legacy.levels, cityFactors: legacy.cityFactors ?? [], exclusions: legacy.exclusions ?? [] };
			},
		},
	}),
}));
