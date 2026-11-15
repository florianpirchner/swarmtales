// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The contract of the mechanic `puzzles`: what other game mechanics may ask of the deal (the service `deal`), and
 * its events. `puzzles` also provides `level-pieces`, which `progression` declares in its own contract. The only file
 * another mechanic imports.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { defineService } from "@swarmtales/sdk";

export { PuzzlesEvents } from "./model.ts";

const Text = Type.String({ description: "A text a resident wrote" });
const Yes = (description: string) => Type.Boolean({ description });

/**
 * What another game mechanic asks of the deal: the service `deal` (the old `PuzzlesApi`, cut to what `names`,
 * `receipts` and `whispers` read).
 *
 * @public
 */
export const PuzzlesService = defineService({
	name: "deal",
	summary: "Whether a token is part of a password, whether a text carries a secret, and whether a direct message is a hand-over.",
	methods: {
		passwordPiece: {
			kind: "query",
			summary: "Whether the token is part of a dealt password, so that it stays as written (old `passwordPiece`, asked by `names`).",
			input: Type.Object({ token: Type.String({ description: "A token of a text" }) }, { additionalProperties: false, description: "One token" }),
			output: Yes("True for a part of a dealt password"),
		},
		carriesSecret: {
			kind: "query",
			summary: "Whether the text quotes `minRun` or more characters in a row of a fragment of a guarded level (old `carriesSecret`, asked by `receipts`).",
			input: Type.Object(
				{ resident: Type.String({ description: "Who would show the text" }), text: Text, minRun: Type.Integer({ minimum: 1, description: "The shortest run that counts" }) },
				{ additionalProperties: false, description: "The text and the run" },
			),
			output: Yes("True when the text carries a fragment"),
		},
		isHandover: {
			kind: "query",
			summary: "Whether the text carries a fragment of a dealt level, or three characters in a row of one: a hand-over, not a whisper (old `isHandover`, asked by `whispers`).",
			input: Type.Object({ text: Text }, { additionalProperties: false, description: "One text" }),
			output: Yes("True for a hand-over"),
		},
	},
});
