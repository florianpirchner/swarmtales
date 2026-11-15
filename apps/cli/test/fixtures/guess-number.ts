// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The game of the command line's test in its builder form: three residents guess a number up to 20. */
import { defineGame } from "@swarmtales/sdk";
import { guessNumber } from "@swarmtales/testkit";

export default defineGame({ id: "guess-number", seed: 4, residents: 3, mechanics: [guessNumber({ max: 20 })], briefing: "Find the secret number.", end: { ticks: 30 } });
