// SPDX-License-Identifier: Apache-2.0
/**
 * The `progression` mechanic: levels and their doors, `submitSolution` with the penalty ladder and the attempt
 * window, the looks `getStatus`, `getProblem`, `listAgents` and `activeTools`, and the task and status lines of a
 * turn. It asks `level-pieces` (the mechanic `puzzles`) for the codes and tasks, books through the ledger, speaks
 * through the channels, and provides `levelOf` for `marks`. The acts, the tool unlocks per level, the ranking service
 * and the end of the run come with the second half of the port (M5-20).
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { defineMechanic } from "@swarmtales/sdk";
import { progressionHead } from "./head.ts";
import { hasPassed, isFinished, levelOf } from "./levels.ts";
import { openDoor, openOnClock } from "./submit.ts";
import { hasNewTask, markTaskShown, statusParts, taskLines } from "./task.ts";
import { progressionTools } from "./tools.ts";

export { LevelPiecesService, ProgressionEvents, ProgressionService } from "./contract.ts";
export { progressionHead, type ProgressionCtx, type ProgressionToolCtx } from "./head.ts";
export { ProgressionOptions, type ProgressionState } from "./model.ts";
export { progressionTools, TOOL_ORDER } from "./tools.ts";

/**
 * The progression: levels, doors, codes and the task and status lines.
 *
 * @example
 * ```ts
 * const levels = [{ number: 1, title: "The first door", reward: 5, tools: ["submitSolution"], task: "Your password is {fragment}." }];
 * const game = defineGame({ id: "city", residents: 6, mechanics: [ledger(), channels(), puzzles(), progression({ levels })], end: { ticks: 12 } });
 * ```
 *
 * @public
 */
export const progression = defineMechanic(progressionHead, {
	tools: progressionTools,
	services: {
		progression: {
			levelOf: ({ resident }, ctx) => levelOf(ctx, resident),
			isFinished: ({ resident }, ctx) => isFinished(ctx, resident),
			hasPassed: ({ resident, level }, ctx) => hasPassed(ctx, resident, level),
		},
	},
	hooks: {
		tickStarted: [
			// The old arena opened the door only from the second minute on; then the door clock.
			(ctx) => {
				if (ctx.tick > 0) openDoor(ctx);
			},
			(ctx) => {
				openOnClock(ctx, ctx.tick);
			},
			// A door may open once the last laggard was banished by the tribunal's tick.
			{
				after: ["tribunal"],
				run: (ctx) => {
					if (ctx.tick > 0) openDoor(ctx);
				},
			},
		],
		turnInputs: (resident, ctx) => [...statusParts(ctx, resident), ...taskLines(ctx, resident)],
		activationOpened: (resident, ctx) => {
			markTaskShown(ctx, resident);
		},
		news: (resident, ctx) => hasNewTask(ctx, resident),
	},
	facts: {
		levels: {
			output: Type.Array(Type.Object({ agent: Type.String({ description: "A resident id" }), level: Type.Integer({ description: "Its level" }), held: Type.Boolean({ description: "Waits at the door" }) }, { description: "One resident" }), { description: "Where every resident stands" }),
			compute: (view) => [...view.state.standings].map(([agent, entry]) => ({ agent, level: entry.level, held: entry.held })),
		},
		door: { output: Type.Union([Type.Integer({ description: "The level" }), Type.Null({ description: "None" })], { description: "The level whose door is shut" }), compute: (view) => view.state.door ?? null },
	},
});
