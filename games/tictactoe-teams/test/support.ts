// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Scripted residents for tic-tac-toe teams: they follow the game's own turn inputs and tool replies, so they hold
 * no state. Carried from `test/stories/tictactoe-support.ts`.
 */
import { nameOf, type Activation, type ActorDriver, type Envelope } from "@swarmtales/contracts";
import type { Game } from "@swarmtales/sdk";
import { tictactoeGame, type TicTacToeOptions } from "../game.ts";

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

const texts = (turn: Activation): string => turn.inputs.map((note) => note.text).join("\n");

/** The brain a retro captain writes after `game` (0: before the first game). */
export const brainFor = (team: string, game: number): string => `Team ${team} brain after game ${String(game)}: take the centre when it is free, block any two in a row, and if the opponent holds a corner answer with the opposite corner.`;

// What a resident does in a retro window: one post, and as the retro captain the brain.
async function retro(turn: Activation, told: string, resident: string, team: string): Promise<void> {
	const game = Number(/Retro after game (\d+)/.exec(told)?.[1] ?? 0);
	await turn.call("postTeam", { text: `retro talk from ${resident}` });
	if (!told.includes("You are the retro captain")) return;
	// A replay of this game's move list is refused; the rule keyed to positions is accepted.
	if (game === 1) await turn.call("writeBrain", { text: "Game 1 was 0 3 1 4 2 and we lost it" });
	await turn.call("writeBrain", { text: brainFor(team, game) });
}

// The captain plays the agreed cell or proposes the next cell of the script; the others vote for an open proposal.
async function move(turn: Activation, told: string, cell: number, captain: boolean): Promise<void> {
	if (captain) {
		const agreed = /agreed on (\d+)/.exec(told)?.[1];
		if (agreed !== undefined) await turn.call("playMove", { cell: Number(agreed) });
		else await turn.call("proposeMove", { cell, reason: "script" });
	} else if (told.includes("proposes the move")) {
		await turn.call("castVote", { agree: true, reason: "ok" });
	}
}

// What the reply of `viewBoard` says: the game, the captain of the turn, the side to move and the marks on the board.
function boardOf(reply: string, size: number): { readonly game: number; readonly captain: string | undefined; readonly side: string | undefined; readonly marks: number } {
	return {
		game: Number(/Game (\d+)\./.exec(reply)?.[1]),
		captain: /Captain of the turn: (A\d+)\./.exec(reply)?.[1],
		side: /Side to move: ([XO])\./.exec(reply)?.[1],
		marks: (reply.split("\n").slice(0, size).join("").match(/[XO]/g) ?? []).length,
	};
}

/**
 * The scripted resident of the carried tests.
 *
 * @param cells - The cells of each game, in the order they are played.
 * @param size - The size of the board, to read the marks from the reply of `viewBoard`.
 * @returns The driver of every resident.
 */
export function ticTacToePlayer(cells: Readonly<Record<number, readonly number[]>> = CELLS, size = 3): ActorDriver {
	return async (turn) => {
		const resident = nameOf(turn.actor);
		const told = texts(turn);
		const team = ["A01", "A02", "A03"].includes(resident) ? "X" : "O";
		if (told.includes("Retro after game") || told.includes("Before game 1")) return retro(turn, told, resident, team);
		const view = await turn.call("viewBoard", {});
		if (!view.ok) return;
		const seen = boardOf(view.reply, size);
		const cell = cells[seen.game]?.[seen.marks];
		if (seen.side === team && cell !== undefined) await move(turn, told, cell, resident === seen.captain);
	};
}

/**
 * The game as the golden test plays it: roster order, so that captain, voters and the play fit in a pass or two.
 * The golden tests describe the original setup: 300 words, a retro of 8 posts and 3 ticks.
 *
 * @param options - The variant.
 * @returns The game with the turn order `roster`.
 */
export function goldenGame(options: TicTacToeOptions = {}): Game {
	const game = tictactoeGame({ maxWords: 300, retroMaxPosts: 8, retroMaxMinutes: 3, ...options });
	const turns: unknown = game.scheduler?.options;
	return { ...game, scheduler: { id: "turns", options: { ...(typeof turns === "object" ? turns : {}), order: "roster" } } };
}

/**
 * The briefing of one resident in a variant of the game.
 *
 * @param options - The variant.
 * @param resident - The resident's name.
 * @returns The briefing; undefined when the game has none for that resident.
 */
export function briefing(options: TicTacToeOptions, resident: string): string | undefined {
	const all = tictactoeGame(options).briefing;
	return typeof all === "object" ? all[resident] : all;
}

/** The events of one type, whoever wrote them. */
export const ofType = (events: readonly Envelope[], type: string): readonly Envelope[] => events.filter((event) => event.type === type);

/** One field of an event's payload, untyped. */
export function field(event: Envelope, key: string): unknown {
	const payload = event.payload;
	return typeof payload === "object" && payload !== null ? Reflect.get(payload, key) : undefined;
}

/** The `context-reset` lines the residents were shown, with the resident's name. */
export function resets(events: readonly Envelope[]): readonly { readonly resident: string; readonly text: string }[] {
	return ofType(events, "activation_opened").flatMap((event) => {
		const inputs: unknown = field(event, "inputs");
		const lines = Array.isArray(inputs) ? inputs.filter((input): input is { kind: string; text: string } => typeof input === "object" && input !== null && Reflect.get(input, "kind") === "context-reset") : [];
		return lines.map((input) => ({ resident: String(field(event, "actor")).replace(/^resident:/, ""), text: input.text }));
	});
}
