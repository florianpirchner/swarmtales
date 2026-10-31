/**
 * The gamemaker's view of the tribunal (old `schedulingWindow`, `cityCall`, `atRisk`), a local API
 * of round 2 (docs/design/carve-requests-round2-T4a.md, request 3): facts cannot call the ledger or
 * the exile these read, so the view's builder asks the tribunal through this API.
 */
import { Type } from "typebox";
import { defineApi } from "@swarmtales/kernel";

const Resident = Type.String();

/** Old `SchedulingWindow`. */
export const SchedulingWindow = Type.Union([
	Type.Object({ open: Type.Literal(false), why: Type.String() }),
	Type.Object({
		open: Type.Literal(true),
		earliest: Type.Integer({ description: "Earliest opening minute." }),
		latestFinal: Type.Integer({ description: "Latest opening of a tribunal that exiles everything still missing." }),
		latestWithRoom: Type.Optional(Type.Integer({ description: "Latest opening that leaves room for one more tribunal after it." })),
		missing: Type.Integer({ description: "Residents still to exile: the most one tribunal may take." }),
		maxFactions: Type.Integer({ description: "Factions allowed: 2 up to this; 0 when the tribunal has no draft." }),
	}),
]);

export const TribunalViewApi = defineApi({
	name: "tribunal-view",
	summary: "The tribunal's guard rails and foresight for the gamemaker's view.",
	methods: {
		schedulingWindow: {
			kind: "query",
			summary: "Whether `scheduleTribunal` is open now, and its bounds (old `schedulingWindow`).",
			input: Type.Object({}),
			output: SchedulingWindow,
		},
		cityCall: {
			kind: "query",
			summary: "When the city calls a tribunal itself if nobody plans one, or null (old `cityCall`).",
			input: Type.Object({}),
			output: Type.Union([Type.Object({ calledAt: Type.Integer(), opens: Type.Integer() }), Type.Null()]),
		},
		stop: {
			kind: "query",
			summary:
				"What the run's stop rule reads (old arena `#stopReason`): the end reason once the target is reached and the last gate closed, whether a tribunal is under way, and whether the city still pursues its target.",
			input: Type.Object({}),
			output: Type.Object({ endReason: Type.Union([Type.String(), Type.Null()]), busy: Type.Boolean(), pursuing: Type.Boolean() }),
		},
		atRisk: {
			kind: "query",
			summary: "Who stands trial: the open session's accused, or those with the fewest points if the planned tribunal opened now, or null (old `atRisk`).",
			input: Type.Object({}),
			output: Type.Union([Type.Object({ opens: Type.Integer(), now: Type.Boolean(), accused: Type.Array(Resident) }), Type.Null()]),
		},
	},
});
