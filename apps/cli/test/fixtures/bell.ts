// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** A game with the actor `script`: two residents guess a number, and a bell has a tool only the script may ring. */
import { defineGame, defineHead, defineMechanic, reply } from "@swarmtales/sdk";
import { guessNumber } from "@swarmtales/testkit";
import { Type } from "typebox";

const head = defineHead({
	id: "bell",
	package: "@swarmtales/cli",
	summary: "A bell only the script rings.",
	tools: { ring: { description: "Ring the bell.", params: Type.Object({}, { description: "No arguments." }), for: ["script"] } },
});
const bell = defineMechanic(head, { tools: { ring: { run: () => reply("rung") } } });

export default defineGame({ id: "bell", seed: 4, residents: 2, mechanics: [guessNumber({ max: 20 }), bell()], end: { ticks: 2 } });
