// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The contract of the mechanic `goals`: the shape of a goal, the events `goal_dealt` and `goal_resolved`, and the
 * service `goals` (old `GoalsApi` of `mechanics/shared`, less `onExiled` and `noteHeir`, which are listeners to
 * `exile` now). The only file another mechanic imports.
 *
 * @packageDocumentation
 */
import { Type, type Static } from "typebox";
import { defineEvents, defineService } from "@swarmtales/sdk";

const Id = Type.String({ description: "A resident id, for example `A03`" });
const Act = Type.Integer({ description: "The first level of the act" });

/**
 * A goal as the events and the snapshot carry it.
 *
 * @public
 */
export const GoalSchema = Type.Union(
	[
		Type.Object({ kind: Type.Union([Type.Literal("protect"), Type.Literal("exile"), Type.Literal("outrank")], { description: "A goal on another resident" }), target: Id }, { description: "A goal on a target" }),
		Type.Object({ kind: Type.Literal("lead", { description: "Lead a faction" }), count: Type.Integer({ description: "In how many tribunals" }) }, { description: "Lead factions" }),
		Type.Object({ kind: Type.Literal("heir", { description: "Inherit" }) }, { description: "Be left something by a last will" }),
	],
	{ description: "A secret goal" },
);

/**
 * The static shape of a goal.
 *
 * @public
 */
export type Goal = Static<typeof GoalSchema>;

/**
 * The events of `goals`, payloads in the old key order.
 *
 * @public
 */
export const GoalsEvents = defineEvents("goals", {
	goal_dealt: Type.Object({ act: Act, agent: Id, goal: GoalSchema, text: Type.String({ description: "The goal in the game's words" }) }, { description: "A resident was dealt its secret goal of an act" }),
	goal_resolved: Type.Object(
		{
			act: Act,
			agent: Id,
			goal: GoalSchema,
			fulfilled: Type.Boolean({ description: "Whether it held" }),
			void: Type.Optional(Type.Boolean({ description: "True when the holder was exiled before the act ended" })),
			bonus: Type.Integer({ description: "The points paid" }),
		},
		{ description: "A secret goal was settled: at the act's end, or void at its holder's exile" },
	),
});

const OfResident = Type.Object({ resident: Id }, { additionalProperties: false, description: "One resident" });

/**
 * The goals of a running act: the service `goals` (old `GoalsApi`).
 *
 * @public
 */
export const GoalsService = defineService({
	name: "goals",
	summary: "The secret goals of a running act.",
	methods: {
		goalOf: {
			kind: "query",
			summary: "The goal the resident holds in an act still running, in the game's words, or null (old `goalOf`).",
			input: OfResident,
			output: Type.Union(
				[
					Type.Object({ act: Act, kind: Type.String({ description: "The kind" }), target: Type.Optional(Id), text: Type.String({ description: "The goal in the game's words" }) }, { description: "The goal" }),
					Type.Null({ description: "No goal" }),
				],
				{ description: "The goal, or null" },
			),
		},
		noteLeaders: {
			kind: "command",
			summary: "Faction leaders of a tribunal: one more leadership each in every running act (old `noteLeaders`; the tribunal's leaders).",
			input: Type.Object({ leaders: Type.Array(Id, { description: "The leaders" }) }, { additionalProperties: false, description: "The leaders" }),
			output: Type.Null({ description: "Nothing" }),
		},
	},
});
