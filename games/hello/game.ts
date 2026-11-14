// SPDX-License-Identifier: Apache-2.0
import { gridGame } from "@swarmtales/mechanic-grid-game";
import { defineGame } from "@swarmtales/sdk";

export default defineGame({
	id: "hello-game",
	residents: ["ada", "bob"],
	mechanics: [gridGame({ teams: { X: ["ada"], O: ["bob"] }, games: 1 })],
	scheduler: { id: "turns", options: { activation: "toAct" } },
	end: { ticks: 12 },
	win: { fact: "grid-game.tally" },
	model: "anthropic/haiku",
});
