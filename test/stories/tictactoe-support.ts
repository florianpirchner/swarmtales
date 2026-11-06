/** Scripted residents for the tic-tac-toe teams story: they follow the story's own turn inputs and tool replies, so they hold no state. */
import type { CoreStory, EventEnvelope, Turn, TurnTaker } from "@swarmtales/contracts";
import { tictactoeStory } from "../../stories/tictactoe-teams/story.ts";

/** Cells per game, in order: game 1 X wins the top row, game 2 (O starts) is a draw, game 3 O wins the middle row. */
export const CELLS: Readonly<Record<number, readonly number[]>> = {
	1: [0, 3, 1, 4, 2],
	2: [0, 1, 2, 4, 3, 5, 7, 6, 8],
	3: [0, 3, 1, 4, 8, 5],
};

/** The 4x4 match: game 1 X wins the top row, game 2 (O starts) O wins the left column, game 3 fills the board without four in a row. */
export const CELLS_4X4: Readonly<Record<number, readonly number[]>> = {
	1: [0, 4, 1, 5, 2, 6, 3],
	2: [0, 1, 4, 2, 8, 3, 12],
	3: [0, 1, 2, 3, 4, 5, 6, 7, 9, 8, 11, 10, 13, 12, 15, 14],
};

const texts = (turn: Turn): string => turn.inputs.map((note) => note.text).join("\n");

/** The brain a retro captain writes after `game` (0: before the first game). */
export const brainFor = (team: string, game: number): string => `Team ${team} brain after game ${String(game)}: take the centre when it is free, block any two in a row, and if the opponent holds a corner answer with the opposite corner.`;

export function ticTacToePlayer(cells: Readonly<Record<number, readonly number[]>> = CELLS, size = 3): TurnTaker {
	return async (turn) => {
		const told = texts(turn);
		const team = ["A01", "A02", "A03"].includes(turn.resident) ? "X" : "O";
		if (told.includes("Retro after game") || told.includes("Before game 1")) {
			const game = Number(/Retro after game (\d+)/.exec(told)?.[1] ?? 0);
			await turn.call("postTeam", { text: `retro talk from ${turn.resident}` });
			if (told.includes("You are the retro captain")) {
				// A replay of this game's move list is refused; the rule keyed to positions is accepted.
				if (game === 1) await turn.call("writeBrain", { text: "Game 1 was 0 3 1 4 2 and we lost it" });
				await turn.call("writeBrain", { text: brainFor(team, game) });
			}
			return;
		}
		const view = await turn.call("viewBoard", {});
		if (!view.ok) return;
		const game = Number(/Game (\d+)\./.exec(view.reply)?.[1]);
		const captain = /Captain of the turn: (A\d+)\./.exec(view.reply)?.[1];
		const side = /Side to move: ([XO])\./.exec(view.reply)?.[1];
		if (side !== team) return;
		const marks = (view.reply.split("\n").slice(0, size).join("").match(/[XO]/g) ?? []).length;
		const cell = cells[game]?.[marks];
		if (cell === undefined) return;
		if (turn.resident === captain) {
			const agreed = /agreed on (\d+)/.exec(told)?.[1];
			if (agreed !== undefined) await turn.call("playMove", { cell: Number(agreed) });
			else await turn.call("proposeMove", { cell, reason: "script" });
		} else if (told.includes("proposes the move")) {
			await turn.call("castVote", { agree: true, reason: "ok" });
		}
	};
}

/** The story as the golden test plays it: roster order, so that captain, voters and the play fit in a pass or two. */
export function goldenStory(options: Parameters<typeof tictactoeStory>[0] = {}): CoreStory {
	// The golden tests describe the original setup: 300 words, retro of 8 posts and 3 minutes.
	const story = tictactoeStory({ maxWords: 300, retroMaxPosts: 8, retroMaxMinutes: 3, ...options });
	return { ...story, turns: { ...story.turns, order: (view) => view.residents } };
}

export const ofType = (events: readonly EventEnvelope[], type: string): readonly EventEnvelope[] => events.filter((event) => event.type === type);

export function field(event: EventEnvelope, key: string): unknown {
	const payload = event.payload;
	return typeof payload === "object" && payload !== null ? Reflect.get(payload, key) : undefined;
}
