// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The contract of the mechanic `marks`: its event and its service, declared apart from the mechanic, so another
 * mechanic (the `tribunal`) listens and calls without a value import of `marks` itself.
 */
import { defineEvents, defineService } from "@swarmtales/sdk";
import { Type } from "typebox";

/**
 * The events of `marks`: a listener writes `kit.listen(MarksEvents, "marked", ...)`.
 *
 * @public
 */
export const MarksEvents = defineEvents("marks", {
	marked: Type.Object(
		{ by: Type.String({ description: "The resident that marked." }), name: Type.String({ description: "The resident that was marked." }) },
		{ additionalProperties: false, description: "A resident marked another one as a suspect." },
	),
});

/**
 * The service of `marks`: how many marks stand against a resident.
 *
 * @public
 */
export const MarksService = defineService({
	name: "marks",
	summary: "Says how many marks stand against a resident.",
	methods: {
		against: {
			kind: "query",
			summary: "The number of marks against the resident.",
			input: Type.Object({ resident: Type.String({ description: "A resident id." }) }, { additionalProperties: false, description: "The resident that is asked about." }),
			output: Type.Integer({ minimum: 0, description: "The marks against it; 0 for an id that is no resident." }),
		},
	},
});
