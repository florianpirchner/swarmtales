// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** A game whose only tool throws, so its run ends with the reason `error`. */
import { defineGame, defineHead, defineMechanic } from "@swarmtales/sdk";
import { Type } from "typebox";

const head = defineHead({
	id: "broken",
	package: "@swarmtales/cli",
	summary: "A tool that throws.",
	options: Type.Object({}, { description: "No options." }),
	tools: { poke: { description: "Poke it.", params: Type.Object({}, { description: "No arguments." }), for: ["resident"] } },
});
const broken = defineMechanic(head, {
	tools: {
		poke: {
			run: () => {
				throw new TypeError("the fixture fails");
			},
			sample: () => ({}),
		},
	},
});

export default defineGame({ id: "broken", residents: 1, mechanics: [broken()], end: { ticks: 3 } });
