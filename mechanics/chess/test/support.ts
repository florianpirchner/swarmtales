// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The game the chess tests play: two solo seats (or two teams of two), chess, the team channel and a strategy brain
 * per seat or team, set up as the old platform's chess game was (`stories/chess/story.ts`), with its variants. The scripted resident is the player
 * of the old game test (`test/stories/chess.test.ts`): it reads the board, so it holds no state.
 */
import { nameOf, type ActorDriver, type Envelope } from "@swarmtales/contracts";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import { teamChannel } from "@swarmtales/mechanic-team-channel";
import { defineGame, type Game } from "@swarmtales/sdk";
import { chess } from "../src/index.ts";

export const SEATS = ["A01", "A02"] as const;

/** The two teams of the team variant, as the old game had them. */
export const TEAMS = { A: ["A01", "A02"], B: ["A03", "A04"] } as const;

/** The variants of the test game, named as the old game named them. */
export interface ChessGameOptions {
	readonly games?: number;
	readonly brain?: boolean;
	readonly maxPlies?: number;
	readonly fresh?: boolean;
	readonly compact?: boolean;
	readonly settleCap?: boolean;
	readonly order?: "seeded" | "roster";
	readonly moves?: boolean;
	readonly threats?: boolean;
	readonly coach?: boolean;
	readonly teams?: boolean;
}

const DEFAULTS = { games: 2, brain: true, maxPlies: 160, fresh: false, compact: false, settleCap: false, order: "roster", moves: false, threats: false, coach: false, teams: false } as const satisfies ChessGameOptions;

/** The chess game of the old platform around the mechanic under test. */
export function chessGame(options: ChessGameOptions = {}): Game {
	const { games, brain, maxPlies, fresh, compact, settleCap, order, moves, threats, coach, teams } = { ...DEFAULTS, ...options };
	const sides = teams ? Object.fromEntries(Object.entries(TEAMS).map(([name, list]) => [name, [...list]])) : Object.fromEntries(SEATS.map((seat) => [seat, [seat]]));
	const residents = teams ? Object.values(TEAMS).flat() : [...SEATS];
	return defineGame({
		id: "chess",
		seed: 29,
		residents,
		mechanics: [
			chess({ games, maxPlies, showLegalMoves: moves, showThreats: threats, coach, maxIdleTurns: 3, maxForfeits: 3, adjudicateMargin: 3, alternateColours: true, score: true, teams: sides, wakeTeam: teams, freshContext: fresh, compactBoard: compact, settleCap }),
			teamChannel({ teams: teams ? sides : {}, maxPostsPerMove: 2 }),
			strategyBrain({ enabled: brain, solo: !teams, maxWords: 150, teams: sides, retroMaxPosts: 6, retroMaxMinutes: 2, shared: false, brainAtStart: true }),
		],
		grants: { resident: ["viewBoard", "playMove", "resign", ...(teams ? (["postTeam", "readTeam"] as const) : []), ...(brain ? (["readBrain", "writeBrain"] as const) : [])] },
		locked: ["playMove", "resign", ...(brain ? (["writeBrain"] as const) : [])],
		// The reset line first, then the lines in the order of the old hook numbers: the brain, chess, the team's new posts.
		scheduler: { id: "turns", options: { passes: 4, activation: "onNews", order, inputs: [{ kind: "context-reset" }, { source: "strategy-brain" }, { source: "chess" }, { source: "team-channel" }] } },
		limits: { maxCallsPerTick: 16 },
		end: { ticks: (games * Math.ceil((maxPlies * 3) / 4) + (games + 1) * 2 + 4) * (teams ? 2 : 1) },
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
