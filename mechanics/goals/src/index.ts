// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The `goals` mechanic, carried from the old `mechanics/goals`: the secret goals dealt at the start of each act
 * (it listens to `progression.act_started`), the `goal` status part, the void goal of an exiled resident (it listens
 * to `exile.exiled`), the heirs of a last will (`exile.last_will`), and the resolution and payout at the act's end
 * (`progression.act_ended`). A Director's note that gives a goal away is refused by its `rule` handler on the note
 * tools. The gamemaker reads the fact `texts`.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { ExileEvents } from "@swarmtales/mechanic-exile/contract";
import { ProgressionEvents } from "@swarmtales/mechanic-progression/contract";
import { defineMechanic } from "@swarmtales/sdk";
import { deal, goalOf, noteHeir, noteLeaders, onExiled, resolve, statusOf } from "./book.ts";
import { goalsHead, type GoalsView } from "./head.ts";
import { checkGoal } from "./note.ts";

export { GoalSchema, GoalsEvents, GoalsService, type Goal } from "./contract.ts";
export { dealableKinds, dealGoals, type DealSpec, type DealStreams } from "./deal.ts";
export { type HeldGoal } from "./book.ts";
export { goalsHead, type GoalsCtx, type GoalsView } from "./head.ts";
export { GOAL_KINDS, GoalsOptions, GoalsSlice, type ActGoals, type GoalKind, type GoalsState } from "./model.ts";
export { checkGoal } from "./note.ts";

/** The old order of the goals' part of the status line (`STATUS_ORDER.goal`). */
const GOAL_ORDER = 1100;

const Resident = Type.String({ description: "A resident id" });

const facts = {
	running: {
		output: Type.Array(Type.Object({ act: Type.Integer({ description: "The act" }), agent: Resident, kind: Type.String({ description: "The kind" }) }, { description: "A goal held" }), { description: "The goals held in running acts" }),
		compute: (view: GoalsView) => view.state.acts.filter((entry) => !entry.resolved).flatMap((entry) => entry.goals.filter(({ agent }) => !entry.voided.includes(agent)).map(({ agent, goal }) => ({ act: entry.act, agent, kind: goal.kind }))),
	},
	// Each resident's goal of a running act in the game's words: the gamemaker's "secret goal" (A73: `LinesSchema` of `mechanics/city-directors/src/gamemaker/report/characters.ts`).
	texts: {
		output: Type.Record(Resident, Type.String({ description: "Its text" }), { description: "A text per resident" }),
		compute: (view: GoalsView) =>
			Object.fromEntries(
				view.residents.ids.flatMap((agent) => {
					const held = goalOf(view, agent);
					return held === undefined ? [] : [[agent, held.text]];
				}),
			),
	},
};

/**
 * The secret goals: dealt per act, read out at an exile and at the act's end, paid when they hold.
 *
 * @example
 * ```ts
 * const game = defineGame({ id: "city", residents: 6, mechanics: [ledger(), channels(), exile(), motives(MOTIVES), progression(LEVELS), goals(GOALS)], end: { ticks: 60 } });
 * ```
 *
 * @public
 */
export const goals = defineMechanic(goalsHead, {
	services: {
		goals: {
			goalOf: ({ resident }, ctx) => {
				const held = goalOf(ctx, resident);
				if (held === undefined) return null;
				const { goal } = held;
				return "target" in goal ? { act: held.act, kind: goal.kind, target: goal.target, text: held.text } : { act: held.act, kind: goal.kind, text: held.text };
			},
			noteLeaders: ({ leaders }, ctx) => {
				noteLeaders(ctx, leaders);
				return null;
			},
		},
	},
	pipeline: { rule: checkGoal },
	hooks: {
		turnInputs: (resident, ctx) => {
			const text = statusOf(ctx, resident);
			return text === undefined ? [] : [{ kind: "status", text, order: GOAL_ORDER }];
		},
	},
	facts,
	listeners: (kit) => [
		kit.listen(ProgressionEvents, "act_started", ({ fromLevel, residents }, ctx) => {
			deal(ctx, fromLevel, residents);
		}),
		// The old `LISTENER_ORDER.act_ended`: the seal ends, then the goals are resolved.
		kit.listen(
			ProgressionEvents,
			"act_ended",
			({ fromLevel }, ctx) => {
				resolve(ctx, fromLevel);
			},
			{ after: ["seal"] },
		),
		kit.listen(ExileEvents, "exiled", ({ agent }, ctx) => {
			onExiled(ctx, agent);
		}),
		// Old `noteHeir`, once per heir of the will.
		kit.listen(ExileEvents, "last_will", ({ bequests }, ctx) => {
			for (const heir of new Set(bequests.map((bequest) => bequest.to))) noteHeir(ctx, heir);
		}),
	],
});
