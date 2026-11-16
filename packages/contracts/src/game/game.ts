// SPDX-License-Identifier: LicenseRef-SUL-1.0
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

const PromptCity = Type.Object(
	{
		name: Type.String(text("The name of the closed city")),
		survivors: Type.Integer({ minimum: 0, description: "How many residents remain at the end" }),
		tools: Type.Union([Type.Literal("story", text("Only the tools of the city's doors")), Type.Literal("all", text("Every tool"))], text("Which tools the system prompt says a resident sees")),
		namesUntil: Type.Optional(Type.Integer({ minimum: 0, description: "With names: the tick before which a resident chooses its name; the header then names no id" })),
	},
	closed("The City world of a resident's system prompt; the neutral one when absent"),
);

const PromptPersona = Type.Object(
	{ temperament: Type.String(text("How it feels and reacts")), values: Type.String(text("What it holds dear")), voice: Type.String(text("How it speaks")) },
	closed("A persona as the system prompt shows it"),
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
 * The schema of one Director a game uses: the definition by id, its name in the game, its options, its model and
 * its limits.
 *
 * @remarks
 * Only `use` is needed. The Director's actor is `director:<as>` and its grant is `<as>`; `as` is the id when absent.
 *
 * @public
 */
export const DirectorUseSchema = Type.Object(
	{
		use: Type.String(text("The id of the Director definition")),
		as: Type.Optional(Type.String(text("The name in this game; the id when absent. The actor is `director:<as>`, the grant is `<as>`"))),
		options: Type.Optional(Type.Record(Type.String(text("The name of an option")), Type.Unknown(text("The value of the option")), text("The options of this use; the Director's own schema checks them"))),
		model: Type.Optional(ModelChoiceSchema),
		limits: Type.Optional(
			Type.Object(
				{
					maxCalls: Type.Optional(Type.Integer({ minimum: 0, description: "The most times the Director is asked in one run" })),
					maxCostUsd: Type.Optional(Type.Number({ minimum: 0, description: "The most money the Director's model calls may cost in one run, in US dollars" })),
				},
				closed("The limits of this Director; they replace those of its definition"),
			),
		),
	},
	closed("One Director the game uses"),
);

/**
 * One Director a game uses: what {@link DirectorUseSchema} accepts.
 *
 * @public
 */
export type DirectorUse = Static<typeof DirectorUseSchema>;

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
		directors: Type.Optional(Type.Array(DirectorUseSchema, text("The Directors of the game; without one, or with an empty list, the game plays as it does without the field"))),
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
		prompt: Type.Optional(
			Type.Object(
				{
					frame: Type.Optional(Type.String(text("The frame said first in the system prompt of every resident with a character: what it plays and how seriously"))),
					character: Type.Optional(
						Type.String(text("The key of the fact, `<plugin id>.<fact>`, whose value holds each resident's character by resident id (`motives.prose`), read once before the run starts")),
					),
					city: Type.Optional(PromptCity),
					persona: Type.Optional(
						Type.Union(
							[Type.String(text("The key of the fact whose value holds each resident's persona by resident id, read once before the run starts")), Type.Record(ResidentIdSchema, PromptPersona, text("A persona per resident"))],
							text("The persona block of a resident's system prompt, after the speech rule"),
						),
					),
					brief: Type.Optional(
						Type.Object(
							{
								text: Type.String(text("The text, last in the reader's system prompt")),
								reader: Type.String(text("The key of the fact whose value is the id of the resident who reads it, or null for none (`whispers.whisperer`), read once before the run starts")),
							},
							closed("A text only one resident reads (the whisperer's brief)"),
						),
					),
				},
				closed("What the game adds to a resident's system prompt"),
			),
		),
	},
	{ additionalProperties: false, description: "A game definition, version 1" },
);

/**
 * The data form of a game: what {@link GameDefinitionSchema} accepts.
 *
 * @public
 */
export type GameData = Static<typeof GameDefinitionSchema>;
