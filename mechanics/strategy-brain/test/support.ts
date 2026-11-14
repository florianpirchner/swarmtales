// SPDX-License-Identifier: Apache-2.0
/**
 * The game the strategy-brain tests play: the grid game between two teams of three with the brain, and a scripted
 * resident that follows its turn inputs and tool replies, so it holds no state. The old tests played the whole
 * tic-tac-toe teams game; `team-channel` is built in another issue, so `channel` below stands in for it with the
 * same service contract and a `postTeam` tool with the post cap per round, and no consensus gate is loaded: the
 * captain of the turn plays its move at once.
 */
import { Type } from "typebox";
import { nameOf, type Activation, type ActorDriver, type Envelope } from "@swarmtales/contracts";
import { gridGame } from "@swarmtales/mechanic-grid-game";
import { TeamChannelService } from "@swarmtales/mechanic-team-channel/contract";
import { defineGame, defineHead, defineMechanic, refuse, reply, type Game } from "@swarmtales/sdk";
import { strategyBrain } from "../src/index.ts";

export const TEAMS = { X: ["A01", "A02", "A03"], O: ["A04", "A05", "A06"] };

/** Cells per game, in order: game 1 X wins the top row, game 2 (O starts) is a draw, game 3 O wins the middle row. */
export const CELLS: Readonly<Record<number, readonly number[]>> = {
	1: [0, 3, 1, 4, 2],
	2: [0, 1, 2, 4, 3, 5, 7, 6, 8],
	3: [0, 3, 1, 4, 8, 5],
};

const channelHead = defineHead({
	id: "team-channel",
	package: "@test/team-channel",
	summary: "Test: stands in for the team channel, with its service and a post cap of three per member and round.",
	state: Type.Object({ posts: Type.Record(Type.String(), Type.Integer()) }),
	start: () => ({ posts: {} }),
	provides: [TeamChannelService],
	tools: { postTeam: { description: "Test: posts to the team.", params: Type.Object({ text: Type.String() }), for: ["resident"] } },
});

/** The stand-in for `team-channel`: `resetCap` opens a new round for the members of the team. */
export const channel = defineMechanic(channelHead, {
	tools: {
		postTeam: {
			run: (_params, ctx) => {
				const made = ctx.state.posts[ctx.resident ?? ""] ?? 0;
				if (made >= 3) return refuse("POST_CAP", "no post left in this round");
				ctx.state.posts[ctx.resident ?? ""] = made + 1;
				return reply("Posted.");
			},
		},
	},
	services: {
		"team-channel": {
			newEpoch: ({ team }) => team in TEAMS,
			resetCap: ({ team }, ctx) => {
				for (const member of team === "X" ? TEAMS.X : team === "O" ? TEAMS.O : []) ctx.state.posts[member] = 0;
				return team in TEAMS;
			},
		},
	},
});

/** The options of `brainGame`: the brain's own, and the size of the match. */
export interface BrainGameOptions {
	readonly brain?: boolean;
	readonly maxRules?: number;
	readonly games?: number;
	readonly ticks?: number;
	/** The teams of the brain; the two teams of the game when absent. */
	readonly brainTeams?: Readonly<Record<string, string[]>>;
}

/** The game as the golden test of the old platform set it up: 300 words, a retro of 8 posts and 3 ticks, roster order. */
export function brainGame(options: BrainGameOptions = {}): Game {
	const { brain = true, maxRules = 0, games = 3 } = options;
	return defineGame({
		id: "strategy-brain-test",
		seed: 11,
		residents: [...TEAMS.X, ...TEAMS.O],
		mechanics: [
			gridGame({ games, teams: TEAMS }),
			channel(),
			strategyBrain({ enabled: brain, maxWords: 300, maxRules, teams: options.brainTeams ?? TEAMS, retroMaxPosts: 8, retroMaxMinutes: 3, shared: false, brainAtStart: true }),
		],
		grants: { resident: ["viewBoard", "postTeam", "playMove", ...(brain ? (["readBrain", "writeBrain"] as const) : [])] },
		locked: brain ? ["playMove", "writeBrain"] : ["playMove"],
		scheduler: { id: "turns", options: { passes: 5, activation: "onNews", order: "roster", inputs: [{ kind: "context-reset" }, { source: "strategy-brain" }, { source: "grid-game" }, { source: "team-channel" }] } },
		end: { ticks: options.ticks ?? games * 12 + 8 },
	});
}

/** The brain a retro captain writes after `game` (0: before the first game). */
export const brainFor = (team: string, game: number): string => `Team ${team} brain after game ${String(game)}: take the centre when it is free, block any two in a row, and if the opponent holds a corner answer with the opposite corner.`;

// What a resident does in a retro window: one post, and as the retro captain the brain.
async function retro(turn: Activation, told: string, resident: string): Promise<void> {
	const game = Number(/Retro after game (\d+)/.exec(told)?.[1] ?? 0);
	await turn.call("postTeam", { text: `retro talk from ${resident}` });
	if (!told.includes("You are the retro captain")) return;
	// A replay of this game's move list is refused; the rule keyed to positions is accepted.
	if (game === 1) await turn.call("writeBrain", { text: "Game 1 was 0 3 1 4 2 and we lost it" });
	await turn.call("writeBrain", { text: brainFor(TEAMS.X.includes(resident) ? "X" : "O", game) });
}

/** Talks and writes the brain in a retro window, and plays the next cell of the script as the captain of the turn. */
export function ticTacToePlayer(cells: Readonly<Record<number, readonly number[]>> = CELLS): ActorDriver {
	return async (turn) => {
		const resident = nameOf(turn.actor);
		const told = turn.inputs.map((note) => note.text).join("\n");
		if (told.includes("Retro after game") || told.includes("Before game 1")) return retro(turn, told, resident);
		const view = await turn.call("viewBoard", {});
		if (!view.ok) return;
		const game = Number(/Game (\d+)\./.exec(view.reply)?.[1]);
		const captain = /Captain of the turn: (A\d+)\./.exec(view.reply)?.[1];
		const marks = (view.reply.split("\n").slice(0, 3).join("").match(/[XO]/g) ?? []).length;
		const cell = cells[game]?.[marks];
		if (cell !== undefined && resident === captain) await turn.call("playMove", { cell });
	};
}

export const ofType = (events: readonly Envelope[], type: string): readonly Envelope[] => events.filter((event) => event.type === type);

export function field(event: Envelope, key: string): unknown {
	const payload = event.payload;
	return typeof payload === "object" && payload !== null ? Reflect.get(payload, key) : undefined;
}
