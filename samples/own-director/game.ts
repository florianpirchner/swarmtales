// SPDX-License-Identifier: Apache-2.0
/**
 * The game of sample 6: three residents name a captain, the choice waits two ticks in a decision window, and its
 * holders are the steward (a Director) and the person at the run (the Human Hand).
 */
import { decisions } from "@swarmtales/mechanic-decisions";
import { humanHand } from "@swarmtales/mechanic-human-hand";
import { defineGame } from "@swarmtales/sdk";
import { crew } from "./src/crew.ts";
import { steward } from "./src/steward.ts";

export default defineGame({
	id: "own-director",
	seed: 5,
	residents: 3,
	mechanics: [decisions({ holders: ["human", "director:steward"] }), humanHand(), crew({ window: 2 })],
	directors: [{ use: steward }],
	grants: {
		resident: ["nominate"],
		steward: ["remark", "amendDecision"],
		human: ["pause", "resume", "amendDecision"],
	},
	scheduler: { id: "turns", options: { activation: "toAct", afterBlocks: ["director"] } },
	end: { ticks: 6 },
	model: "anthropic/haiku",
});
