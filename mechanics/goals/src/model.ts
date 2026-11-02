/**
 * The data of the goals mechanic: options (the story's `goals` spec), events, the state per act and
 * the snapshot slice (version 1; the converter's version 0 has the same fields, the old `GoalsSnapshot`).
 */
import { Type, type Static } from "typebox";

const Id = Type.String();
const Int = Type.Integer();

export const GOAL_KINDS = ["protect", "exile", "outrank", "lead", "heir"] as const;
export type GoalKind = (typeof GOAL_KINDS)[number];

/** A goal as the events and the slice carry it. */
export const GoalSchema = Type.Union([
	Type.Object({ kind: Type.Union([Type.Literal("protect"), Type.Literal("exile"), Type.Literal("outrank")]), target: Id }),
	Type.Object({ kind: Type.Literal("lead"), count: Int }),
	Type.Object({ kind: Type.Literal("heir") }),
]);
export type Goal = Static<typeof GoalSchema>;

const Words = Type.Array(Type.String(), { description: "Drive ids whose holders get this kind of goal." });

export const GoalsOptions = Type.Object({
	acts: Type.Array(Type.Integer({ minimum: 1 }), { default: [], description: "The first level of each act that deals goals." }),
	bonus: Type.Integer({ minimum: 0, default: 0, description: "Points a fulfilled goal pays at the act's end." }),
	leadTribunals: Type.Integer({ minimum: 1, default: 1, description: "How many tribunals a `lead` goal asks the holder to lead a faction in." }),
	againstCoreMotive: Type.Number({ minimum: 0, maximum: 1, default: 0, description: "The share of residents whose goal does not follow their core motive." }),
	matches: Type.Object(
		{ protect: Type.Optional(Words), exile: Type.Optional(Words), outrank: Type.Optional(Words), lead: Type.Optional(Words), heir: Type.Optional(Words) },
		{ default: {}, description: "The drive ids that suggest each kind of goal." },
	),
	factions: Type.Boolean({ default: false, description: "Whether the city holds faction drafts: `lead` goals need them." }),
	texts: Type.Object(
		{
			protect: Type.String({ description: "The goal `protect`; {target}." }),
			exile: Type.String({ description: "The goal `exile`; {target}." }),
			outrank: Type.String({ description: "The goal `outrank`; {target}." }),
			lead: Type.String({ description: "The goal `lead`; {count}." }),
			heir: Type.String({ description: "The goal `heir`." }),
			notice: Type.String({ description: "Private notice when a goal is dealt; {goal}, {bonus}." }),
			status: Type.String({ description: "Status line part while the act runs; {goal}, {bonus}." }),
			fulfilled: Type.String({ description: "Private notice when a goal is fulfilled; {goal}, {bonus}." }),
			missed: Type.String({ description: "Private notice when it is not; {goal}." }),
			exiledReadout: Type.String({ description: "Board post when an exiled resident leaves; {resident}, {goal}." }),
			readout: Type.String({ description: "Board post at the act's end; {list}." }),
		},
		{ description: "The story's words." },
	),
});

export const GOALS_EVENTS = {
	goal_dealt: Type.Object({ act: Int, agent: Id, goal: GoalSchema, text: Type.String() }),
	goal_resolved: Type.Object({ act: Int, agent: Id, goal: GoalSchema, fulfilled: Type.Boolean(), void: Type.Optional(Type.Boolean()), bonus: Int }),
} as const;

export interface ActGoals {
	readonly goals: Map<string, Goal>;
	resolved: boolean;
	readonly leads: Map<string, number>;
	readonly heirs: Set<string>;
	readonly voided: Set<string>;
}

export interface GoalsState {
	readonly acts: Map<number, ActGoals>;
}

export function freshGoals(): GoalsState {
	return { acts: new Map() };
}

export const GoalsSlice = Type.Object({
	acts: Type.Array(
		Type.Object({
			act: Int,
			goals: Type.Array(Type.Object({ agent: Id, goal: GoalSchema })),
			resolved: Type.Boolean(),
			leads: Type.Array(Type.Object({ agent: Id, count: Int })),
			heirs: Type.Array(Id),
			voided: Type.Array(Id),
		}),
	),
});
type GoalsSliceData = Static<typeof GoalsSlice>;

/** The converter's version-0 slice: the old `GoalsSnapshot` under the mechanic's key. */
export const GoalsSliceV0 = Type.Object({ goals: GoalsSlice });

export function saveGoals(state: GoalsState): GoalsSliceData {
	return {
		acts: [...state.acts].map(([act, entry]) => ({
			act,
			goals: [...entry.goals].map(([agent, goal]) => ({ agent, goal: copyGoal(goal) })),
			resolved: entry.resolved,
			leads: [...entry.leads].map(([agent, count]) => ({ agent, count })),
			heirs: [...entry.heirs],
			voided: [...entry.voided],
		})),
	};
}

export function loadGoals(data: GoalsSliceData): GoalsState {
	return {
		acts: new Map(
			data.acts.map((entry): [number, ActGoals] => [
				entry.act,
				{
					goals: new Map(entry.goals.map((held) => [held.agent, copyGoal(held.goal)])),
					resolved: entry.resolved,
					leads: new Map(entry.leads.map((lead) => [lead.agent, lead.count])),
					heirs: new Set(entry.heirs),
					voided: new Set(entry.voided),
				},
			]),
		),
	};
}

function copyGoal(goal: Goal): Goal {
	switch (goal.kind) {
		case "protect":
		case "exile":
		case "outrank":
			return { kind: goal.kind, target: goal.target };
		case "lead":
			return { kind: "lead", count: goal.count };
		case "heir":
			return { kind: "heir" };
	}
}
