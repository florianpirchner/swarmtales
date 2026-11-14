// SPDX-License-Identifier: Apache-2.0
/** A game whose only tool has no `sample`, so the fake driver never calls it. */
import { defineGame, defineHead, defineMechanic, reply } from "@swarmtales/sdk";
import { Type } from "typebox";

const head = defineHead({
	id: "mute",
	package: "@swarmtales/cli",
	summary: "A tool without a sample.",
	options: Type.Object({}, { description: "No options." }),
	tools: { poke: { description: "Poke it.", params: Type.Object({}, { description: "No arguments." }), for: ["resident"] } },
});
const mute = defineMechanic(head, { tools: { poke: { run: () => reply("Poked.") } } });

export default defineGame({ id: "mute", residents: 1, mechanics: [mute()], end: { ticks: 2 } });
