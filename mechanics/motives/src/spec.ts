/**
 * The story's catalog of core motives (v09) as the mechanic's options: the same fields as the
 * old `CoreMotivesSpec` (packages/contracts/src/story.ts), checked with Typebox since they come from a
 * story file. Every property carries a description (the options are documented).
 */
import { Type, type Static } from "typebox";

export const CORE_MOTIVE_LEVELS = ["low", "middle", "high"] as const;

const Level = Type.Union([Type.Literal("low"), Type.Literal("middle"), Type.Literal("high")], { description: "A level of a temperament axis." });
const Intensity = Type.Union([Type.Literal("aboveAll"), Type.Literal("clearly"), Type.Literal("atTimes")], { description: "How strongly a drive drives." });
const Tone = Type.Union([Type.Literal("light"), Type.Literal("dark")], { description: "Whether the drive or figure is a light or a dark one." });

const Axis = Type.Object({
	id: Type.String({ description: "The axis id, e.g. openness." }),
	texts: Type.Object(
		{
			low: Type.String({ description: "The sentence for a low level, said in the second person." }),
			middle: Type.String({ description: "The sentence for a middle level; may be empty." }),
			high: Type.String({ description: "The sentence for a high level." }),
		},
		{ description: "A sentence per level." },
	),
});

const Drive = Type.Object({
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
	cues: Type.Array(Type.String(), { description: "The words that would give the drive away." }),
});

const Figure = Type.Object({
	id: Type.String({ description: "The figure id." }),
	title: Type.String({ description: "The figure's title." }),
	profession: Type.String({ description: "The persona the figure plays." }),
	tone: Tone,
	bigFive: Type.Array(Type.Object({ axis: Type.String(), level: Level }), { description: "The figure's level per axis." }),
	drives: Type.Array(Type.Object({ drive: Type.String(), intensity: Intensity }), { description: "The figure's drives." }),
	text: Type.String({ description: "The text that replaces the core motive's sentences in the system prompt." }),
	direction: Type.Optional(Type.Unknown({ description: "What the direction dial adds; read by the persona, not by the deal." })),
});

const CoreMotiveTraitSpec = Type.Object({ axis: Type.String(), level: Level });
const CoreMotiveDriveSpec = Type.Object({ drive: Type.String(), intensity: Intensity });

/** The options of the motives mechanic: the old `CoreMotivesSpec` plus the figures the run names. */
export const CoreMotivesOptions = Type.Object({
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
	cast: Type.Optional(Type.Array(Type.String(), { description: "The figures the run names, at most one per resident; without it a seeded pick plays." })),
	whispererCoreMotive: Type.Optional(Type.Object({ bigFive: Type.Array(CoreMotiveTraitSpec, { description: "The whisperer's level per axis." }), drives: Type.Array(CoreMotiveDriveSpec, { description: "The whisperer's drives." }), figure: Type.Optional(Type.String({ description: "The id of the figure the whisperer plays, when it plays one." })) }, { description: "The character the story gives its whisperer (the story's `whisperer.coreMotive`) instead of the drawn one." })),
});
export type CoreMotivesOptions = Static<typeof CoreMotivesOptions>;

export const CoreMotiveTrait = Type.Object({ axis: Type.String(), level: Level });
export const CoreMotiveDrive = Type.Object({ drive: Type.String(), intensity: Intensity });

/** A resident's core motive as events and the snapshot slice keep it. */
export const CoreMotiveRecord = Type.Object({
	agent: Type.String(),
	bigFive: Type.Array(CoreMotiveTrait),
	drives: Type.Array(CoreMotiveDrive),
	figure: Type.Optional(Type.String()),
});
export type CoreMotiveRecord = Static<typeof CoreMotiveRecord>;
