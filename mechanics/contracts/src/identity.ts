// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * What a base mechanic (`channels`, `ledger`, `exile`) asks so that its texts show the name a resident chose in place
 * of its id, and take a name where an id goes. The mechanic `names` provides it. When no provider is loaded, the
 * caller's `tryCall` comes back empty and the caller keeps the id: a resident is shown by its id (12-m5-spec.md,
 * section 2.2, pattern 4). Ids stay the keys of events and snapshots.
 */
import { Type } from "typebox";
import { defineService } from "@swarmtales/sdk";

const resident = Type.Object({ resident: Type.String({ description: "A resident id, for example `A03`" }) }, { additionalProperties: false, description: "One resident" });
const text = Type.Object({ text: Type.String({ description: "A text a resident will read, or a value a resident wrote where an id goes" }) }, { additionalProperties: false, description: "One text" });

/**
 * The display names of residents: the service `identity`.
 *
 * @public
 */
export const IdentityService = defineService({
	name: "identity",
	summary: "The names residents chose, for the texts a resident reads and the arguments a resident writes.",
	methods: {
		nameOf: {
			kind: "query",
			summary: "The name the resident chose (or was given), or null while it has none; the caller then shows the id (old `nameOf` of `names`).",
			input: resident,
			output: Type.Union([Type.String({ description: "The name" }), Type.Null({ description: "No name yet" })], { description: "The name, or null" }),
		},
		display: {
			kind: "query",
			summary: "The text with each resident id replaced by that resident's name, as the residents read it; the text unchanged while nobody has a name (old `presentation.display` of `names`).",
			input: text,
			output: Type.String({ description: "The text as a resident reads it" }),
		},
		resolve: {
			kind: "query",
			summary: "The resident id that a name or an id stands for; any other text comes back unchanged (old `resolve` of `names`).",
			input: text,
			output: Type.String({ description: "The id, or the text unchanged" }),
		},
	},
});
