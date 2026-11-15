// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The contract of the mechanic `progression`: its events, the service it provides (`progression`, the level of a
 * resident for `marks`) and the service it asks of the pieces of a level (`level-pieces`, provided by `puzzles`).
 * The only file another mechanic imports.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { defineEvents, defineService } from "@swarmtales/sdk";

const Id = Type.String({ description: "A resident id, for example `A01`" });
const Level = Type.Integer({ minimum: 1, description: "A level number" });
const OfResident = Type.Object({ resident: Id }, { additionalProperties: false, description: "One resident" });
const OnLevel = Type.Object({ resident: Id, level: Level }, { additionalProperties: false, description: "One resident on one level" });

/**
 * The events of the progression, in the old field order.
 *
 * @public
 */
export const ProgressionEvents = defineEvents("progression", {
	submission: Type.Object(
		{
			agent: Id,
			level: Type.Integer({ description: "The level the code was submitted for" }),
			outcome: Type.String({ description: "`correct`, `incorrect`, `wrong_level`, `already_solved`, `invalid_format`, `rate_limited` or `door_closed`" }),
			deltaPoints: Type.Number({ description: "The reward, minus the penalty, or 0" }),
		},
		{ description: "A resident submitted a code, whatever the outcome; written after the reward, the level change and the notices" },
	),
	level_up: Type.Object(
		{ agent: Id, from: Type.Integer({ description: "The level passed" }), to: Type.Integer({ description: "The level entered next" }) },
		{ description: "A resident passed a level; at a shut door it is written at the pass, before the door opens" },
	),
	level_entered: Type.Object({ agent: Id, level: Type.Integer({ description: "The level entered" }) }, { description: "A resident entered a level, after `level_up` and the holder notices" }),
});

/**
 * What another mechanic reads of the levels: the service `progression`.
 *
 * @public
 */
export const ProgressionService = defineService({
	name: "progression",
	summary: "The level each resident stands on, and what it has passed.",
	methods: {
		levelOf: { kind: "query", summary: "The level the resident stands on (old `levelOf`); above the last level once it has finished.", input: OfResident, output: Type.Integer({ description: "The level" }) },
		isFinished: { kind: "query", summary: "Whether the resident has passed the last level (old `isFinished`).", input: OfResident, output: Type.Boolean({ description: "True once finished" }) },
		hasPassed: { kind: "query", summary: "Whether the resident is beyond the level or waits at its door (old `hasPassed`).", input: OnLevel, output: Type.Boolean({ description: "True once passed" }) },
	},
});

const Kind = Type.Union([Type.Literal("fragments"), Type.Literal("additive"), Type.Literal("none")], { description: "The puzzle of a level; `none` while it is not dealt" });
const Team = Type.Object(
	{ members: Type.Array(Id, { description: "The members, in team order" }), leader: Id },
	{ additionalProperties: false, description: "A team of a level (old `Team`)" },
);
const Values = Type.Object(
	{
		length: Type.String({ description: "The password length" }),
		overlap: Type.String({ description: "The characters shared at each seam" }),
		fragment: Type.String({ description: "The resident's fragment" }),
		digits: Type.String({ description: "The digits of an additive code" }),
		factors: Type.String({ description: "The factors of an additive level" }),
	},
	{ additionalProperties: false, description: "The placeholders of a task that a puzzle fills; empty strings on a level not dealt" },
);
const Holder = Type.Object(
	{
		holder: Id,
		piece: Type.Union([Type.Literal("counter-factor"), Type.Literal("team certificate")], { description: "What the holder holds" }),
		value: Type.String({ description: "Its value" }),
	},
	{ additionalProperties: false, description: "Who holds what the resident needs" },
);

/**
 * What `progression` asks of the pieces of a level (the old `PuzzlesApi` cut to what it read): the service
 * `level-pieces`, provided by `puzzles`. Only `progression` asks: `puzzles` reads where a resident stands from the
 * events of `progression`, so no service cycle forms (12-m5-spec.md, section 2.3).
 *
 * @public
 */
export const LevelPiecesService = defineService({
	name: "level-pieces",
	summary: "The code, the team and the task values of a resident on a level, and the deal of a level.",
	methods: {
		deal: { kind: "command", summary: "Deals a level once, when its door opens (old `deal`); a dealt level is left as it is.", input: Type.Object({ level: Level }, { additionalProperties: false, description: "One level" }), output: Type.Null({ description: "Nothing" }) },
		solutionOf: { kind: "query", summary: "The code that passes the level for the resident, or null (old `solutionOf`).", input: OnLevel, output: Type.Union([Type.String({ description: "The code" }), Type.Null({ description: "None" })], { description: "The code, or null" }) },
		kindOf: { kind: "query", summary: "The puzzle of a level (old `kindOf`).", input: Type.Object({ level: Level }, { additionalProperties: false, description: "One level" }), output: Kind },
		teamOf: { kind: "query", summary: "The resident's team on a level (old `teamOf`).", input: OnLevel, output: Team },
		taskValues: { kind: "query", summary: "The task placeholders a puzzle fills for the resident (old `taskValues`).", input: OnLevel, output: Values },
		holders: { kind: "query", summary: "Who holds what the resident needs on an additive level, besides itself (old `holders`).", input: OnLevel, output: Type.Array(Holder, { description: "The holders" }) },
	},
});
