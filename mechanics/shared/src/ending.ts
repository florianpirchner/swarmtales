/**
 * The ending evaluator (step 18, docs/ideas/overseers-and-plugins.md §11 point 4): the end of a
 * story's main quest depends on what the run built up (flags, counters), not on one last decision.
 * The arena asks the provider once, when the run ends, and writes its answer into `run_end`. No
 * mechanic provides it yet; without a provider the arena writes `run_end` as the old engine did.
 */
import { Type } from "typebox";
import { defineApi } from "@swarmtales/kernel";
import { query } from "./method.ts";

/** The ending a run reached: a stable id for the report and the novel, and its title in the story's words. */
export const Ending = Type.Object({
	id: Type.String({ description: "Stable id of the ending, as the story declares it." }),
	title: Type.String({ description: "The ending's name in the story's words." }),
	summary: Type.Optional(Type.String({ description: "One or two sentences on why the run ended this way." })),
});

export const EndingApi = defineApi({
	name: "ending",
	summary: "The ending a run reached when it stops: what the report and the novel tell.",
	methods: {
		evaluate: query(
			"The ending of the run that ends now, or null when the story names none. `reason` is the arena's stop reason (null at the natural end of the minutes, as `run_end` leaves it out); asked once, after every other mechanic's end of the run.",
			Type.Object({ reason: Type.Union([Type.String(), Type.Null()]) }),
			Type.Union([Ending, Type.Null()]),
		),
	},
});
