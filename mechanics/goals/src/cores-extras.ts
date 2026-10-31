/**
 * `cores-extras`: what the goals need from the cores (docs/design/carve-requests-T3.md, request 12).
 * The cores mechanic (team T2) provides it with the same definition; the goals only read it, and deal
 * at random while no core provides it.
 */
import { Type } from "typebox";
import { defineApi } from "@swarmtales/kernel";

export const CoresExtrasApi = defineApi({
	name: "cores-extras",
	summary: "The drives of a resident's core, for the goals dealt to it.",
	methods: {
		drivesOf: {
			kind: "query",
			summary: "The drive ids of the resident's core, the strongest first (old `core.drives`); null without a core.",
			input: Type.Object({ resident: Type.String() }),
			output: Type.Union([Type.Array(Type.String()), Type.Null()]),
		},
	},
});
