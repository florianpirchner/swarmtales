// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * What a base mechanic (`channels`) asks to hand a resident's direct message to a figure the game plays without a
 * model, a cast member such as STEWARD (old `CastApi.isActive`, `receive` and `collected`, the old `#dmToCast`). The
 * mechanic `cast` provides it. When no provider is loaded, the caller's `tryCall` comes back empty and the target is
 * no figure: the message goes to a resident or is refused as before (decision A72, erratum J117 of `12-m5-spec.md`).
 * It lives here, not in the contract of `cast`, because `cast` requires `channels`: an import of `cast` by
 * `channels` would close a cycle of packages.
 */
import { Type } from "typebox";
import { defineService } from "@swarmtales/sdk";

const from = Type.String({ description: "The resident that wrote the message" });
const cast = Type.String({ description: "The id of the figure, for example `STEWARD`" });
const collections = Type.Array(Type.String({ description: "The name of a collection" }), { description: "Names of collections" });

/**
 * The figures a resident may write to: the service `figures`.
 *
 * @public
 */
export const FiguresService = defineService({
	name: "figures",
	summary: "The figures of a game that a resident may write to, and what becomes of a direct message to one of them.",
	methods: {
		isActive: {
			kind: "query",
			summary: "Whether a resident may write to this figure now: it exists, is not hidden and not retired (old `cast.isActive`).",
			input: Type.Object({ cast }, { additionalProperties: false, description: "The figure" }),
			output: Type.Boolean({ description: "True when a message to it is handed in" }),
		},
		receive: {
			kind: "command",
			summary: "A resident's direct message to a figure, after the checks of the router: collected while a collection runs; writes `cast_dm` with the number the router took.",
			input: Type.Object(
				{ from, cast, text: Type.String({ description: "The text, trimmed" }), number: Type.Integer({ description: "The city's message number" }) },
				{ additionalProperties: false, description: "The message" },
			),
			output: Type.Object({ collections, newSender: collections }, { additionalProperties: false, description: "Where it was collected, and where its sender is new" }),
		},
		collected: {
			kind: "command",
			summary: "The message's marks were spent: `from` is a new sender in `into` (the `newSender` of `receive`); writes `cast_collected`.",
			input: Type.Object({ from, cast, into: collections }, { additionalProperties: false, description: "The sender and the collections" }),
			output: Type.Null({ description: "Nothing" }),
		},
	},
});
