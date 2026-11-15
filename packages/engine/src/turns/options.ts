// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The options of the `turns` scheduler (specification of M1, section 4.1). */
import { Type, type Static } from "typebox";

/**
 * One entry of the `inputs` option: a `{ kind }` entry takes the lines of that kind, a `{ source }` entry the
 * lines of that plugin.
 *
 * @public
 */
export const InputEntrySchema = Type.Union(
	[
		Type.Object(
			{
				kind: Type.String({ description: "The kind of the lines this entry takes." }),
				join: Type.Optional(Type.String({ description: "When set, the lines of the kind become one line, joined with this text." })),
			},
			{ description: "The lines of one kind, sorted by their order." },
		),
		Type.Object({ source: Type.String({ description: "The id of the plugin whose lines this entry takes." }) }, { description: "The lines of one plugin that no kind entry takes, in hook order." }),
	],
	{ description: "One entry of the input order: the lines of a kind, or the lines of a plugin." },
);

/**
 * One entry of the `inputs` option.
 *
 * @public
 */
export type InputEntry = Static<typeof InputEntrySchema>;

/**
 * The options of the `turns` scheduler; every field has a default, except `afterBlocks`: a default would change
 * the options hash of every game that leaves it out.
 *
 * @public
 */
export const TurnsOptions = Type.Object(
	{
		passes: Type.Integer({ minimum: 1, default: 1, description: "Passes per tick; every actor gets at most one activation per pass." }),
		blockSize: Type.Integer({ minimum: 1, default: 1, description: "Actors per block: their inputs are built together and their drivers run at once." }),
		activation: Type.Union([Type.Literal("always"), Type.Literal("onNews"), Type.Literal("toAct")], { default: "always", description: "Who is woken in a pass: everyone who may act, those with news or a pending answer, or those a plugin names." }),
		order: Type.Union([Type.Literal("seeded"), Type.Literal("roster"), Type.Literal("arena")], { default: "seeded", description: "The order of a pass: a seeded shuffle, the definition's order, or the old arena's draw (every actor of the kinds shuffled with the labels order, tick + 1, pass, then who may not act left out)." }),
		kinds: Type.Array(Type.String({ description: "An actor kind." }), { default: ["resident"], description: "The actor kinds this scheduler activates." }),
		inputs: Type.Array(InputEntrySchema, { default: [], description: "The order in which an activation's input lines are shown." }),
		afterBlocks: Type.Optional(Type.Array(Type.String({ description: "An actor kind." }), { description: "Actor kinds that get an activation after tick start and after every block, when they have news" })),
	},
	{ description: "The options of the turns scheduler." },
);

/**
 * The parsed options of the `turns` scheduler.
 *
 * @public
 */
export type TurnsOptions = Static<typeof TurnsOptions>;
