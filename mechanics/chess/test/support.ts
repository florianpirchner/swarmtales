// SPDX-License-Identifier: Apache-2.0
/**
 * The game the chess tests play: two solo seats, chess, the team channel without teams and a strategy brain per
 * seat, set up as the old platform's chess game was (`stories/chess/story.ts`). The scripted resident is the player
 * of the old game test (`test/stories/chess.test.ts`): it reads the board, so it holds no state.
 */
import { nameOf, type ActorDriver, type Envelope } from "@swarmtales/contracts";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import { teamChannel } from "@swarmtales/mechanic-team-channel";
import { defineGame, type Game } from "@swarmtales/sdk";
import { chess } from "../src/index.ts";

export const SEATS = ["A01", "A02"] as const;

/** The variants of the test game, named as the old game named them. */
export interface ChessGameOptions {
	readonly games?: number;
	readonly brain?: boolean;
	readonly maxPlies?: number;
	readonly fresh?: boolean;
	readonly compact?: boolean;
	readonly settleCap?: boolean;
	readonly order?: "seeded" | "roster";
}

const DEFAULTS = { games: 2, brain: true, maxPlies: 160, fresh: false, compact: false, settleCap: false, order: "roster" } as const satisfies ChessGameOptions;

/** The chess game of the old platform around the mechanic under test. */
export function chessGame(options: ChessGameOptions = {}): Game {
	const { games, brain, maxPlies, fresh, compact, settleCap, order } = { ...DEFAULTS, ...options };
	const sides = Object.fromEntries(SEATS.map((seat) => [seat, [seat]]));
	return defineGame({
		id: "chess",
		seed: 29,
		residents: [...SEATS],
		mechanics: [
			chess({ games, maxPlies, showLegalMoves: false, showThreats: false, coach: false, maxIdleTurns: 3, maxForfeits: 3, adjudicateMargin: 3, alternateColours: true, score: true, teams: sides, wakeTeam: false, freshContext: fresh, compactBoard: compact, settleCap }),
			teamChannel({ teams: {}, maxPostsPerMove: 2 }),
			strategyBrain({ enabled: brain, solo: true, maxWords: 150, teams: sides, retroMaxPosts: 6, retroMaxMinutes: 2, shared: false, brainAtStart: true }),
		],
		grants: { resident: ["viewBoard", "playMove", "resign", ...(brain ? (["readBrain", "writeBrain"] as const) : [])] },
		locked: ["playMove", "resign", ...(brain ? (["writeBrain"] as const) : [])],
		scheduler: { id: "turns", options: { passes: 4, activation: "onNews", order, inputs: [{ kind: "context-reset" }] } },
		limits: { maxCallsPerTick: 16 },
		end: { ticks: games * Math.ceil((maxPlies * 3) / 4) + (games + 1) * 2 + 4 },
	});
}

/** The scripted games: game 1 (A01 White) is the four-move mate, game 2 (A02 White) the two-move mate, A01 mates. */
export const GAMES: Readonly<Record<number, readonly string[]>> = {
	1: ["e4", "e5", "Bc4", "Nc6", "Qh5", "Nf6", "Qxf7#"],
	2: ["f3", "e5", "g4", "Qh4#"],
};

/** The half-moves played so far, read off the `Moves so far:` line of a position. */
export function movesSoFar(text: string): number {
	const line = /Moves so far: (.*)/.exec(text)?.[1] ?? "none";
	return line === "none" ? 0 : line.split(" ").filter((token) => !/^\d+\.$/.test(token)).length;
}

/** A seat that writes a brain when asked and else plays the next move of `GAMES`, with `reason` as its note. */
export function playerOf(reason: (move: string) => string = () => "script"): ActorDriver {
	return async (turn) => {
		const told = turn.inputs.map((note) => note.text).join("\n");
		if (told.includes("Retro after game") || told.includes("Before game 1")) {
			await turn.call("writeBrain", { text: `${nameOf(turn.actor)}: develop the pieces, guard f7, look for checks first.` });
			return;
		}
		const view = await turn.call("viewBoard", {});
		if (!view.ok) return;
		const move = GAMES[Number(/Game (\d+) of/.exec(view.reply)?.[1])]?.[movesSoFar(view.reply)];
		if (move !== undefined) await turn.call("playMove", { move, reason: reason(move) });
	};
}

/** The events of one type that the mechanic wrote. */
export function ofType(events: readonly Envelope[], type: string): readonly Envelope[] {
	return events.filter((event) => event.source.endsWith("/chess") && event.type === type);
}

/** One field of an event's payload, untyped. */
export function field(event: Envelope, key: string): unknown {
	const payload = event.payload;
	return typeof payload === "object" && payload !== null ? Reflect.get(payload, key) : undefined;
}
