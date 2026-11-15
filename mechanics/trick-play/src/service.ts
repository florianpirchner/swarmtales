// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { Type } from "typebox";
import { defineService } from "@swarmtales/sdk";
import { Phase, PlaySchema } from "./model.ts";

const None = Type.Object({});

/**
 * What other mechanics may read of the trick game (a strategy brain holds games through `brain-source`).
 *
 * @example
 * ```ts
 * const actor = ctx.call(TrickPlayService, "actor", {});
 * ```
 *
 * @public
 */
export const TrickPlayService = defineService({
	name: "trick-play",
	summary: "The trick game: the running game and round, the phase, who acts and the public table.",
	methods: {
		game: { kind: "query", summary: "The running (or last) game's number, from 1; 0 before the first game.", input: None, output: Type.Integer() },
		round: { kind: "query", summary: "The running (or last) round of the game, from 1.", input: None, output: Type.Integer() },
		phase: { kind: "query", summary: "idle (between rounds or games), bid, trump or play.", input: None, output: Phase },
		actor: { kind: "query", summary: "The seat that must act now, or null.", input: None, output: Type.Union([Type.String(), Type.Null()]) },
		table: {
			kind: "query",
			summary: "The public table: bids so far, the trump, the plays of the trick on the table and the tricks won this round.",
			input: None,
			output: Type.Object({
				bids: Type.Record(Type.String(), Type.Integer()),
				trump: Type.Union([Type.String(), Type.Null()]),
				trick: Type.Array(PlaySchema),
				won: Type.Record(Type.String(), Type.Integer()),
			}),
		},
	},
});
