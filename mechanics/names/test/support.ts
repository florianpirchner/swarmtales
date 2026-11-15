// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Shared by the names tests: stand-ins for the progression (the level of a resident at a tick) and the deal of
 * `puzzles` (which tokens are pieces of a password), a mechanic that banishes through the real `exile`, and a reader
 * of a resident's answer.
 */
import { Type } from "typebox";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { ProgressionService } from "@swarmtales/mechanic-progression/contract";
import { PuzzlesService } from "@swarmtales/mechanic-puzzles/contract";
import { defineHead, defineMechanic, reply, type MechanicUse } from "@swarmtales/sdk";
import type { TestKernel } from "@swarmtales/testkit";

const no = (): boolean => false;
const none = (): null => null;
const zero = (): number => 0;

/**
 * The stand-in of the progression: `levelOf` as given, never finished, the rest inert.
 *
 * @param levelAt - The level of a resident at a tick.
 * @returns The mechanic.
 */
export function levelsStandIn(levelAt: (tick: number, resident: string) => number): MechanicUse {
	const head = defineHead({ id: "progression", package: "@test/progression", summary: "Test: the levels.", provides: [ProgressionService] });
	return defineMechanic(head, {
		services: {
			progression: {
				levelOf: ({ resident }, ctx) => levelAt(ctx.tick, resident),
				isFinished: no,
				hasPassed: no,
				hasSolved: no,
				passed: () => [],
				lastProgress: zero,
				currentAct: () => 1,
				actStart: none,
				door: none,
				doorShut: no,
				openDoor: no,
				releaseDoor: none,
				unlock: none,
				ranking: () => [],
				holdersBehind: () => [],
				nextPenalty: zero,
				nextBlamePenalty: zero,
				chargeBlame: zero,
				endAct: no,
				isOpenOnClock: () => true,
				opensAt: zero,
				bounds: () => ({ startLevel: 1, lastLevel: 10, survivors: 1 }),
			},
		},
	})();
}

/**
 * The stand-in of the deal: `passwordPiece` for the given tokens, the rest inert.
 *
 * @param pieces - The tokens that are pieces of a dealt password.
 * @returns The mechanic.
 */
export function dealStandIn(pieces: readonly string[]): MechanicUse {
	const head = defineHead({ id: "puzzles", package: "@test/puzzles", summary: "Test: the pieces of a password.", provides: [PuzzlesService] });
	return defineMechanic(head, { services: { deal: { passwordPiece: ({ token }) => pieces.includes(token), carriesSecret: no, isHandover: no, revealFactor: () => ({ ok: true, agents: [] }) } } })();
}

/** Banishes a resident through the real `exile` with its tool `banish`. */
export const court = defineMechanic(
	defineHead({ id: "court", package: "@test/court", summary: "Test: banishes.", requires: [ExileService], tools: { banish: { description: "Banish.", params: Type.Object({ resident: Type.String({ description: "The resident" }) }), for: ["resident"] } } }),
	{ tools: { banish: { run: ({ resident }, ctx) => reply(JSON.stringify(ctx.call(ExileService, "banish", { resident }))) } } },
);

/**
 * Calls a tool and gives what the caller reads: the reply, or `CODE: detail`.
 *
 * @param test - The kernel.
 * @param resident - The caller.
 * @param tool - The tool.
 * @param params - The params.
 * @returns The answer.
 */
export async function say(test: TestKernel, resident: string, tool: string, params: unknown): Promise<string> {
	const outcome = await test.call(resident, tool, params);
	if (outcome.ok) return outcome.reply;
	return outcome.detail === undefined ? outcome.code : `${outcome.code}: ${outcome.detail}`;
}
