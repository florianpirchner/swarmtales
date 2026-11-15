// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The game's catalogue of core motives (v09) as the mechanic's options, carried from the old `mechanics/motives/src/spec.ts`:
 * the same fields as the old `CoreMotivesSpec`, checked with Typebox since they come from a game's data. Every
 * property carries a description (the options are documented). New: `noteTools`, the tools of the note check.
 */
import { Type, type Static } from "typebox";
import { MotiveDrive, MotiveTrait, Intensity, Level } from "./contract.ts";

/**
 * The levels of an axis, in the order the deal draws among them.
 *
 * @public
 */
export const MOTIVE_LEVELS = ["low", "middle", "high"] as const;

const Tone = Type.Union([Type.Literal("light"), Type.Literal("dark")], { description: "Whether the drive or figure is a light or a dark one." });

const Axis = Type.Object(
	{
		id: Type.String({ description: "The axis id, e.g. openness." }),
		texts: Type.Object(
			{
				low: Type.String({ description: "The sentence for a low level, said in the second person." }),
				middle: Type.String({ description: "The sentence for a middle level; may be empty." }),
				high: Type.String({ description: "The sentence for a high level." }),
			},
			{ description: "A sentence per level." },
		),
	},
	{ description: "A temperament axis." },
);

const Drive = Type.Object(
	{
		id: Type.String({ description: "The drive id, e.g. pride." }),
		group: Type.String({ description: "The group the drive belongs to." }),
		tone: Tone,
		texts: Type.Object(
			{
				aboveAll: Type.String({ description: "The sentence when this drive is above all." }),
				clearly: Type.String({ description: "The sentence when this drive clearly drives." }),
				atTimes: Type.String({ description: "The sentence when this drive drives at times." }),
			},
			{ description: "A sentence per intensity." },
		),
		cues: Type.Array(Type.String({ description: "A cue word." }), { description: "The words that would give the drive away." }),
	},
	{ description: "A drive or shadow." },
);

const Figure = Type.Object(
	{
		id: Type.String({ description: "The figure id." }),
		title: Type.String({ description: "The figure's title." }),
		profession: Type.String({ description: "The persona the figure plays." }),
		tone: Tone,
		bigFive: Type.Array(Type.Object({ axis: Type.String({ description: "The axis id." }), level: Level }, { description: "A level on one axis." }), { description: "The figure's level per axis." }),
		drives: Type.Array(Type.Object({ drive: Type.String({ description: "The drive id." }), intensity: Intensity }, { description: "A drive." }), { description: "The figure's drives." }),
		text: Type.String({ description: "The text that replaces the core motive's sentences in the system prompt." }),
		direction: Type.Optional(Type.Unknown({ description: "What the direction dial adds; read by the persona, not by the deal." })),
	},
	{ description: "A finished figure." },
);

/**
 * The options of the motives mechanic: the old `CoreMotivesSpec` plus the figures the run names, and the note tools.
 *
 * @public
 */
export const MotivesOptions = Type.Object(
	{
		heading: Type.String({ description: "The heading the core motive is written under in the system prompt." }),
		axes: Type.Array(Axis, { description: "The temperament axes (the Big Five), one level each per resident." }),
		drives: Type.Array(Drive, { description: "The catalog of drives and shadows." }),
		perResident: Type.Object(
			{
				min: Type.Integer({ minimum: 1, description: "The fewest drives a resident gets." }),
				max: Type.Integer({ minimum: 1, description: "The most drives a resident gets." }),
			},
			{ description: "How many drives a resident gets." },
		),
		lightShare: Type.Number({ minimum: 0, maximum: 1, description: "The share of residents (rounded) with a light drive above all." }),
		spreadPer: Type.Integer({ minimum: 1, description: "No drive is above all for more than one resident in this many (rounded up)." }),
		figures: Type.Optional(Type.Array(Figure, { description: "Finished figures of the story's cast; residents get a figure instead of a drawn core motive." })),
		frame: Type.Optional(Type.String({ description: "A frame said to every resident with a core motive, at the top of its system prompt." })),
		cast: Type.Optional(Type.Array(Type.String({ description: "A figure id." }), { description: "The figures the run names, at most one per resident; without it a seeded pick plays." })),
		whispererCoreMotive: Type.Optional(
			Type.Object(
				{
					bigFive: Type.Array(MotiveTrait, { description: "The whisperer's level per axis." }),
					drives: Type.Array(MotiveDrive, { description: "The whisperer's drives." }),
					figure: Type.Optional(Type.String({ description: "The id of the figure the whisperer plays, when it plays one." })),
				},
				{ description: "The character the story gives its whisperer (the story's `whisperer.coreMotive`) instead of the drawn one." },
			),
		),
		whisperer: Type.Optional(
			Type.Object(
				{ agent: Type.Optional(Type.String({ description: "The resident the game names as its whisperer (the whispers' `whisperer.agent`)." })) },
				{ description: "The game's whisperer plays (the whispers' `whisperer`, in a run that is no control run): the resident it names, else the seeded pick of `pickWhisperer` of the whispers' `/rules`. Without it nobody plays `whispererCoreMotive`." },
			),
		),
		noteTools: Type.Array(Type.String({ description: "The bare name of a tool" }), {
			default: ["notify", "boardNote"],
			description: "The tools of a Director's note whose `text` (or `reason`) is checked for a resident's core motive (`PRIVATE_BLOCKED`); `notify` is read by its `agent`, the others by the board.",
		}),
	},
	{ description: "The options of the core motives" },
);

/**
 * The options as the game configures them.
 *
 * @public
 */
export type MotivesOptions = Static<typeof MotivesOptions>;

/**
 * A resident's core motive as events and the snapshot slice keep it.
 *
 * @public
 */
export const MotiveRecord = Type.Object(
	{
		agent: Type.String({ description: "The resident." }),
		bigFive: Type.Array(MotiveTrait, { description: "Its level per axis." }),
		drives: Type.Array(MotiveDrive, { description: "Its drives, above all first." }),
		figure: Type.Optional(Type.String({ description: "The figure it plays, when it plays one." })),
	},
	{ description: "One resident's core motive" },
);

/**
 * A resident's core motive with its id.
 *
 * @public
 */
export type MotiveRecord = Static<typeof MotiveRecord>;
