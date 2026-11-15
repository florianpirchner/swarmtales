// SPDX-License-Identifier: Apache-2.0
/**
 * The game of sample 5: four residents mark a suspect; at two marks the tribunal proposes a sentence, which the
 * person at the run may amend for one tick, and the sentenced resident is banished.
 */
import { decisions } from "@swarmtales/mechanic-decisions";
import { exile } from "@swarmtales/mechanic-exile";
import { defineGame } from "@swarmtales/sdk";
import { marks, tribunal } from "./src/index.ts";

export default defineGame({
	id: "own-mechanic",
	seed: 3,
	residents: 4,
	mechanics: [tribunal({ threshold: 2, window: 1 }), marks({ immune: ["resident:A01"] }), decisions({ holders: ["human"] }), exile()],
	grants: { resident: ["mark"], human: ["amendDecision"] },
	end: { ticks: 4 },
	model: "anthropic/haiku",
});
