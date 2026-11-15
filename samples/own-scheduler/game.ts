// SPDX-License-Identifier: Apache-2.0
/**
 * The game of the scheduler sample: three residents seal a guess of a hidden number in each of three rounds, played
 * under `parallel`. It runs in the tests of the sample only: `swt run` cannot name `parallel`.
 */
import { defineGame } from "@swarmtales/sdk";
import { sealed } from "./src/sealed.ts";

export default defineGame({
	id: "sealed-guess",
	seed: 11,
	residents: 3,
	mechanics: [sealed({ max: 10 })],
	scheduler: { id: "parallel", options: { activation: "always" } },
	end: { ticks: 3 },
});
