// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { gridGame } from "@swarmtales/mechanic-grid";
import { defineGame } from "swarmtales";

export default defineGame({
	id: "hello-game",
	residents: ["ada", "bob"],
	mechanics: [gridGame({ teams: { X: ["ada"], O: ["bob"] }, games: 1 })],
	scheduler: { id: "turns", options: { activation: "toAct" } },
	end: { ticks: 12 },
	win: { fact: "grid.tally" },
	model: "anthropic/haiku",
});
