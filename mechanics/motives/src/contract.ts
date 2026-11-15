// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The contract of the mechanic `motives`: its event `motive_dealt` and the service `motives`, through which another
 * game mechanic (`goals`) reads the drives of a resident's core motive (old `MotivesApi` of `mechanics/shared`). The
 * only file another mechanic imports besides `/rules`.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { defineEvents, defineService } from "@swarmtales/sdk";

/**
 * A level of a temperament axis.
 *
 * @public
 */
export const Level = Type.Union([Type.Literal("low"), Type.Literal("middle"), Type.Literal("high")], { description: "A level of a temperament axis." });

/**
 * How strongly a drive drives.
 *
 * @public
 */
export const Intensity = Type.Union([Type.Literal("aboveAll"), Type.Literal("clearly"), Type.Literal("atTimes")], { description: "How strongly a drive drives." });

/**
 * One temperament axis of a core motive, with its level.
 *
 * @public
 */
export const MotiveTrait = Type.Object({ axis: Type.String({ description: "The axis id, e.g. openness." }), level: Level }, { description: "A level on one axis." });

/**
 * One drive of a core motive, with its intensity.
 *
 * @public
 */
export const MotiveDrive = Type.Object({ drive: Type.String({ description: "The drive id, e.g. pride." }), intensity: Intensity }, { description: "A drive and how strongly it drives." });

/**
 * The events of `motives`, payloads in the old key order.
 *
 * @public
 */
export const MotivesEvents = defineEvents("motives", {
	motive_dealt: Type.Object(
		{
			agent: Type.String({ description: "The resident." }),
			bigFive: Type.Array(MotiveTrait, { description: "Its level per axis." }),
			drives: Type.Array(MotiveDrive, { description: "Its drives, above all first." }),
			figure: Type.Optional(Type.String({ description: "The figure it plays, when it plays one." })),
		},
		{ description: "A resident was dealt its core motive, once, at the start of a run" },
	),
});

const OfResident = Type.Object({ resident: Type.String({ description: "A resident id, for example `A03`" }) }, { additionalProperties: false, description: "One resident" });

/**
 * The core motive of each resident: the service `motives` (old `MotivesApi`).
 *
 * @public
 */
export const MotivesService = defineService({
	name: "motives",
	summary: "The core motive of each resident.",
	methods: {
		drivesOf: {
			kind: "query",
			summary: "The drive ids of the resident's core motive, the strongest first, or null without a core motive (the goals deal follows them).",
			input: OfResident,
			output: Type.Union([Type.Array(Type.String({ description: "A drive id" }), { description: "The drive ids" }), Type.Null({ description: "No core motive" })], { description: "The drives, or null" }),
		},
		cuesOf: {
			kind: "query",
			summary: "The lower-case cue words of the resident's drives (the gamemaker's `characterLeaks` check).",
			input: OfResident,
			output: Type.Array(Type.String({ description: "A cue word" }), { description: "The cue words" }),
		},
	},
});
