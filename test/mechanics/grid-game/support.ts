/** Shared by the grid-game and optimal-referee tests: a story, a stateless scripted player and the match it plays. */
import type { CoreStory, EventEnvelope, MechanicUse, TurnTaker } from "@swarmtales/contracts";
import { gridGame } from "@swarmtales/mechanic-grid-game";
import type { HostOptions } from "@swarmtales/kernel";

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
export function scriptedPlayer(script: Readonly<Record<number, readonly number[]>> = SCRIPT): TurnTaker {
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

export function matchStory(options: Partial<Parameters<typeof gridGame.with>[0]> = {}, extra: readonly MechanicUse[] = []): CoreStory {
	return {
		id: "grid-game-test",
		seed: 7,
		minutes: 40,
		residents: [...RESIDENTS],
		mechanics: [gridGame.with({ games: 3, teams: TEAMS, ...options }), ...extra],
		grants: "auto",
		turns: { passes: 2, activation: "onNews", order: (view) => view.residents },
	};
}

export function hostOptions(story: CoreStory = matchStory()): HostOptions {
	return { story };
}

/** One field of an event's payload, untyped. */
export function field(event: EventEnvelope, key: string): unknown {
	const payload = event.payload;
	return typeof payload === "object" && payload !== null ? Reflect.get(payload, key) : undefined;
}
