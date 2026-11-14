// SPDX-License-Identifier: Apache-2.0
/** Shared by the grid-game tests: a game, a stateless scripted player and the match it plays. */
import type { ActorDriver, Envelope } from "@swarmtales/contracts";
import { defineGame, type Game, type MechanicUse } from "@swarmtales/sdk";
import { gridGame } from "../src/index.ts";

export const RESIDENTS = ["A01", "A02", "A03", "A04"] as const;
export const TEAMS = { X: ["A01", "A02"], O: ["A03", "A04"] };

/**
 * The cells played in each game, in order (the side that starts plays the first). Game 1: X starts and wins the top row.
 * Game 2: O starts and the game is a draw. Game 3: X starts and O wins the middle row.
 */
export const SCRIPT: Readonly<Record<number, readonly number[]>> = {
	1: [0, 3, 1, 4, 2],
	2: [0, 1, 2, 4, 3, 5, 7, 6, 8],
	3: [0, 3, 1, 4, 8, 5],
};

/** Reads the board with `viewBoard` and plays the next cell of the script; stateless, so a resumed run plays on. */
export function scriptedPlayer(script: Readonly<Record<number, readonly number[]>> = SCRIPT): ActorDriver {
	return async (turn) => {
		const view = await turn.call("viewBoard", {});
		if (!view.ok) return;
		const game = /Game (\d+)\./.exec(view.reply)?.[1];
		if (game === undefined) return;
		const marks = (view.reply.split("\n").slice(0, 3).join("").match(/[XO]/g) ?? []).length;
		const cell = script[Number(game)]?.[marks];
		if (cell !== undefined) await turn.call("playMove", { cell });
	};
}

export function matchGame(options: Parameters<typeof gridGame>[0] = {}, extra: readonly MechanicUse[] = []): Game {
	return defineGame({
		id: "grid-game-test",
		seed: 7,
		residents: [...RESIDENTS],
		mechanics: [gridGame({ games: 3, teams: TEAMS, ...options }), ...extra],
		scheduler: { id: "turns", options: { passes: 2, activation: "onNews", order: "roster" } },
		end: { ticks: 40 },
	});
}

/** The events of one type that the mechanic `id` wrote. */
export function ofType(events: readonly Envelope[], type: string, id = "grid-game"): readonly Envelope[] {
	return events.filter((event) => event.source.endsWith(`/${id}`) && event.type === type);
}

/** One field of an event's payload, untyped. */
export function field(event: Envelope, key: string): unknown {
	const payload = event.payload;
	return typeof payload === "object" && payload !== null ? Reflect.get(payload, key) : undefined;
}
