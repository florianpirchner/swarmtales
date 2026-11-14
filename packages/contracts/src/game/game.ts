// SPDX-License-Identifier: Apache-2.0
/**
 * The game definition, version 1, in its data form: what a YAML or JSON file holds and what `game.hash` hashes.
 * A game is plain data; a TypeScript game returns the same data from a builder.
 */
import { Type, type Static } from "typebox";

const text = (description: string): { readonly description: string } => ({ description });

const closed = (description: string): { readonly additionalProperties: false; readonly description: string } => ({ additionalProperties: false, description });

/**
 * The schema of a resident id, as a game writes it (without the actor kind).
 *
 * @public
 */
export const ResidentIdSchema = Type.String({ pattern: "^[A-Za-z0-9_.-]+$", description: "The id of a resident" });

const toolName = (): ReturnType<typeof Type.String> => Type.String(text("A tool name"));

const GrantTweak = Type.Object(
	{
		drop: Type.Optional(Type.Array(toolName(), text("The tools taken out of the derived list"))),
		add: Type.Optional(Type.Array(toolName(), text("The tools appended to the derived list"))),
	},
	closed("A change of the tool list that is derived from the mechanics"),
);

const MechanicUse = Type.Object(
	{
		use: Type.String(text("The id of the mechanic")),
		options: Type.Optional(Type.Unknown(text("The options of this use; the mechanic's own schema checks them"))),
		as: Type.Optional(
			Type.Record(Type.String(text("A bare tool name of the mechanic")), Type.String(text("The name a model sees")), text("Bare tool name to model-facing name, for a clash of two mechanics")),
		),
	},
	closed("One mechanic the game uses"),
);

const members = (of: string) => Type.Array(ResidentIdSchema, text(`The residents of one ${of}`));

/**
 * The schema of a model choice: the model of the residents with its settings, where a plain id is not enough.
 *
 * @remarks
 * Only the id is needed. The runner fills what is left out: `thinking` is `medium` and `maxOutputTokens` is 4000.
 *
 * @public
 */
export const ModelChoiceSchema = Type.Object(
	{
		id: Type.String(text("The model, as `<provider>/<model id or alias>`, for example `anthropic/haiku`")),
		thinking: Type.Optional(
			Type.Union([Type.Literal("off"), Type.Literal("minimal"), Type.Literal("low"), Type.Literal("medium"), Type.Literal("high")], text("How much the model thinks before it answers; `medium` when absent")),
		),
		maxOutputTokens: Type.Optional(Type.Integer({ minimum: 1, description: "The limit of output tokens of one request; 4000 when absent" })),
	},
	closed("A model with its settings"),
);

/**
 * A model with its settings: what {@link ModelChoiceSchema} accepts.
 *
 * @public
 */
export type ModelChoice = Static<typeof ModelChoiceSchema>;

/**
 * The schema of a game definition, version 1.
 *
 * @remarks
 * Adding an optional field does not raise the version. There is no `kind` field, and an unknown field is refused.
 *
 * @public
 */
export const GameDefinitionSchema = Type.Object(
	{
		schema: Type.Literal(1, text("The version of the game definition format")),
		id: Type.String({ pattern: "^[a-z][a-z0-9-]*$", description: "The id of the game" }),
		title: Type.Optional(Type.String(text("The title shown to people"))),
		seed: Type.Optional(Type.Integer({ minimum: 0, maximum: 4294967295, description: "The seed of everything random, a 32-bit number (a larger one would play as its remainder); 1 when absent, and `--seed` wins" })),
		residents: Type.Union([Type.Integer({ minimum: 1, description: "A count; it gives the ids A01, A02, ..." }), Type.Array(ResidentIdSchema, { minItems: 1, description: "The ids of the residents" })], text("The residents that play")),
		teams: Type.Optional(Type.Record(Type.String(text("The name of a team")), members("team"), text("The teams, by name"))),
		roles: Type.Optional(Type.Record(Type.String(text("The name of a role")), members("role"), text("The roles, by name"))),
		mechanics: Type.Array(MechanicUse, text("The mechanics of the game, in the order they are listed")),
		directors: Type.Optional(Type.Array(Type.Unknown(text("A Director")), { maxItems: 0, description: "Reserved: it must be empty in this version" })),
		grants: Type.Optional(
			Type.Record(
				Type.String(text("A grant name")),
				Type.Union([Type.Array(toolName(), text("A list that replaces the derived one and sets the order a model sees")), GrantTweak], text("The tools of one grant name")),
				text("The tools each grant name gives; a grant name that is absent gets every tool that names it"),
			),
		),
		locked: Type.Optional(Type.Array(toolName(), text("The tools every resident starts with locked"))),
		scheduler: Type.Optional(
			Type.Object(
				{ id: Type.String(text("The id of the scheduler")), options: Type.Optional(Type.Unknown(text("The options; the scheduler's own schema checks them"))) },
				closed("The scheduler of the run; `turns` when absent"),
			),
		),
		limits: Type.Optional(
			Type.Object({ maxCallsPerTick: Type.Optional(Type.Integer({ minimum: 1, description: "The most tool calls one actor makes in one tick" })) }, closed("The limits of the run")),
		),
		end: Type.Object({ ticks: Type.Integer({ minimum: 1, description: "The length of the run in ticks" }) }, closed("When the run ends")),
		win: Type.Optional(Type.Object({ fact: Type.String(text("The key of the fact, `<plugin id>.<fact>`")) }, closed("The fact whose value is the result line of the run"))),
		briefing: Type.Optional(
			Type.Union(
				[Type.String(text("One briefing for every resident")), Type.Record(ResidentIdSchema, Type.String(text("The briefing of this resident")), closed("A briefing per resident"))],
				text("What a resident reads before the run starts"),
			),
		),
		model: Type.Optional(Type.Union([Type.String(text("The id alone, as `<provider>/<model id or alias>`; the settings take their defaults")), ModelChoiceSchema], text("The model the residents run on"))),
	},
	{ additionalProperties: false, description: "A game definition, version 1" },
);

/**
 * The data form of a game: what {@link GameDefinitionSchema} accepts.
 *
 * @public
 */
export type GameData = Static<typeof GameDefinitionSchema>;
