// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Shared by the marks tests: a stand-in for `progression` (the levels are set by its tool `submitSolution`, from the
 * level-ups an oracle file wrote after each submission, or by `to`), and a reader of a resident's answer.
 */
import { Type } from "typebox";
import { ProgressionEvents, ProgressionService } from "@swarmtales/mechanic-progression/contract";
import { defineHead, defineMechanic, reply, type MechanicUse } from "@swarmtales/sdk";
import type { TestKernel } from "@swarmtales/testkit";

/** What the stand-in of the progression knows: the levels now, and the level-ups each coming submission writes. */
export interface Levels {
	/** The level of each resident; `start` for one not listed. */
	readonly levels: Map<string, number>;
	/** Per resident, the levels its next submissions enter, one list per submission, in file order. */
	readonly queued: Map<string, number[][]>;
	/** The level every resident starts on. */
	readonly start: number;
	/** The last playable level; a resident above it has finished. */
	readonly lastLevel: number;
	/** The tick a level's door opens. */
	readonly opensAt: (level: number) => number;
}

const Submit = Type.Object(
	{ level: Type.Optional(Type.Integer({ description: "The level" })), code: Type.Optional(Type.String({ description: "The code" })), to: Type.Optional(Type.Integer({ description: "The level to enter" })) },
	{ description: "A submission: `to` enters a level at once, else the next queued level-ups follow" },
);

/**
 * The stand-in of the progression: `levelOf`, `isFinished` and `isOpenOnClock` as the levels say, the rest inert.
 *
 * @param state - The levels.
 * @returns The mechanic.
 */
export function levelsStandIn(state: Levels): MechanicUse {
	const levelOf = (resident: string): number => state.levels.get(resident) ?? state.start;
	const head = defineHead({ id: "progression", package: "@test/progression", summary: "Test: the levels.", events: ProgressionEvents.events, provides: [ProgressionService], tools: { submitSolution: { description: "Test: submit.", params: Submit, for: ["resident"] } } });
	return defineMechanic(head, {
		tools: {
			submitSolution: {
				run: ({ to }, ctx) => {
					const resident = ctx.resident ?? "";
					const entered = to === undefined ? (state.queued.get(resident)?.shift() ?? []) : [to];
					for (const level of entered) state.levels.set(resident, level);
					return reply("submitted");
				},
			},
		},
		services: {
			progression: {
				levelOf: ({ resident }) => levelOf(resident),
				isFinished: ({ resident }) => levelOf(resident) > state.lastLevel,
				hasPassed: ({ resident, level }) => levelOf(resident) > level,
				hasSolved: () => false,
				passed: () => [],
				lastProgress: () => -1,
				currentAct: () => 1,
				actStart: () => null,
				door: () => null,
				doorShut: () => false,
				openDoor: () => false,
				releaseDoor: () => null,
				unlock: () => null,
				ranking: () => [],
				holdersBehind: () => [],
				nextPenalty: () => 0,
				nextBlamePenalty: () => 0,
				chargeBlame: () => 0,
				endAct: () => false,
				isOpenOnClock: ({ level }, ctx) => ctx.tick >= state.opensAt(level),
				opensAt: ({ level }) => state.opensAt(level),
				bounds: () => ({ startLevel: state.start, lastLevel: state.lastLevel, survivors: 1 }),
			},
		},
	})();
}

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
