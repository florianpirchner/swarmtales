// SPDX-License-Identifier: Apache-2.0
/**
 * The `puzzles` mechanic: the pieces of the fragment levels. Every level is dealt when the run starts (teams, a
 * password per team, a fragment per resident); when a resident is banished its fragments burn and the levels
 * nobody has reached contract. It has no tool: solving a level comes with a later milestone.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { defineMechanic } from "@swarmtales/sdk";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { ExileEvents, ExileService } from "@swarmtales/mechanic-exile/contract";
import { dealLevel, lastLevelOf } from "./deal.ts";
import { puzzlesHead } from "./head.ts";
import { lackingFragment, onExiled } from "./held.ts";

export { assembleAll, validatePuzzle, type FragmentPuzzle } from "./fragments.ts";
export { puzzlesHead, type PuzzlesCtx } from "./head.ts";
export { PuzzlesEvents, PuzzlesOptions, type LevelPuzzle, type LevelState, type PuzzlesState } from "./model.ts";
export { TeamLayoutError, TeamPlanner, type PlannedLevel, type Streams, type Team, type TeamLayout } from "./teams.ts";

const Level = Type.Integer({ description: "A level number" });
const Residents = (description: string) => Type.Array(Type.String({ description: "A resident id" }), { description });

/**
 * The puzzles: fragment levels dealt at the start of the run, and what an exile leaves of them.
 *
 * @example
 * ```ts
 * const levels = [{ number: 1, team: { kind: "random", size: 2 }, puzzle: { kind: "fragments", length: [6, 10], overlap: 2 } }] as const;
 * const game = defineGame({ id: "city", residents: 6, mechanics: [ledger(), exile(), puzzles({ levels: [...levels] })], end: { ticks: 12 } });
 * ```
 *
 * @public
 */
export const puzzles = defineMechanic(puzzlesHead, {
	hooks: {
		runStarted: (ctx) => {
			for (let level = ctx.options.startLevel; level <= lastLevelOf(ctx); level++) dealLevel(ctx, level);
		},
	},
	listeners: (kit) => [
		// After the ledger, so the points burn before the pieces whatever the game's order of mechanics is.
		kit.listen(
			ExileEvents,
			"exiled",
			(payload, ctx) => {
				onExiled(ctx, payload.agent, ctx.tryCall(ExileService, "exiled", {}) ?? [payload.agent]);
			},
			{ after: ["ledger"] },
		),
	],
	facts: {
		dealt: { output: Type.Array(Level, { description: "The dealt levels, ascending" }), compute: (view) => [...view.state.levels.keys()].sort((a, b) => a - b) },
		exclusions: {
			output: Type.Array(Type.Object({ level: Level, excluded: Residents("The banished who are out of their teams") }, { description: "One level" }), { description: "The contracted levels" }),
			compute: (view) => [...view.state.exclusions].map(([level, excluded]) => ({ level, excluded: [...excluded] })),
		},
		lacking: {
			output: Type.Array(Type.Object({ level: Level, holder: Type.String({ description: "The resident who holds the fragment" }), lacking: Residents("The teammates before the door without a copy of it") }, { description: "One fragment that is still owed" }), {
				description: "Who waits on whose fragment: per dealt level and holder, the teammates before that door who hold no copy",
			}),
			compute: (view) => {
				const city = { exiled: view.tryCall(ExileService, "exiled", {}) ?? [], dms: view.tryCall(ChannelsService, "dmRecords", {}) ?? [] };
				const levels = [...view.state.levels.keys()].sort((a, b) => a - b);
				return levels.flatMap((level) => view.residents.ids.map((holder) => ({ level, holder, lacking: [...lackingFragment(view, city, level, holder)] })).filter((entry) => entry.lacking.length > 0));
			},
		},
	},
});
