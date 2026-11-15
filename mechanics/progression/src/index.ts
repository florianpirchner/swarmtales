// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The `progression` mechanic: levels and their doors, `submitSolution` with the penalty ladder and the attempt
 * window, the looks `getStatus`, `getProblem`, `listAgents` and `activeTools`, and the task and status lines of a
 * turn. It asks `level-pieces` (the mechanic `puzzles`) for the codes and tasks, books through the ledger, speaks
 * through the channels, and provides the service `progression` (the levels for `marks`, the acts, the doors, the
 * ranking, the blame's charge and the unlocks). On entering a level a resident's managed tools become the level's
 * set; the acts begin with the first resident on their first level and all end with the run.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { defineMechanic, refuse } from "@swarmtales/sdk";
import { endAct, noteActStarts, syncLocks } from "./acts.ts";
import { progressionHead } from "./head.ts";
import { computeSection, computeTracks, ProgressionSectionFact, ProgressionTracksFact } from "./section.ts";
import { progressionService } from "./services.ts";
import { openDoor, openOnClock } from "./submit.ts";
import { hasNewTask, markTaskShown, statusParts, taskLines } from "./task.ts";
import { progressionTools } from "./tools.ts";

export { CastExtrasService, LevelPiecesService, ProgressionEvents, ProgressionService } from "./contract.ts";
export { progressionHead, type ProgressionCtx, type ProgressionToolCtx } from "./head.ts";
export { ProgressionOptions, type ProgressionState } from "./model.ts";
export { ProgressionSectionFact, ProgressionTracksFact } from "./section.ts";
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
	services: { progression: progressionService },
	pipeline: {
		// The old `enabledTools`: at the gate a resident may still talk, but no longer submit.
		lock: (call, ctx) => {
			if (call.owner !== ctx.mechanic || call.tool !== "submitSolution" || call.resident === undefined) return undefined;
			return ctx.tryCall(ExileService, "standing", { resident: call.resident })?.kind === "gate" ? refuse("TOOL_LOCKED", ctx.prompt("progression/replies/locked", {})) : undefined;
		},
	},
	hooks: {
		// The first act begins, then the locks follow the levels.
		runStarted: (ctx) => {
			noteActStarts(ctx, ctx.options.startLevel);
			for (const id of ctx.residents.ids) syncLocks(ctx, id);
		},
		tickStarted: [
			// The old arena opened the door only from the second minute on; then the door clock.
			(ctx) => {
				if (ctx.tick > 0) openDoor(ctx);
			},
			(ctx) => {
				openOnClock(ctx, ctx.tick);
			},
			// A door may open once the last laggard was banished by the tribunal's or the holdout's tick (J136).
			{
				after: ["tribunal", "standoff-tribunal"],
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
		// Every act begun ends with the run, in level order (old `closeActs`).
		runEnded: (_end, ctx) => {
			for (const fromLevel of [...ctx.state.actStarts.keys()].sort((a, b) => a - b)) endAct(ctx, fromLevel);
		},
	},
	facts: {
		levels: {
			output: Type.Array(Type.Object({ agent: Type.String({ description: "A resident id" }), level: Type.Integer({ description: "Its level" }), held: Type.Boolean({ description: "Waits at the door" }) }, { description: "One resident" }), { description: "Where every resident stands" }),
			compute: (view) => [...view.state.standings].map(([agent, entry]) => ({ agent, level: entry.level, held: entry.held })),
		},
		door: { output: Type.Union([Type.Integer({ description: "The level" }), Type.Null({ description: "None" })], { description: "The level whose door is shut" }), compute: (view) => view.state.door ?? null },
		// The gamemaker's report (A73, A74): its header, "Residents:" and the input of its wait lines, and the tracks.
		section: { output: ProgressionSectionFact, compute: computeSection },
		tracks: { output: ProgressionTracksFact, compute: computeTracks },
	},
});
