// SPDX-License-Identifier: Apache-2.0
/**
 * The chess mechanic's variants: the legal-move lists, the threats, the coach and the teams with the advisor's wake
 * (`wakeTeam`, the `told` list). `NOT_CAPTAIN` stays as carried and has no test: as on the old platform, the game locks
 * `playMove` and `resign` for all but the captain of the move, so a call of the advisor is refused at the stage
 * `lock` (`TOOL_LOCKED`) before the check runs (`oracles/chess/README.md`). Ported from the old
 * `test/stories/chess.test.ts` ("lists the legal moves", "lists each side's loose pieces", "gives each seat a private
 * coach's review", "chess teams"), offline.
 */
import { describe, expect, it } from "vitest";
import { nameOf, type ActorDriver, type Envelope } from "@swarmtales/contracts";
import { checkDeterminism, checkSnapshotRoundTrip, fakeDriver, play, testKernel } from "@swarmtales/testkit";
import { loosePieces, replay } from "../src/model.ts";
import { chessGame, field, GAMES, movesSoFar, ofType, playerOf } from "./support.ts";

const replyOf = (outcome: { readonly ok: boolean; readonly reply?: string }): string => (outcome.ok ? (outcome.reply ?? "") : "");

// The texts of the input lines of each activation, as `<actor>: <text>`.
const inputsOf = (events: readonly Envelope[]): string[] =>
	events.filter((event) => event.type === "activation_opened").flatMap((event) => {
		const inputs = field(event, "inputs");
		const lines: unknown[] = Array.isArray(inputs) ? inputs : [];
		return lines.map((line) => `${nameOf(event.actor)}: ${typeof line === "object" && line !== null ? String(Reflect.get(line, "text")) : String(line)}`);
	});

// Each request to advise, as `<actor> [game,ply]`: the half-move it was asked for.
function adviceOf(events: readonly Envelope[]): string[] {
	let at = "";
	const asked: string[] = [];
	for (const event of events) {
		if (event.type === "move_played" || event.type === "game_started") at = JSON.stringify([field(event, "game"), field(event, "ply") ?? 0]);
		if (event.type === "activation_opened" && inputsOf([event]).some((line) => line.includes("advise"))) asked.push(`${nameOf(event.actor)} ${at}`);
	}
	return asked;
}

describe("the legal-move list and the threats", () => {
	it("names loose pieces: undefended, or attacked by a cheaper piece, most valuable first", () => {
		// 1. e4 e5 2. Qh5 Nc6 3. Qxe5+?? : the queen on e5 is attacked by the knight on c6 (and defended by nothing).
		const position = replay(["e4", "e5", "Qh5", "Nc6", "Qxe5+"]);
		expect(loosePieces(position, "w")).toEqual(["queen e5 (attacked by knight c6, undefended)"]);
		// The knight on c6 is attacked by the queen but defended by two pawns, so it is not loose.
		expect(loosePieces(position, "b")).toEqual([]);
		expect(loosePieces(replay([]), "w")).toEqual([]);
	});

	it("lists the legal moves in the position of the seat on move with showLegalMoves, and every legal move with a refusal", async () => {
		const test = testKernel(chessGame({ brain: false, games: 1, moves: true }));
		expect(replyOf(await test.call("A01", "viewBoard", {}))).toContain("Legal moves: a3, a4,");
		expect(replyOf(await test.call("A02", "viewBoard", {}))).not.toContain("Legal moves:");
		const refused = await test.call("A01", "playMove", { move: "Ke2" });
		expect(refused.ok ? "" : (refused.detail ?? "")).toContain("Legal moves: a3, a4,");
	});

	it("lists each side's loose pieces with showThreats", async () => {
		const test = testKernel(chessGame({ brain: false, games: 1, threats: true }));
		await test.call("A01", "playMove", { move: "e4" });
		await test.call("A02", "playMove", { move: "d5" });
		const view = replyOf(await test.call("A01", "viewBoard", {}));
		expect(view).toContain("Loose pieces");
		expect(view).toContain("White: pawn e4 (attacked by pawn d5, undefended).");
		// d5 is defended by the queen on d8, and a pawn is the cheapest attacker: not loose.
		expect(view).toContain("Black: none.");
	});
});

describe("the coach", () => {
	it("gives each seat a private review of its worst moves in the retro after a game, but not after the last", async () => {
		const run = await play(chessGame({ coach: true }), { drivers: { resident: playerOf() } });
		const reviews = ofType(run.events, "coach_review");
		expect(reviews.map((event) => [field(event, "game"), field(event, "side"), event.audience])).toEqual([
			[1, "A01", ["human"]],
			[1, "A02", ["human"]],
		]);
		// Game 1 (the four-move mate): the one-ply material check sees no material lost; it does not see a mate threat such as 3...Nf6 allowing 4. Qxf7#.
		for (const event of reviews) expect(String(field(event, "text"))).toMatch(/^Coach: none of your [34] moves lost material/);
		const retro = inputsOf(run.events).filter((line) => line.includes("A review of the game you just played"));
		expect(retro.map((line) => line.split(":")[0]).sort()).toEqual(["A01", "A02"]);
		for (const line of retro) expect(line).toContain("Coach: none of your");
		expect(await checkDeterminism(chessGame({ coach: true }), () => playerOf())).toEqual([]);
		expect(await checkSnapshotRoundTrip(chessGame({ coach: true }), () => playerOf(), 3)).toEqual([]);
	});
});

/** Game 1 (team A White) is the four-move mate; the captain plays it, the advisor posts first. */
const teamPlayer: ActorDriver = async (turn) => {
	const told = turn.inputs.map((note) => note.text).join("\n");
	if (told.includes("Retro after game") || told.includes("Before game 1")) {
		if (told.includes("You are the retro captain")) await turn.call("writeBrain", { text: `${nameOf(turn.actor)}: develop, guard f7, check every capture.` });
		else await turn.call("postTeam", { text: "keep it simple" });
		return;
	}
	const view = await turn.call("viewBoard", {});
	if (!view.ok) return;
	const move = GAMES[Number(/Game (\d+) of/.exec(view.reply)?.[1])]?.[movesSoFar(view.reply)];
	if (move === undefined) return;
	if (told.includes("advise")) await turn.call("postTeam", { text: `play ${move}` });
	else await turn.call("playMove", { move });
};

describe("chess teams", () => {
	it("rotates the captaincy move by move, wakes the advisor once per half-move and lets it post", async () => {
		const run = await play(chessGame({ teams: true }), { drivers: { resident: teamPlayer } });
		expect(run.end).toMatchObject({ reason: "limit", limit: "chess.match" });
		const game1 = ofType(run.events, "move_played").filter((event) => field(event, "game") === 1);
		// White's captains alternate A01, A02; Black's A03, A04.
		expect(game1.map((event) => field(event, "by"))).toEqual(["A01", "A03", "A02", "A04", "A01", "A03", "A02"]);
		expect(ofType(run.events, "game_ended").map((event) => [field(event, "white"), field(event, "result")])).toEqual([
			["A", "1-0"],
			["B", "0-1"],
		]);
		expect(ofType(run.events, "match_ended").map((event) => field(event, "scores"))).toEqual([{ A: 2, B: 0 }]);
		expect(run.events.filter((event) => event.type === "team_post").length).toBeGreaterThan(5);
		// The `told` list: an advisor is asked to advise at most once per half-move, with the position.
		const advice = adviceOf(run.events);
		expect(advice.length).toBeGreaterThan(3);
		expect(new Set(advice).size).toBe(advice.length);
	});

	it("shows the sides and the captain, and locks the advisor's move", async () => {
		const test = testKernel(chessGame({ teams: true, brain: false, games: 1 }));
		expect(await test.call("A02", "playMove", { move: "e4" })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(await test.call("A01", "playMove", { move: "e4" })).toMatchObject({ ok: true });
		const view = replyOf(await test.call("A04", "viewBoard", {}));
		expect(view).toContain("White: team A (A01, A02). Black: team B (A03, A04). You play Black.");
		expect(view).toContain("Captain of this move: A03.");
	});

	it("is played to its end by the fake driver, the advisor looking at the board", async () => {
		const run = await play(chessGame({ teams: true, brain: false, games: 1, maxPlies: 40 }), { seed: 7, drivers: (kernel) => ({ resident: fakeDriver(kernel, 7) }) });
		expect(run.end).toMatchObject({ reason: "limit", limit: "chess.match" });
		const tools = new Set(run.events.filter((event) => event.type === "tool_result").map((event) => event.tool?.split("/").at(-1)));
		expect(tools.has("viewBoard") && tools.has("playMove")).toBe(true);
	});

	it("is deterministic, and a run resumed from a snapshot plays on as the whole run", async () => {
		expect(await checkDeterminism(chessGame({ teams: true }), () => teamPlayer)).toEqual([]);
		for (const cut of [1, 3]) expect(await checkSnapshotRoundTrip(chessGame({ teams: true }), () => teamPlayer, cut)).toEqual([]);
	});
});
