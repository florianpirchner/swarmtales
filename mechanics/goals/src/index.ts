/**
 * The `goals` mechanic (carve step 9, team T3, docs/design/carve-team-T3.md): the secret goals dealt
 * at the start of each act, the `goal` status part, the void goal of an exiled resident and the
 * resolution at the act's end. The old code is `GoalBook` (packages/engine/src/goals.ts).
 *
 * Progression tells it when an act begins and ends with the silent events `act_started` and
 * `act_ended` (D-2); the listeners are immediate, so the lines land where the old `#noteActStarts`
 * and `#endAct` wrote them, and ordered by `LISTENER_ORDER` (goals deal before the seal begins, the
 * seal ends before the goals resolve).
 */
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { defineMechanic } from "@swarmtales/kernel";
import { GoalsApi, HOOK_ORDER, LISTENER_ORDER, ProgressionEvents, STATUS_ORDER } from "@swarmtales/mechanic-shared";
import { deal, goalOf, noteHeir, noteLeaders, onExiled, resolve, statusOf } from "./book.ts";
import { goalsWorkHead } from "./head.ts";
import { GoalsSlice, GoalsSliceV0, loadGoals, saveGoals } from "./model.ts";

export { goalsHead } from "./head.ts";

export const goals = defineMechanic(goalsWorkHead, (kit) => ({
	services: [
		kit.provide(GoalsApi, {
			onExiled: ({ resident }, ctx) => {
				onExiled(ctx, resident);
				return null;
			},
			noteLeaders: ({ leaders }, ctx) => {
				noteLeaders(ctx, leaders);
				return null;
			},
			noteHeir: ({ heir }, ctx) => {
				noteHeir(ctx, heir);
				return null;
			},
			goalOf: ({ resident }, ctx) => {
				const held = goalOf(ctx, resident);
				if (held === undefined) return null;
				const { goal } = held;
				return goal.kind === "protect" || goal.kind === "exile" || goal.kind === "outrank"
					? { act: held.act, kind: goal.kind, target: goal.target, text: held.text }
					: { act: held.act, kind: goal.kind, text: held.text };
			},
		}),
	],
	listeners: [
		kit.listen(
			ProgressionEvents,
			"act_started",
			(payload, ctx) => {
				deal(ctx, payload.fromLevel, payload.residents);
			},
			{ immediate: true, order: LISTENER_ORDER.act_started.goals },
		),
		kit.listen(
			ProgressionEvents,
			"act_ended",
			(payload, ctx) => {
				resolve(ctx, payload.fromLevel);
			},
			{ immediate: true, order: LISTENER_ORDER.act_ended.goals },
		),
	],
	hooks: {
		turnInputs: {
			order: HOOK_ORDER.turnInputs.status,
			run: (resident, ctx) => {
				const text = statusOf(ctx, resident);
				return text === undefined ? [] : [{ kind: "status", text, order: STATUS_ORDER.goal }];
			},
		},
	},
	facts: {
		running: kit.fact(Type.Array(Type.Object({ act: Type.Integer(), agent: Type.String(), kind: Type.String() })), (view) =>
			[...view.state.acts]
				.filter(([, state]) => !state.resolved)
				.flatMap(([act, state]) => [...state.goals].filter(([agent]) => !state.voided.has(agent)).map(([agent, goal]) => ({ act, agent, kind: goal.kind }))),
		),
	},
	snapshot: kit.snapshot({
		version: 1,
		schema: GoalsSlice,
		save: saveGoals,
		load: (data) => loadGoals(data),
		// The converter's version-0 slice is the old `GoalsSnapshot` under the key `goals`.
		migrations: { 0: (old) => Parse(GoalsSliceV0, old).goals },
	}),
}));
