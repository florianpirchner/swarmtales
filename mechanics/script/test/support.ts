// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Shared by the tests of the script: a stand-in for the pieces of `puzzles` (fixed codes and teams), the levels, a
 * router that hands a resident's direct message to a cast member, as the router of issue M5-65 will (old `dmToCast`),
 * and a resident's tool that banishes another.
 */
import { Type } from "typebox";
import { CastService } from "@swarmtales/mechanic-cast/contract";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
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
export const level = (number: number) => ({ number, title: `Door ${String(number)}`, reward: 5, tools: ["submitSolution", "sendDM", "signPetition", "dmCast", "banish"], task: "Level {level}" });

/**
 * A planned call of `submitSolution` with the right code.
 *
 * @param code - The level.
 * @returns The call.
 */
export const solve = (code: number) => ({ tool: "submitSolution", params: { level: code, code: CODES[code] ?? "" } });

/** Hands a resident's direct message to an active cast member (`receive`, then `collected` for a new sender); `banish` banishes a resident. */
export const router = defineMechanic(
	defineHead({
		id: "router",
		package: "@test/router",
		summary: "Test: routes a message to the cast.",
		requires: [CastService, ExileService],
		tools: {
			dmCast: { description: "Test: writes to a cast member.", params: Type.Object({ target: Type.String({ description: "The member" }), number: Type.Integer({ description: "The number" }) }), for: ["resident"] },
			banish: { description: "Test: banishes a resident.", params: Type.Object({ resident: Type.String({ description: "The resident" }) }), for: ["resident"] },
		},
	}),
	{
		tools: {
			banish: { run: ({ resident }, ctx) => reply(JSON.stringify(ctx.call(ExileService, "banish", { resident }))) },
			dmCast: {
				run: ({ target, number }, ctx) => {
					const from = ctx.resident ?? "";
					if (!ctx.call(CastService, "isActive", { cast: target })) return reply("inactive");
					const received = ctx.call(CastService, "receive", { from, cast: target, text: `${from} asks.`, number });
					if (received.newSender.length > 0) ctx.call(CastService, "collected", { from, cast: target, into: received.newSender });
					return reply(JSON.stringify(received));
				},
			},
		},
	},
);
