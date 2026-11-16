// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Sample 2: team tic-tac-toe. Four residents in two teams share the board of `grid`; each team talks in its own
 * `team-channel`, and `consensus` lets the captain play only the cell the team voted for. The game is a family: its
 * param `games` is what `--set games=2` changes. `game.yaml` is the same game in its data form.
 */
import { consensus } from "@swarmtales/mechanic-consensus";
import { gridGame } from "@swarmtales/mechanic-grid";
import { teamChannel } from "@swarmtales/mechanic-team-channel";
import { defineGame, defineGameFamily } from "swarmtales";
import { Type } from "typebox";

const teams = { X: ["A01", "A02"], O: ["A03", "A04"] };

const Params = Type.Object({ games: Type.Integer({ minimum: 1, maximum: 5, default: 1, description: "Games in the match." }) }, { description: "The variants of the team game." });

export default defineGameFamily(Params, ({ games }) =>
	defineGame({
		id: "team-game",
		seed: 2,
		residents: 4,
		mechanics: [gridGame({ teams, games, wakeTeam: true }), consensus({ teams }), teamChannel({ teams })],
		// The channel shows new posts at the start of a turn, so no resident needs `readTeam`.
		grants: { resident: { drop: ["readTeam"] } },
		scheduler: { id: "turns", options: { activation: "onNews" } },
		end: { ticks: 20 * games },
		win: { fact: "grid.tally" },
		model: "anthropic/haiku",
	}),
);
