/**
 * The `goals` mechanic (carve step 9, team T3, docs/design/carve-team-T3.md): the secret goals dealt
 * at the start of each act, the `goal` status part, the void goal of an exiled resident and the
 * resolution at the act's end. The old code is `GoalBook` (packages/engine/src/goals.ts).
 */
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { defineMechanic } from "@swarmtales/kernel";
import { GoalsApi, STATUS_ORDER } from "@swarmtales/mechanic-shared";
import { deal, goalOf, noteHeir, noteLeaders, onExiled, resolve, statusOf } from "./book.ts";
import { GoalsExtrasApi } from "./extras.ts";
import { goalsWorkHead } from "./head.ts";
import { GoalsSlice, GoalsSliceV0, loadGoals, saveGoals } from "./model.ts";

export { goalsHead } from "./head.ts";
export { GoalsExtrasApi } from "./extras.ts";
export { CoresExtrasApi } from "./cores-extras.ts";

export const goals = defineMechanic(goalsWorkHead, (kit) => ({
	services: [
		kit.provideSome(GoalsApi, {
			onExiled: ({ resident }, ctx) => {
				onExiled(ctx, resident);
				return null;
			},
		}),
		kit.provide(GoalsExtrasApi, {
			actStarted: ({ act, residents }, ctx) => {
				deal(ctx, act, residents);
				return null;
			},
			actEnded: ({ act }, ctx) => {
				resolve(ctx, act);
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
				return held === undefined ? null : { act: held.act, text: held.text };
			},
		}),
	],
	hooks: {
		turnInputs: (resident, ctx) => {
			const text = statusOf(ctx, resident);
			return text === undefined ? [] : [{ kind: "status", text, order: STATUS_ORDER.goal }];
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
