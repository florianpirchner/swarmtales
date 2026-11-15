// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The contract of the mechanic `progression`: its events, the service it provides (`progression`: the levels, the
 * acts, the doors, the ranking and the unlocks) and the services it asks of the pieces of a level (`level-pieces`,
 * provided by `puzzles`) and of the figures of the cast (`cast-extras`, provided by `cast`).
 * The only file another mechanic imports.
 *
 * @packageDocumentation
 */
import { Type, type TSchema } from "typebox";
import { defineEvents, defineService } from "@swarmtales/sdk";

const Id = Type.String({ description: "A resident id, for example `A01`" });
const Level = Type.Integer({ minimum: 1, description: "A level number" });
const OfResident = Type.Object({ resident: Id }, { additionalProperties: false, description: "One resident" });
const OnLevel = Type.Object({ resident: Id, level: Level }, { additionalProperties: false, description: "One resident on one level" });
const None = Type.Object({}, { additionalProperties: false, description: "No input" });
const OfLevel = Type.Object({ level: Level }, { additionalProperties: false, description: "One level" });
const OfAct = Type.Object({ fromLevel: Level }, { additionalProperties: false, description: "The act that starts at this level" });
const Points = Type.Integer({ description: "Points" });
const Done = Type.Boolean({ description: "True when the call changed something" });
const Nothing = Type.Null({ description: "Nothing" });
const OrNull = (schema: TSchema, what: string) => Type.Union([schema, Type.Null({ description: what })], { description: `A value, or null: ${what}` });
const Ranked = Type.Object({ agent: Id, rank: Type.Integer({ description: "From 1" }), points: Points, level: Type.Integer({ description: "Its level" }) }, { description: "One place in the ranking" });
const Behind = Type.Object({ holder: Id, level: Type.Integer({ description: "The holder's level" }), piece: Type.String({ description: "What it holds" }) }, { description: "A holder still behind" });
const TaskLine = Type.Object(
	{
		order: Type.Integer({ description: "Its place among the lines, lowest first (the old order: names 100, the holdout rule 200, the marks terms 300)" }),
		text: Type.String({ description: "The line" }),
		level: Type.Optional(Type.Integer({ minimum: 1, description: "The level it goes under; every level when left out" })),
	},
	{ additionalProperties: false, description: "A line another mechanic puts under the task of a door-open notice" },
);
const Bounds = Type.Object({ startLevel: Level, lastLevel: Type.Integer({ description: "The last playable level" }), survivors: Type.Integer({ description: "The seats at the end" }) }, { description: "The levels and the seats of the run" });

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
	act_started: Type.Object(
		{ fromLevel: Type.Integer({ minimum: 1, description: "The first level of the act" }), residents: Type.Array(Id, { description: "The residents still in the city" }) },
		{ description: "The first resident entered an act (or the run began its first); every earlier act ended before, and the penalty ladders restart" },
	),
	act_ended: Type.Object({ fromLevel: Type.Integer({ minimum: 1, description: "The first level of the act" }) }, { description: "An act is over: a later act began, a caller ended it, or the run ended" }),
	tools_unlocked: Type.Object({ agent: Id, tools: Type.Array(Type.String({ description: "A tool name" }), { description: "The tools opened" }) }, { description: "A caller opened tools for a resident beyond its level's set" }),
});

/**
 * What another mechanic reads of the levels: the service `progression`.
 *
 * @public
 */
export const ProgressionService = defineService({
	name: "progression",
	summary: "The levels, the acts, the doors, the ranking and the unlocks of the residents.",
	methods: {
		levelOf: { kind: "query", summary: "The level the resident stands on (old `levelOf`); above the last level once it has finished.", input: OfResident, output: Type.Integer({ description: "The level" }) },
		isFinished: { kind: "query", summary: "Whether the resident has passed the last level (old `isFinished`).", input: OfResident, output: Type.Boolean({ description: "True once finished" }) },
		hasPassed: { kind: "query", summary: "Whether the resident is beyond the level or waits at its door (old `hasPassed`).", input: OnLevel, output: Type.Boolean({ description: "True once passed" }) },
		hasSolved: { kind: "query", summary: "Whether the resident solved the level by a code of its own (old `hasSolved`).", input: OnLevel, output: Type.Boolean({ description: "True once solved" }) },
		passed: { kind: "query", summary: "Who passed the level: the solvers in the order they solved, then the others beyond it, in roster order.", input: OfLevel, output: Type.Array(Id, { description: "The residents" }) },
		lastProgress: { kind: "query", summary: "The tick of the resident's last solved level, or -1 (old `lastProgress`).", input: OfResident, output: Type.Integer({ description: "The tick" }) },
		currentAct: { kind: "query", summary: "The first level of the latest act that has begun.", input: None, output: Level },
		actStart: { kind: "query", summary: "The tick the act that starts at `fromLevel` began, or null.", input: OfAct, output: OrNull(Type.Integer({ description: "The tick" }), "Not begun") },
		door: { kind: "query", summary: "The level whose door is shut, or null.", input: None, output: OrNull(Level, "No door") },
		doorShut: { kind: "query", summary: "Whether a door holds residents back now.", input: None, output: Type.Boolean({ description: "True while shut" }) },
		openDoor: { kind: "command", summary: "Opens the shut door once every resident in the city has passed it (old `openDoor`).", input: None, output: Done },
		releaseDoor: { kind: "command", summary: "The shut door opens at the next tick whoever has passed it (an act's brake).", input: None, output: Nothing },
		unlock: { kind: "command", summary: "Opens tools for a resident beyond its level's set; writes `tools_unlocked` with the new ones.", input: Type.Object({ resident: Id, tools: Type.Array(Type.String({ description: "A tool name" }), { description: "The tools" }) }, { additionalProperties: false, description: "The resident and the tools" }), output: Nothing },
		ranking: { kind: "query", summary: "The ranking: the banished last, then by points, by level and by id.", input: None, output: Type.Array(Ranked, { description: "Best first" }) },
		holdersBehind: { kind: "query", summary: "Who holds what the resident needs on the level and stands on a lower one, not waiting at a door.", input: OnLevel, output: Type.Array(Behind, { description: "The holders" }) },
		nextPenalty: { kind: "query", summary: "What the resident's next wrong code costs in this act.", input: OfResident, output: Points },
		nextBlamePenalty: { kind: "query", summary: "What the resident's next lost blame costs in this act.", input: OfResident, output: Points },
		chargeBlame: { kind: "command", summary: "Counts a lost blame of the resident and answers its price; the caller books it.", input: OfResident, output: Points },
		endAct: { kind: "command", summary: "Ends the act that starts at `fromLevel`, once; writes `act_ended`.", input: OfAct, output: Done },
		isOpenOnClock: { kind: "query", summary: "Whether the level's door is open on the door clock now.", input: OfLevel, output: Type.Boolean({ description: "True while open" }) },
		opensAt: { kind: "query", summary: "The tick the level's door opens; 0 when it is open from the start.", input: OfLevel, output: Type.Integer({ description: "The tick" }) },
		bounds: { kind: "query", summary: "The start level, the last playable level and the seats at the end.", input: None, output: Bounds },
	},
});

/**
 * Where another mechanic puts its line under the task of a door-open notice: the service `task-lines`, provided by
 * `progression`. The old task asked three mechanics for a line under it (`withAddenda`); the door-open notice carries
 * the task as one text, and those mechanics ask `progression` (marks its levels, the holdout tribunal its acts), so
 * `progression` cannot ask them back. Each adds its line once, at the run's start, and the notice takes the lines in
 * their order (erratum J211). The task line of a turn does not read them: there each owner writes its own line (J31).
 *
 * @public
 */
export const TaskLinesService = defineService({
	name: "task-lines",
	summary: "The lines other mechanics put under the task of a door-open notice.",
	methods: {
		add: {
			kind: "command",
			summary: "Adds a line under the task of every door-open notice, at `order` among the others, on `level` or on every level; the same line twice counts once.",
			input: TaskLine,
			output: Nothing,
		},
	},
});

/**
 * What `progression` asks of the cast for `listAgents` (old `CastExtrasApi`): the figures shown with their public
 * level, provided by `cast`. `cast` reads when a level was first solved from `submission`, not from `progression`, so
 * no service cycle forms.
 *
 * @public
 */
export const CastExtrasService = defineService({
	name: "cast-extras",
	summary: "The active cast members and their public levels.",
	methods: {
		active: { kind: "query", summary: "Declared, revealed and not retired cast members in the game's order, with their public level.", input: None, output: Type.Array(Type.Object({ id: Id, level: Type.Integer({ description: "Its public level" }) }, { description: "One figure" }), { description: "The figures" }) },
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
