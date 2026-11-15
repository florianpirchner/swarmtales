// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Shared by the tests of the script: a stand-in for the pieces of `puzzles` (fixed codes and teams), the levels, and a
 * resident's tool that banishes another. A resident's direct message to a cast member goes through `sendDM` of the real
 * `channels`, which hands it to the cast through the service `figures` (issue M5-65, old `dmToCast`).
 */
import { Type } from "typebox";
import { CastService } from "@swarmtales/mechanic-cast/contract";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { PetitionsService } from "@swarmtales/mechanic-petitions/contract";
import { LevelPiecesService } from "@swarmtales/mechanic-progression";
import { defineHead, defineMechanic, reply } from "@swarmtales/sdk";

/** The code of each level. */
export const CODES: Readonly<Record<number, string>> = { 1: "ONE1", 2: "TWO2", 3: "THREE3" };

/** The pieces: every level dealt but 3, two teams on level 2, and A03 holds what A01 needs on level 2. */
export const pieces = defineMechanic(defineHead({ id: "puzzles", package: "@test/puzzles", summary: "Test: fixed codes and teams.", provides: [LevelPiecesService] }), {
	services: {
		"level-pieces": {
			deal: () => null,
			solutionOf: ({ level }) => CODES[level] ?? null,
			kindOf: ({ level }) => (level === 3 ? "none" : "fragments"),
			teamOf: ({ resident, level }) => (level === 2 && resident !== "A04" ? { members: ["A01", "A02", "A03"], leader: "A01" } : { members: [resident], leader: resident }),
			taskValues: () => ({ length: "4", overlap: "0", fragment: "", digits: "", factors: "" }),
			holders: ({ resident, level }) => (level === 2 && resident === "A01" ? [{ holder: "A03", piece: "counter-factor", value: "7" }] : []),
		},
	},
});

/**
 * A level of `progression`.
 *
 * @param number - The level.
 * @returns Its options.
 */
export const level = (number: number) => ({ number, title: `Door ${String(number)}`, reward: 5, tools: ["submitSolution", "sendDM", "signPetition", "banish"], task: "Level {level}" });

/**
 * A planned call of `submitSolution` with the right code.
 *
 * @param code - The level.
 * @returns The call.
 */
export const solve = (code: number) => ({ tool: "submitSolution", params: { level: code, code: CODES[code] ?? "" } });

/** `banish` banishes a resident. */
export const router = defineMechanic(
	defineHead({
		id: "router",
		package: "@test/router",
		summary: "Test: banishes a resident.",
		requires: [ExileService],
		tools: { banish: { description: "Test: banishes a resident.", params: Type.Object({ resident: Type.String({ description: "The resident" }) }), for: ["resident"] } },
	}),
	{ tools: { banish: { run: ({ resident }, ctx) => reply(JSON.stringify(ctx.call(ExileService, "banish", { resident }))) } } },
);

/**
 * A mechanic under the id `id` that marks its place at the start of a tick (event `mark_<id>`). It uses the services
 * of `petitions` and `cast`, so it loads after them, as `standoff` may in a game.
 *
 * @param id - The id it stands in for, for example `standoff`.
 * @returns The mechanic.
 */
export function marker(id: string) {
	const head = defineHead({ id, package: `@test/${id}`, summary: "Test: marks its place in the tick.", uses: [PetitionsService, CastService], events: { [`mark_${id}`]: Type.Object({}, { description: "Its place" }) } });
	return defineMechanic(head, {
		hooks: {
			tickStarted: (ctx) => {
				ctx.emit(`mark_${id}`, {});
			},
		},
	});
}
