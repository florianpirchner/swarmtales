// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Shared by the tests of the game: the options behind each old variant name, the scripted seat of the old
 * `test/stories/chess.test.ts` (`player`, with its brain part) and the readers of the log.
 */
import { nameOf, type ActorDriver } from "@swarmtales/contracts";
import type { OracleCall, Played } from "@swarmtales/testkit";
import type { ChessOptions } from "../game.ts";

type Logged = Played["events"][number];

/**
 * The options behind every variant name that an oracle file or the old runs index (`stories/chess/runs/README.md` on
 * `legacy`) uses. The old parser read
 * `chess[-nobrain][-moves][-threats][-coach][-teams][-fresh][-compact][-settle][-g<games>][-p<plies>]`; the name
 * grammar is not carried.
 */
export const VARIANTS: Readonly<Record<string, ChessOptions>> = {
	chess: {},
	"chess-p80": { maxPlies: 80 },
	"chess-g4-p80": { games: 4, maxPlies: 80 },
	"chess-fresh-g4-p80": { fresh: true, games: 4, maxPlies: 80 },
	"chess-compact-g4-p80": { compact: true, games: 4, maxPlies: 80 },
	"chess-fresh-compact-g4-p80": { fresh: true, compact: true, games: 4, maxPlies: 80 },
	"chess-moves": { showLegalMoves: true },
	"chess-moves-coach": { showLegalMoves: true, coach: true },
	"chess-nobrain": { brain: false },
	"chess-p12": { maxPlies: 12 },
	"chess-settle-p12": { settleCap: true, maxPlies: 12 },
	"chess-teams": { teams: true },
	"chess-threats": { showThreats: true },
	"chess-coach-g4-p80": { coach: true, games: 4, maxPlies: 80 },
	"chess-compact-settle-g4": { compact: true, settleCap: true, games: 4 },
	"chess-fresh-compact-settle-g4": { fresh: true, compact: true, settleCap: true, games: 4 },
	"chess-moves-p80": { showLegalMoves: true, maxPlies: 80 },
	"chess-moves-g4-p80": { showLegalMoves: true, games: 4, maxPlies: 80 },
	"chess-moves-teams-g4-p80": { showLegalMoves: true, teams: true, games: 4, maxPlies: 80 },
	"chess-moves-threats-g4-p80": { showLegalMoves: true, showThreats: true, games: 4, maxPlies: 80 },
	"chess-moves-threats-coach-g4-p80": { showLegalMoves: true, showThreats: true, coach: true, games: 4, maxPlies: 80 },
	"chess-nobrain-p80": { brain: false, maxPlies: 80 },
	"chess-nobrain-g4-p80": { brain: false, games: 4, maxPlies: 80 },
	"chess-teams-p80": { teams: true, maxPlies: 80 },
	"chess-threats-g4-p80": { showThreats: true, games: 4, maxPlies: 80 },
};

/** The scripted games: game 1 (A01 White) is the four-move mate, game 2 (A02 White) the two-move mate, A01 mates. */
const GAMES: Readonly<Record<number, readonly string[]>> = {
	1: ["e4", "e5", "Bc4", "Nc6", "Qh5", "Nf6", "Qxf7#"],
	2: ["f3", "e5", "g4", "Qh4#"],
};

// The half-moves played so far, read off the `Moves so far:` line of a position (the spaced board).
function movesSoFar(text: string): number {
	const line = /Moves so far: (.*)/.exec(text)?.[1] ?? "none";
	return line === "none" ? 0 : line.split(" ").filter((token) => !/^\d+\.$/.test(token)).length;
}

/**
 * A seat that writes its brain when asked and else looks at the board and plays the next move of the scripted game.
 * Stateless: it reads its turn and the board.
 */
export const player: ActorDriver = async (turn) => {
	const told = turn.inputs.map((note) => note.text).join("\n");
	if (told.includes("Retro after game") || told.includes("Before game 1")) {
		await turn.call("writeBrain", { text: `${nameOf(turn.actor)}: develop the pieces, guard f7, look for checks first.` });
		return;
	}
	const view = await turn.call("viewBoard", {});
	if (!view.ok) return;
	const move = GAMES[Number(/Game (\d+) of/.exec(view.reply)?.[1])]?.[movesSoFar(view.reply)];
	if (move !== undefined) await turn.call("playMove", { move, reason: "script" });
};

/** The events of one type, whoever wrote them. */
export const ofType = (events: readonly Logged[], type: string): readonly Logged[] => events.filter((event) => event.type === type);

const ENDS_TURN = new Set(["playMove", "resign"]);
/**
 * The calls that ended their turn, for `withEndsTurn` of the testkit: every accepted `playMove` and `resign`. No file
 * of `oracles/` holds the flag, and the old mechanic set it on both (see `oracle.test.ts`).
 */
export const endsTurn = (call: OracleCall): boolean => ENDS_TURN.has(call.tool);

/** One field of an event's payload, untyped. */
export function field(event: Logged, key: string): unknown {
	const payload = event.payload;
	return typeof payload === "object" && payload !== null ? Reflect.get(payload, key) : undefined;
}
