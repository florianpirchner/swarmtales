// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Sample 4: sample 2's team tic-tac-toe with a Director placed in it, the coach, and its dial `direction` as a param
 * of the game, so `--set direction=0` and `--set direction=8` are two runs of one game. `channels` carries the
 * coach's notes; the residents keep the tools of sample 2.
 */
import { channels } from "@swarmtales/mechanic-channels";
import { consensus } from "@swarmtales/mechanic-consensus";
import { gridGame } from "@swarmtales/mechanic-grid";
import { teamChannel } from "@swarmtales/mechanic-team-channel";
import { defineGame, defineGameFamily } from "swarmtales";
import { Type } from "typebox";
import { coach } from "./src/coach.ts";

const teams = { X: ["A01", "A02"], O: ["A03", "A04"] };

const Params = Type.Object({ direction: Type.Integer({ minimum: 0, maximum: 10, default: 0, description: "The coach's dial." }) }, { description: "The variants of the coached game." });

export default defineGameFamily(Params, ({ direction }) =>
	defineGame({
		id: "coached-game",
		seed: 2,
		residents: 4,
		mechanics: [gridGame({ teams, games: 1, wakeTeam: true }), consensus({ teams }), teamChannel({ teams }), channels({ noteAuthor: "COACH", windowMinutes: 2 })],
		directors: [{ use: coach, options: { direction } }],
		grants: { resident: ["postTeam", "viewBoard", "playMove", "proposeMove", "castVote"], coach: ["notify"] },
		scheduler: { id: "turns", options: { activation: "onNews", afterBlocks: ["director"] } },
		end: { ticks: 30 },
		win: { fact: "grid.tally" },
		model: "anthropic/haiku",
	}),
);
