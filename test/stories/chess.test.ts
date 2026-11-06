/** The chess story through the real mechanics: scripted games, offline (docs/ideas/game-roadmap.md §2.8). */
import { describe, expect, it } from "vitest";
import type { CoreStory, TurnTaker } from "@swarmtales/contracts";
import { createHost, residentActor } from "@swarmtales/kernel";
import { createPromptLookup } from "@swarmtales/prompts";
import { checkDeterminism, checkSnapshotRoundTrip, idleAgent, playStory } from "@swarmtales/testkit";
import { parseMove, replay, scoreMove } from "../../mechanics/chess/src/model.ts";
import { chessStory, type ChessOptions } from "../../stories/chess/story.ts";
import { findCoreStory } from "../../stories/index.ts";
import { replaysLine } from "../../mechanics/strategy-brain/src/text.ts";
import { analyseGame, classOf } from "../../lab/chess-analyse.ts";
import { field, ofType } from "./tictactoe-support.ts";

const as = residentActor;

function story(extra: ChessOptions = {}): CoreStory {
	const base = chessStory(extra);
	return { ...base, turns: { ...base.turns, order: (view) => view.residents } };
}

const options = (extra: ChessOptions = {}) => ({ story: story(extra), prompts: createPromptLookup() });

/**
 * The scripted games, by game: game 1 (A01 White) is the four-move mate, with one unreadable and one
 * illegal try by A01 first; game 2 (A02 White) is the two-move mate, A01 (Black) mates.
 */
const GAMES: Readonly<Record<number, readonly string[]>> = {
	1: ["e4", "e5", "Bc4", "Nc6", "Qh5", "Nf6", "Qxf7#"],
	2: ["f3", "e5", "g4", "Qh4#"],
};

const movesSoFar = (text: string): number => {
	const line = /Moves so far: (.*)/.exec(text)?.[1] ?? "none";
	return line === "none" ? 0 : line.split(" ").filter((token) => !/^\d+\.$/.test(token)).length;
};

const player: TurnTaker = async (turn) => {
	const told = turn.inputs.map((note) => note.text).join("\n");
	if (told.includes("Retro after game") || told.includes("Before game 1")) {
		await turn.call("writeBrain", { text: `${turn.resident}: develop the pieces, guard f7, look for checks first.` });
		return;
	}
	const view = await turn.call("viewBoard", {});
	if (!view.ok) return;
	const game = Number(/Game (\d+) of/.exec(view.reply)?.[1]);
	const ply = movesSoFar(view.reply);
	const move = GAMES[game]?.[ply];
	if (move === undefined) return;
	if (game === 1 && ply === 0) {
		expect(await turn.call("playMove", { move: "xyz" })).toMatchObject({ ok: false, code: "ILLEGAL_MOVE" });
		const illegal = await turn.call("playMove", { move: "Ke2" });
		expect(illegal).toMatchObject({ ok: false, code: "ILLEGAL_MOVE" });
		// Without the legal list, a refusal names only the moves of the piece the text names: never the whole list.
		expect(illegal.ok ? "" : (illegal.detail ?? "")).toContain("That piece has no legal move now.");
		const knight = await turn.call("playMove", { move: "g1e2" });
		expect(knight.ok ? "" : (knight.detail ?? "")).toContain("Legal moves of that piece: Nf3, Nh3.");
	}
	await turn.call("playMove", { move, reason: "script" });
};

describe("chess rules through chess.js", () => {
	it("reads moves as models write them and refuses illegal ones", () => {
		const start = replay([]);
		for (const text of ["e4", "e2e4", "e2-e4", "Pe4", "1. e4", "e4!", "e4+"]) expect(parseMove(start, text)?.san).toBe("e4");
		expect(parseMove(start, "Ng1f3")?.san).toBe("Nf3");
		expect(parseMove(start, "nf3")?.san).toBe("Nf3");
		for (const text of ["Ke2", "e5", "O-O", "xyz", ""]) expect(parseMove(start, text)).toBeUndefined();
		const castle = replay(["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"]);
		expect(parseMove(castle, "0-0")?.san).toBe("O-O");
		expect(parseMove(castle, "e1g1")?.san).toBe("O-O");
		const promote = replay(["a4", "b5", "axb5", "a6", "bxa6", "Nc6", "a7", "Rb8"]);
		expect(parseMove(promote, "a8=Q")?.san).toBe("a8=Q");
		expect(parseMove(promote, "a7a8n")?.san).toBe("a8=N");
	});

	it("scores a hanging queen as a blunder and a free capture as the best move", () => {
		// After 1. e4 Nc6 2. d4 Nxd4 the knight on d4 hangs: taking it is best, a quiet move misses three pawns.
		expect(scoreMove(["e4", "Nc6", "d4", "Nxd4"], "Qxd4")).toMatchObject({ best: "Qxd4", loss: 0, class: "good" });
		expect(scoreMove(["e4", "Nc6", "d4", "Nxd4"], "a3")).toMatchObject({ best: "Qxd4", loss: 3, class: "blunder" });
		// 1. e4 d5 2. exd5 wins a pawn the queen takes back: worth the same as a quiet move.
		expect(scoreMove(["e4", "d5"], "exd5")?.class).toBe("good");
		// 2. Qg4 puts the queen where the bishop on c8 takes it for free.
		const hang = scoreMove(["e4", "d6"], "Qg4");
		expect(hang?.class).toBe("blunder");
		expect(hang?.loss).toBeGreaterThanOrEqual(8);
	});
});

describe("chess, scripted match", () => {
	it("plays two games with alternating colours, refuses illegal moves and ends on mate", async () => {
		const run = await playStory(options(), player);
		expect(run.end).toMatchObject({ reason: "referee", limit: "chess.match" });
		const ended = ofType(run.events, "game_ended");
		expect(ended.map((event) => [field(event, "white"), field(event, "result"), field(event, "reason"), field(event, "plies")])).toEqual([
			["A01", "1-0", "checkmate", 7],
			["A02", "0-1", "checkmate", 4],
		]);
		expect(ended.map((event) => field(event, "illegal"))).toEqual([{ A01: 3 }, {}]);
		expect(ended.map((event) => String(field(event, "pgn")))[1]).toContain("2. g4 Qh4#");
		expect(ofType(run.events, "match_ended").map((event) => field(event, "scores"))).toEqual([{ A01: 2, A02: 0 }]);
		// Refusals and the baseline's verdicts are for the human only.
		const refused = ofType(run.events, "move_refused");
		expect(refused.map((event) => field(event, "written"))).toEqual(["xyz", "Ke2", "g1e2"]);
		for (const type of ["move_refused", "move_scored"]) expect(ofType(run.events, type).every((event) => JSON.stringify(event.audience) === JSON.stringify(["human"]))).toBe(true);
		expect(ofType(run.events, "move_scored").length).toBeGreaterThan(5);
		// A first brain before game 1 and a new one after game 1, for each seat.
		expect(ofType(run.events, "brain_written")).toHaveLength(4);
	});

	it("briefs game 2 from a fresh context with the result of game 1 and the seat's own brain", async () => {
		const run = await playStory(options(), player);
		const resets = run.events.filter((event) => event.type === "turn_started").flatMap((event) => {
			const inputs: unknown = field(event, "inputs");
			return Array.isArray(inputs) ? inputs.filter((input): input is { kind: string; text: string } => typeof input === "object" && input !== null && Reflect.get(input, "kind") === "context-reset").map((input) => ({ resident: event.actor, text: input.text })) : [];
		});
		const second = resets.filter((reset) => reset.text.startsWith("Game 2 begins"));
		expect(second.length).toBeGreaterThan(0);
		for (const reset of second) {
			expect(reset.text).toContain("A01 (White) beat A02 (Black) by checkmate after 4 moves");
			expect(reset.text).toContain("Your strategy brain");
		}
	});

	it("plays a random legal move for a seat that does not move and ends the game on forfeits", async () => {
		const run = await playStory(options({ brain: false, games: 1 }), idleAgent);
		expect(run.end).toMatchObject({ reason: "referee", limit: "chess.match" });
		const forfeits = ofType(run.events, "move_played").filter((event) => field(event, "forfeit") === true);
		// White forfeits twice and Black twice; White's third forfeit loses the game.
		expect(forfeits).toHaveLength(4);
		expect(ofType(run.events, "game_ended").map((event) => [field(event, "result"), field(event, "reason"), field(event, "forfeits")])).toEqual([["0-1", "forfeits", { A01: 3, A02: 2 }]]);
	});

	it("stops a game at the move cap and scores it on material", async () => {
		const shuffle = ["Nf3", "Nf6", "Ng1", "Ng8"];
		const shuffler: TurnTaker = async (turn) => {
			const view = await turn.call("viewBoard", {});
			if (!view.ok) return;
			const ply = movesSoFar(view.reply);
			await turn.call("playMove", { move: ply === 0 ? "e4" : ply === 1 ? "d5" : ply === 2 ? "exd5" : (shuffle[(ply - 3) % 4] === "Nf3" ? "Nc3" : (shuffle[(ply - 3) % 4] ?? "")) });
		};
		const run = await playStory(options({ brain: false, games: 1, maxPlies: 6 }), shuffler);
		expect(ofType(run.events, "game_ended").map((event) => [field(event, "result"), field(event, "reason"), field(event, "plies")])).toEqual([["1/2-1/2", "move_cap", 6]]);
	});

	it("opens playMove only for the seat on move", async () => {
		const host = createHost(options({ brain: false, games: 1 }));
		host.start();
		expect(host.openTools("A01")).toContain("playMove");
		expect(host.openTools("A02")).not.toContain("playMove");
		expect(await host.call(as("A02"), "playMove", { move: "e5" })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(await host.call(as("A01"), "playMove", { move: "e2e4" })).toMatchObject({ ok: true });
		expect(host.openTools("A02")).toContain("playMove");
		const view = await host.call(as("A02"), "viewBoard", {});
		expect(view.ok && view.reply).toContain("Moves so far: 1. e4");
		expect(view.ok && view.reply).not.toContain("Legal moves:");
		expect(await host.call(as("A02"), "resign", {})).toMatchObject({ ok: true });
		expect(ofType(host.log.all(), "game_ended").map((event) => [field(event, "result"), field(event, "reason")])).toEqual([["1-0", "resignation"]]);
	});

	it("lists the legal moves in the position with showLegalMoves", async () => {
		const host = createHost(options({ brain: false, games: 1, showLegalMoves: true }));
		host.start();
		const view = await host.call(as("A01"), "viewBoard", {});
		expect(view.ok && view.reply).toContain("Legal moves: a3, a4,");
	});

	it("is registered with its arms and named variants", () => {
		for (const name of ["chess", "chess-nobrain", "chess-moves", "chess-teams", "chess-nobrain-moves-g4-p120", "chess-moves-teams-p60"]) expect(findCoreStory(name)?.story.id).toBe(name);
		expect(findCoreStory("chess-g0")).toBeUndefined();
	});

	it("is deterministic and survives a snapshot round trip inside a game and inside a retro window", async () => {
		expect(await checkDeterminism(options(), () => player)).toEqual([]);
		for (const cut of [0, 2, 5]) expect(await checkSnapshotRoundTrip(options(), () => player, cut)).toEqual([]);
	});
});

describe("chess teams", () => {
	/** Game 1 (team A White) is the four-move mate; the captain plays it, the advisor posts first. */
	const teamPlayer: TurnTaker = async (turn) => {
		const told = turn.inputs.map((note) => note.text).join("\n");
		if (told.includes("Retro after game") || told.includes("Before game 1")) {
			if (told.includes("You are the retro captain")) await turn.call("writeBrain", { text: `${turn.resident}: develop, guard f7, check every capture.` });
			else await turn.call("postTeam", { text: "keep it simple" });
			return;
		}
		const view = await turn.call("viewBoard", {});
		if (!view.ok) return;
		const game = Number(/Game (\d+) of/.exec(view.reply)?.[1]);
		const move = GAMES[game]?.[movesSoFar(view.reply)];
		if (move === undefined) return;
		if (told.includes("advise")) await turn.call("postTeam", { text: `play ${move}` });
		else await turn.call("playMove", { move });
	};

	it("rotates the captaincy move by move, lets the advisor post, and refuses a move by the advisor", async () => {
		const run = await playStory(options({ teams: true }), teamPlayer);
		expect(run.end).toMatchObject({ reason: "referee", limit: "chess.match" });
		const game1 = ofType(run.events, "move_played").filter((event) => field(event, "game") === 1);
		// White's captains alternate A01, A02; Black's A03, A04.
		expect(game1.map((event) => field(event, "by"))).toEqual(["A01", "A03", "A02", "A04", "A01", "A03", "A02"]);
		expect(ofType(run.events, "game_ended").map((event) => [field(event, "white"), field(event, "result")])).toEqual([
			["A", "1-0"],
			["B", "0-1"],
		]);
		expect(ofType(run.events, "match_ended").map((event) => field(event, "scores"))).toEqual([{ A: 2, B: 0 }]);
		expect(ofType(run.events, "team_post").length).toBeGreaterThan(5);

		const host = createHost(options({ teams: true, brain: false, games: 1 }));
		host.start();
		expect(await host.call(as("A02"), "playMove", { move: "e4" })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(await host.call(as("A01"), "playMove", { move: "e4" })).toMatchObject({ ok: true });
		const view = await host.call(as("A04"), "viewBoard", {});
		expect(view.ok && view.reply).toContain("White: team A (A01, A02). Black: team B (A03, A04). You play Black.");
		expect(view.ok && view.reply).toContain("Captain of this move: A03.");
	});
});

describe("the brain's replay check for text moves", () => {
	const line = [["e4", "e2e4"], ["e5", "e7e5"], ["Nf3", "g1f3"], ["Nc6", "b8c6"], ["Bb5", "f1b5"], ["a6", "a7a6"], ["Ba4", "b5a4"], ["Nf6", "g8f6"], ["O-O", "e1g1"]];
	it("refuses eight half-moves of a game in a row, in SAN or from-to, and passes an opening named in words", () => {
		expect(replaysLine("Play 1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 again.", line, 8)).toBe(true);
		expect(replaysLine("e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6", line, 8)).toBe(true);
		expect(replaysLine("The Ruy Lopez with 1. e4 e5 2. Nf3 Nc6 worked; castle early.", line, 8)).toBe(false);
		expect(replaysLine("e4 e5 Nf3 Nc6 Bb5 Nf6", line, 8)).toBe(false);
	});
});

describe("the engine reference (Stockfish, lab)", () => {
	it("scores a hanging queen as a blunder and the engine's own move as no loss", async () => {
		const moves = ["e4", "d6", "Qg4", "Bxg4"].map((san, index) => ({ ply: index + 1, colour: index % 2 === 0 ? ("white" as const) : ("black" as const), by: index % 2 === 0 ? "A01" : "A02", san, forfeit: false }));
		const plies = await analyseGame(moves, 6);
		expect(plies[2]).toMatchObject({ san: "Qg4", class: "blunder" });
		expect(plies[3]).toMatchObject({ san: "Bxg4", best: "Bxg4", loss: 0 });
		expect(classOf(120)).toBe("mistake");
	}, 30_000);
});
