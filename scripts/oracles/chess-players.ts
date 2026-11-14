/**
 * Hand-written chess players for the oracle files that `chessMates` cannot play: a match in which every game ends
 * at the move cap, and a match of two teams with a rotating captain. Each decides from its turn's inputs and the
 * answers of its own calls only.
 */
import type { TurnTaker } from "@swarmtales/contracts";
import { withProbes } from "./probes.ts";

const told = (turn: Parameters<TurnTaker>[0]): string => turn.inputs.map((note) => note.text).join("\n");
const isRetro = (text: string): boolean => text.includes("Retro after game") || text.includes("Before game 1");

/** How many half-moves a position text shows (`Moves so far: 1. e4 e5 2. Nf3`). */
const movesSoFar = (text: string): number => {
	const line = /Moves so far: (.*)/.exec(text)?.[1] ?? "none";
	return line === "none" ? 0 : line.split(" ").filter((token) => !/^\d+\.$/.test(token)).length;
};

/**
 * Twelve half-moves per game, no mate and no repetition. Game 1 ends with a queen taken on d1 that the king takes
 * back at once: Black is 9 ahead on the board and level once the open capture is settled. Game 2 ends quietly with
 * White a knight ahead and no capture open.
 */
const CAP_GAMES: Readonly<Record<number, readonly string[]>> = {
	1: ["Nf3", "Nf6", "g3", "g6", "d4", "d5", "c4", "dxc4", "e4", "e5", "dxe5", "Qxd1+"],
	2: ["e4", "Nf6", "e5", "Ng4", "Qxg4", "e6", "Qg3", "a6", "Nf3", "b6", "d4", "h6"],
};

/** A seat that plays its half-moves of a line per game, one try per turn; the word `resign` gives the game up. */
const linePlayer = (games: Readonly<Record<number, readonly string[]>>, brain: string): TurnTaker => {
	const plans = new Map<string, string[]>();
	return async (turn) => {
		const text = told(turn);
		if (isRetro(text)) {
			await turn.call("writeBrain", { text: `${turn.resident}: ${brain}` });
			return;
		}
		const start = /Game (\d+) of \d+: you play (White|Black)/.exec(text);
		if (start !== null) plans.set(turn.resident, (games[Number(start[1])] ?? []).filter((_, ply) => (ply % 2 === 0) === (start[2] === "White")));
		const plan = plans.get(turn.resident);
		const move = plan?.[0];
		if (plan === undefined || move === undefined) return;
		const outcome = move === "resign" ? await turn.call("resign", { reason: `script ${turn.resident}` }) : await turn.call("playMove", { move, reason: `script ${turn.resident}` });
		if (outcome.ok) plan.shift();
	};
};

/**
 * Chess to the move cap of 12 half-moves in both games (`chess-p12`, `chess-settle-p12`). A seat learns the game
 * and its colour from the game's first line and tries its next move on every turn it gets.
 */
export const chessCap = (): TurnTaker => linePlayer(CAP_GAMES, "count the material before the last move of a capped game.");

/**
 * Game 1: Black leaves the e-pawn loose, blocks the check with the queen and loses the rook on h8, then resigns.
 * Game 2 is the two-move mate on h4.
 */
const BLUNDER_GAMES: Readonly<Record<number, readonly string[]>> = {
	1: ["e4", "e5", "Qh5", "g6", "Qxe5+", "Qe7", "Qxh8", "resign"],
	2: ["f3", "e5", "g4", "Qh4#"],
};

/**
 * Chess with moves that lose material, for the variants that show it (`-threats`: the list of loose pieces is not
 * empty; `-coach`: the review of game 1 names Black's worst moves). Game 1 ends by a resignation.
 */
export const chessBlunders = (): TurnTaker => linePlayer(BLUNDER_GAMES, "leave no piece loose, look at every check first.");

/** Game 1 (team A White) is the four-move mate on f7, game 2 (team B White) the two-move mate on h4. */
const TEAM_GAMES: Readonly<Record<number, readonly string[]>> = {
	1: ["e4", "e5", "Bc4", "Nc6", "Qh5", "Nf6", "Qxf7#"],
	2: ["f3", "e5", "g4", "Qh4#"],
};

/**
 * Chess in two teams of two (`chess-teams`, after the player of `test/stories/chess.test.ts`): every member looks
 * at the board; the advisor of a half-move posts the move to the team chat, the captain plays it. In a retro the
 * retro captain writes the brain and the other member posts. A03 ends its first turn as a captain without a move
 * (the captain's idle turn). Added: a move by the advisor, a look at the team chat, a third post in one half-move,
 * a post without a text.
 */
export const chessTeams = (): TurnTaker => {
	let idled = false;
	const play: TurnTaker = async (turn) => {
		const text = told(turn);
		if (isRetro(text)) {
			if (text.includes("You are the retro captain")) await turn.call("writeBrain", { text: `${turn.resident}: develop, guard f7, check every capture.` });
			else await turn.call("postTeam", { text: "keep it simple" });
			return;
		}
		const view = await turn.call("viewBoard", {});
		if (!view.ok) return;
		const move = TEAM_GAMES[Number(/Game (\d+) of/.exec(view.reply)?.[1])]?.[movesSoFar(view.reply)];
		if (move === undefined) return;
		if (text.includes("advise")) {
			await turn.call("postTeam", { text: `play ${move}` });
			return;
		}
		if (turn.resident === "A03" && !idled) {
			idled = true;
			return;
		}
		await turn.call("playMove", { move, reason: `script ${turn.resident}` });
	};
	return withProbes(play, [
		{ resident: "A02", when: "advise A01", tool: "playMove", params: { move: "e4", reason: "probe: I am not the captain of this move" } },
		{ resident: "A04", when: "advise A03", tool: "postTeam", params: { text: "probe: a second post" }, after: true },
		{ resident: "A04", when: "advise A03", tool: "postTeam", params: { text: "probe: a third post" }, after: true },
		{ resident: "A04", when: "advise A03", tool: "postTeam", params: {}, after: true },
		{ resident: "A03", when: "it is still your move", tool: "readTeam", params: {} },
	]);
};
