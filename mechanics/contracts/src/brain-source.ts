// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { Type } from "typebox";
import { defineService } from "@swarmtales/sdk";

const None = Type.Object({});

/**
 * What a game other than the grid game provides so the strategy brain can hold its next game back
 * for a retro window. The grid game needs none of this: the brain reads it through `GridGameService`.
 *
 * @public
 */
export const BrainSourceService = defineService({
	name: "brain-source",
	summary: "A match of games the strategy brain can pause between games: the game's number, hold and release.",
	methods: {
		game: { kind: "query", summary: "The running (or last) game's number, from 1; 0 before the first game.", input: None, output: Type.Integer() },
		hold: { kind: "command", summary: "Holds the next game back until `release`. True when a game is still to come and is now held; false after the match's last game.", input: None, output: Type.Boolean() },
		release: { kind: "command", summary: "Lets a held game start. A no-op when nothing is held.", input: None, output: Type.Null() },
	},
});
