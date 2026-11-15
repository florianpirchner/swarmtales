// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The chess mechanic: its rules through chess.js, a scripted match, the forfeit clock, the cap, the views and its conformance (offline). Ported from the old `test/stories/chess.test.ts`. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkDeterminism, checkOptionsDocumented, checkPackage, checkResumeEveryBoundary, checkSnapshotRoundTrip, fakeDriver, idleDriver, play, testKernel } from "@swarmtales/testkit";
import { nameOf, type ActorDriver, type Envelope } from "@swarmtales/contracts";
import { chess } from "../src/index.ts";
import { adjudicate, parseMove, replay, scoreMove } from "../src/model.ts";
import { chessGame, field, movesSoFar, ofType, playerOf } from "./support.ts";

const player = playerOf();
const players = { drivers: { resident: player } };
const replyOf = (outcome: { readonly ok: boolean; readonly reply?: string }): string => (outcome.ok ? (outcome.reply ?? "") : "");
const detailOf = (outcome: { readonly ok: boolean; readonly detail?: string }): string => (outcome.ok ? "" : (outcome.detail ?? ""));
// The context-reset lines of the activations, as `<actor>: <text>`.
const resetsOf = (events: readonly Envelope[]): string[] =>
	events.filter((event) => event.type === "activation_opened").flatMap((event) => {
		const inputs = field(event, "inputs");
		const lines: unknown[] = Array.isArray(inputs) ? inputs : [];
		return lines.flatMap((line) => (typeof line === "object" && line !== null && Reflect.get(line, "kind") === "context-reset" ? [`${event.actor}: ${String(Reflect.get(line, "text"))}`] : []));
	});

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

	it("credits the side to move with the capture still open at the cap (LH17)", () => {
		// Black's queen grabs a2 on the last half-move (a pawn up on the count); White's rook takes it back at once.
		const hanging = replay(["e4", "d5", "exd5", "Qxd5", "Nc3", "Qa5", "d4", "Qxa2"]);
		expect(adjudicate(hanging, 1)).toBe("0-1");
		expect(adjudicate(hanging, 1, true)).toBe("1-0");
		// Nothing open: settling changes nothing.
		expect(adjudicate(replay(["e4", "e5"]), 1, true)).toBe("1/2-1/2");
	});
});

describe("chess, scripted match", () => {
	it("plays two games with alternating colours and ends on mate", async () => {
		const run = await play(chessGame(), players);
		expect(run.end).toMatchObject({ reason: "limit", limit: "chess.match" });
		const ended = ofType(run.events, "game_ended");
		expect(ended.map((event) => [field(event, "white"), field(event, "result"), field(event, "reason"), field(event, "plies")])).toEqual([
			["A01", "1-0", "checkmate", 7],
			["A02", "0-1", "checkmate", 4],
		]);
		expect(ended.map((event) => String(field(event, "pgn")))[1]).toContain("2. g4 Qh4#");
		expect(ofType(run.events, "match_ended").map((event) => field(event, "scores"))).toEqual([{ A01: 2, A02: 0 }]);
		expect(run.kernel.fact("chess.scores")).toEqual({ A01: 2, A02: 0 });
		// The baseline's verdicts are for the human only.
		const scored = ofType(run.events, "move_scored");
		expect(scored.length).toBeGreaterThan(5);
		expect(scored.every((event) => JSON.stringify(event.audience) === JSON.stringify(["human"]))).toBe(true);
		// A first brain before game 1 and a new one after game 1, for each seat.
		expect(run.events.filter((event) => event.type === "brain_written")).toHaveLength(4);
		// Game 2 is briefed from a fresh context with the result of game 1.
		const second = resetsOf(run.events).filter((line) => line.includes("Game 2 begins"));
		expect(second.length).toBeGreaterThan(0);
		for (const line of second) expect(line).toContain("A01 (White) beat A02 (Black) by checkmate after 4 moves");
	});

	it("plays a random legal move for a seat that does not move and ends the game on forfeits", async () => {
		const run = await play(chessGame({ brain: false, games: 1 }), { drivers: { resident: idleDriver } });
		expect(run.end).toMatchObject({ reason: "limit", limit: "chess.match" });
		const forfeits = ofType(run.events, "move_played").filter((event) => field(event, "forfeit") === true);
		// White forfeits twice and Black twice; White's third forfeit loses the game.
		expect(forfeits).toHaveLength(4);
		expect(forfeits.every((event) => event.actor === "kernel" && run.events[event.seq]?.type !== "activation_opened")).toBe(true);
		expect(ofType(run.events, "game_ended").map((event) => [field(event, "result"), field(event, "reason"), field(event, "forfeits")])).toEqual([["0-1", "forfeits", { A01: 3, A02: 2 }]]);
	});

	it("stops a game at the move cap and scores it on material", async () => {
		const shuffle = ["Nc3", "Nf6", "Ng1", "Ng8"];
		const shuffler: ActorDriver = async (turn) => {
			const view = await turn.call("viewBoard", {});
			const ply = movesSoFar(replyOf(view));
			await turn.call("playMove", { move: ["e4", "d5", "exd5"][ply] ?? shuffle[(ply - 3) % 4] ?? "" });
		};
		const run = await play(chessGame({ brain: false, games: 1, maxPlies: 6 }), { drivers: { resident: shuffler } });
		expect(ofType(run.events, "game_ended").map((event) => [field(event, "result"), field(event, "reason"), field(event, "plies")])).toEqual([["1/2-1/2", "move_cap", 6]]);
	});

	it("opens playMove only for the seat on move, refuses what chess.js does not read, and takes a resignation", async () => {
		const test = testKernel(chessGame({ brain: false, games: 1 }));
		expect(test.openTools("A01")).toContain("playMove");
		expect(test.openTools("A02")).not.toContain("playMove");
		expect(await test.call("A02", "playMove", { move: "e5" })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(await test.call("A01", "playMove", { move: "xyz" })).toMatchObject({ ok: false, code: "ILLEGAL_MOVE" });
		// Without the legal list, a refusal names only the moves of the piece the text names: never the whole list.
		expect(detailOf(await test.call("A01", "playMove", { move: "Ke2" }))).toContain("That piece has no legal move now.");
		expect(detailOf(await test.call("A01", "playMove", { move: "g1e2" }))).toContain("Legal moves of that piece: Nf3, Nh3.");
		expect(await test.call("A01", "playMove", { move: "e2e4" })).toEqual({ ok: true, reply: "e4 played. Now it is your opponent's move; end your turn.", endsTurn: true });
		expect(test.openTools("A02")).toContain("playMove");
		const view = replyOf(await test.call("A02", "viewBoard", {}));
		expect(view).toContain("Moves so far: 1. e4");
		expect(view).not.toContain("Legal moves:");
		expect(await test.call("A02", "resign", {})).toEqual({ ok: true, reply: "You resigned game 1.", endsTurn: true });
		const log = test.kernel.log.all();
		expect(ofType(log, "move_refused").map((event) => [field(event, "written"), field(event, "count"), event.audience])).toEqual([["xyz", 1, ["human"]], ["Ke2", 2, ["human"]], ["g1e2", 3, ["human"]]]);
		expect(ofType(log, "game_ended").map((event) => [field(event, "result"), field(event, "reason"), field(event, "illegal"), field(event, "resigned")])).toEqual([["1-0", "resignation", { A01: 3 }, "A02"]]);
	});
});

describe("the fresh context and the compact board", () => {
	it("drops the mover's context on every half-move, with the rules, the brain and its last note", async () => {
		const run = await play(chessGame({ fresh: true, games: 1 }), { drivers: { resident: playerOf((move) => `plan after ${move}`) } });
		const mover = resetsOf(run.events).filter((line) => line.includes("fresh mind"));
		expect(mover.length).toBeGreaterThan(2);
		expect(mover.every((line) => line.includes("Standard chess rules"))).toBe(true);
		expect(mover.some((line) => line.includes("A01: develop the pieces"))).toBe(true);
		expect(mover.some((line) => line.includes("Your note with your last move (1. e4): plan after e4"))).toBe(true);
	});

	it("shows the compact grid and only the last half-moves", async () => {
		const test = testKernel(chessGame({ compact: true, brain: false }));
		const line = ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6", "O-O", "Be7", "Re1", "b5", "Bb3", "d6"];
		for (const [index, move] of line.entries()) expect((await test.call(index % 2 === 0 ? "A01" : "A02", "playMove", { move })).ok).toBe(true);
		const text = replyOf(await test.call("A01", "viewBoard", {}));
		expect(text).toContain("8 r.bqk..r");
		expect(text).toContain("1 RNBQR.K.");
		expect(text).toContain("Last moves (14 half-moves played): 2. Nf3 Nc6 3. Bb5");
		expect(text).not.toContain("1. e4");
	});
});

describe("mechanic conformance", () => {
	it("fits its package, and documents every option", () => {
		const packageJson: unknown = JSON.parse(readFileSync(join(import.meta.dirname, "..", "package.json"), "utf8"));
		expect(checkPackage(chess, packageJson)).toEqual([]);
		expect(checkOptionsDocumented(chess)).toEqual([]);
	});

	it("gives the fake driver a legal move for the seat on move and a resignation once its game is lost, so a fake match ends", async () => {
		const run = await play(chessGame({ brain: false, games: 2 }), { seed: 7, drivers: (kernel) => ({ resident: fakeDriver(kernel, 7) }) });
		expect(run.end).toMatchObject({ reason: "limit", limit: "chess.match" });
		const moves = ofType(run.events, "move_played");
		expect(moves.length).toBeGreaterThan(10);
		expect(moves.every((event) => field(event, "forfeit") === false)).toBe(true);
		expect(ofType(run.events, "game_ended").map((event) => field(event, "reason"))).toContain("resignation");
		// Only the seat on move is woken in a solo match, and it has a move to play: a fake run never looks at the board.
		expect([...new Set(run.events.filter((event) => event.type === "tool_called").map((event) => field(event, "as")))].sort()).toEqual(["playMove", "resign"]);
		expect(run.events.filter((event) => event.type === "tool_refused")).toEqual([]);
	});

	it("is deterministic, and a run resumed from a snapshot plays on as the whole run", async () => {
		expect(await checkDeterminism(chessGame(), () => player)).toEqual([]);
		for (const cut of [0, 1, 3]) expect(await checkSnapshotRoundTrip(chessGame(), () => player, cut)).toEqual([]);
		// Silent seats: the cut falls inside the forfeit clock.
		expect(await checkSnapshotRoundTrip(chessGame({ brain: false, games: 1 }), () => idleDriver, 1)).toEqual([]);
	});

	it("resumes with the refused moves in the order of the first refusal, Black's before White's (A43)", async () => {
		// A02 (Black) tries an illegal king move at ply 1, A01 (White) at ply 4 and waits two minutes before its mate, so a
		// boundary falls between the refusals and `game_ended`, whose `illegal` is { A02, A01 } and not sorted.
		const sloppy: ActorDriver = async (turn) => {
			const who = nameOf(turn.actor);
			if (!/Retro|Before game 1/.test(turn.inputs.map((note) => note.text).join("\n"))) {
				const view = await turn.call("viewBoard", {});
				const plies = view.ok ? movesSoFar(view.reply) : -1;
				if (who === "A01" && plies === 6 && turn.tick < 3) return;
				if ((who === "A02" && plies === 1) || (who === "A01" && plies === 4)) await turn.call("playMove", { move: "Ke7", reason: "try" });
			}
			await player(turn);
		};
		const run = await play(chessGame({ games: 1 }), { drivers: { resident: sloppy } });
		expect(ofType(run.events, "game_ended").map((event) => [event.tick, JSON.stringify(field(event, "illegal"))])).toEqual([[4, '{"A02":1,"A01":1}']]);
		expect(await checkResumeEveryBoundary(chessGame({ games: 1 }), () => ({ resident: sloppy }), {})).toEqual([]);
	});
});
