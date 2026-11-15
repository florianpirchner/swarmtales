// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The data of the goals mechanic, carried from the old `mechanics/goals/src/model.ts`: the options (the game's
 * `goals` spec), the kinds and the state per act, which is its own snapshot slice. New: `noteTools`, the tools of
 * the goal check of a Director's note.
 */
import { Type, type Static } from "typebox";
import { GoalSchema } from "./contract.ts";

const Id = Type.String({ description: "A resident id" });
const Int = Type.Integer({ description: "A count" });

/**
 * The kinds of goal, in the old order (the deal draws from it).
 *
 * @public
 */
export const GOAL_KINDS = ["protect", "exile", "outrank", "lead", "heir"] as const;

/**
 * A kind of goal.
 *
 * @public
 */
export type GoalKind = (typeof GOAL_KINDS)[number];

const Words = Type.Array(Type.String({ description: "A drive id" }), { description: "Drive ids whose holders get this kind of goal." });

/**
 * The options of `goals`: the old story's `goals` spec, `factions` from its tribunal, and the note tools.
 *
 * @public
 */
export const GoalsOptions = Type.Object(
	{
		acts: Type.Array(Type.Integer({ minimum: 1, description: "A level" }), { default: [], description: "The first level of each act that deals goals." }),
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
		noteTools: Type.Array(Type.String({ description: "The bare name of a tool" }), {
			default: ["notify", "boardNote"],
			description: "The tools of a Director's note whose `text` (or `reason`) is checked for a resident's secret goal (`PRIVATE_BLOCKED`); `notify` is read by its `agent`, the others by the board.",
		}),
	},
	{ description: "The options of `goals`" },
);

/**
 * The parsed options of `goals`.
 *
 * @public
 */
export type GoalsOptions = Static<typeof GoalsOptions>;

/**
 * The state and snapshot slice: one entry per act that dealt goals (old `GoalsSnapshot`, version 1).
 *
 * @public
 */
export const GoalsSlice = Type.Object(
	{
		acts: Type.Array(
			Type.Object(
				{
					act: Type.Integer({ description: "The first level of the act" }),
					goals: Type.Array(Type.Object({ agent: Id, goal: GoalSchema }, { description: "A goal dealt" }), { description: "The goals, in roster order" }),
					resolved: Type.Boolean({ description: "Whether the act is over" }),
					leads: Type.Array(Type.Object({ agent: Id, count: Int }, { description: "Leaderships" }), { description: "The faction leaderships in the act" }),
					heirs: Type.Array(Id, { description: "Who a last will left something" }),
					voided: Type.Array(Id, { description: "Whose goal is void" }),
				},
				{ description: "One act" },
			),
			{ description: "The acts" },
		),
	},
	{ description: "The goals per act" },
);

/**
 * The state of `goals`.
 *
 * @public
 */
export type GoalsState = Static<typeof GoalsSlice>;

/**
 * One act's entry of the state.
 *
 * @public
 */
export type ActGoals = GoalsState["acts"][number];
