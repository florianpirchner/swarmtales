/** The grid-game mechanic: rules, captains, refusals, the match and its conformance (offline, scripted players). */
import { readFileSync } from "node:fs";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import type { EventEnvelope } from "@swarmtales/contracts";
import { createHost, defineMechanic, reply } from "@swarmtales/kernel";
import { ConsensusSourceApi } from "@swarmtales/mechanic-consensus";
import { GridGameApi, gridGame, linesOf, winnerOf, type Cell } from "@swarmtales/mechanic-grid-game";
import { createPromptLookup } from "@swarmtales/prompts";
import { checkDeterminism, checkOptionsDocumented, checkSnapshotRoundTrip, checkSourceRules, playStory } from "@swarmtales/testkit";
import { renderBoard } from "../../../mechanics/grid-game/src/model.ts";
import { field, hostOptions, matchStory, scriptedPlayer } from "./support.ts";

const ofType = (events: readonly EventEnvelope[], type: string): readonly EventEnvelope[] => events.filter((event) => event.source === "grid-game" && event.type === type);

describe("the board rules", () => {
	it("finds rows, columns and both diagonals", () => {
		const board = (text: string): Cell[] => Array.from(text, (c): Cell => (c === "X" || c === "O" ? c : "."));
		const lines = linesOf(3, 3);
		expect(lines).toHaveLength(8);
		expect(winnerOf(board("XXX......"), lines)).toEqual({ side: "X", cells: [0, 1, 2] });
		expect(winnerOf(board("O..O..O.."), lines)).toEqual({ side: "O", cells: [0, 3, 6] });
		expect(winnerOf(board("..X.X.X.."), lines)?.cells).toEqual([2, 4, 6]);
		expect(winnerOf(board("XOXOXOOXO"), lines)).toBeUndefined();
	});

	it("shows every cell as its mark plus its number, so a taken cell keeps its number", () => {
		const board: Cell[] = [".", ".", "X", ".", "O", ".", ".", ".", "."];
		expect(renderBoard(board, 3)).toBe(" 0  1 X2\n 3 O4  5\n 6  7  8");
		expect(renderBoard(Array.from({ length: 16 }, (_, index) => (index === 10 ? "X" : ".")), 4)).toBe("  0   1   2   3\n  4   5   6   7\n  8   9 X10  11\n 12  13  14  15");
	});

	it("supports other board sizes and line lengths", () => {
		const lines = linesOf(4, 3);
		expect(lines).toHaveLength(2 * 4 * 2 + 2 * 2 * 2);
		const board = (Array.from({ length: 16 }, (): Cell => ".")).map((cell, index): Cell => (index === 1 || index === 6 || index === 11 ? "O" : cell));
		expect(winnerOf(board, lines)).toEqual({ side: "O", cells: [1, 6, 11] });
	});
});

describe("a match", () => {
	it("plays win, draw and win, alternating the starting side, and ends the run", async () => {
		const run = await playStory(hostOptions(), scriptedPlayer());
		expect(run.end).toMatchObject({ reason: "referee", limit: "grid-game.match" });
		const started = ofType(run.events, "game_started").map((event) => event.payload);
		expect(started).toEqual([
			{ game: 1, startingSide: "X", xTeam: ["A01", "A02"], oTeam: ["A03", "A04"] },
			{ game: 2, startingSide: "O", xTeam: ["A01", "A02"], oTeam: ["A03", "A04"] },
			{ game: 3, startingSide: "X", xTeam: ["A01", "A02"], oTeam: ["A03", "A04"] },
		]);
		expect(ofType(run.events, "game_ended").map((event) => event.payload)).toEqual([
			{ game: 1, result: "X", winLine: [0, 1, 2], moves: [0, 3, 1, 4, 2] },
			{ game: 2, result: "draw", moves: [0, 1, 2, 4, 3, 5, 7, 6, 8] },
			{ game: 3, result: "O", winLine: [3, 4, 5], moves: [0, 3, 1, 4, 8, 5] },
		]);
		expect(ofType(run.events, "match_ended").map((event) => event.payload)).toEqual([{ tally: { X: 1, O: 1, draw: 1 } }]);
		expect(run.host.facts()["grid-game.tally"]).toEqual({ X: 1, O: 1, draw: 1 });
	});

	it("rotates the captain through the team, one move each", async () => {
		const run = await playStory(hostOptions(), scriptedPlayer());
		const firstGame = ofType(run.events, "move_played").filter((event) => field(event, "game") === 1);
		expect(firstGame.map((event) => event.payload)).toEqual([
			{ game: 1, side: "X", by: "A01", cell: 0, moveNo: 1, forfeit: false },
			{ game: 1, side: "O", by: "A03", cell: 3, moveNo: 2, forfeit: false },
			{ game: 1, side: "X", by: "A02", cell: 1, moveNo: 3, forfeit: false },
			{ game: 1, side: "O", by: "A04", cell: 4, moveNo: 4, forfeit: false },
			{ game: 1, side: "X", by: "A01", cell: 2, moveNo: 5, forfeit: false },
		]);
	});

	it("keeps the same captain for the whole match with fixedCaptain", async () => {
		const run = await playStory(hostOptions(matchStory({ fixedCaptain: true })), scriptedPlayer());
		const moves = ofType(run.events, "move_played");
		expect(moves.length).toBeGreaterThan(5);
		expect(new Set(moves.filter((event) => field(event, "side") === "X").map((event) => field(event, "by")))).toEqual(new Set(["A01"]));
		expect(new Set(moves.filter((event) => field(event, "side") === "O").map((event) => field(event, "by")))).toEqual(new Set(["A03"]));
	});

	it("keeps X as the starting side when alternateStart is off", async () => {
		const run = await playStory(hostOptions(matchStory({ alternateStart: false, games: 2 })), scriptedPlayer());
		expect(ofType(run.events, "game_started").map((event) => field(event, "startingSide"))).toEqual(["X", "X"]);
	});

	it("splits the residents in half when no teams are given", () => {
		const host = createHost(hostOptions({ ...matchStory(), mechanics: [gridGame.with({ games: 1 })] }));
		host.start();
		expect(ofType(host.log.all(), "game_started").map((event) => event.payload)).toEqual([{ game: 1, startingSide: "X", xTeam: ["A01", "A02"], oTeam: ["A03", "A04"] }]);
	});

	it("rejects teams that are not residents or overlap", () => {
		expect(() => createHost(hostOptions(matchStory({ teams: { X: ["A01"], O: ["A99"] } })))).toThrow(/A99/);
		expect(() => createHost(hostOptions(matchStory({ teams: { X: ["A01", "A02"], O: ["A02"] } })))).toThrow(/one team only/);
		expect(() => createHost(hostOptions(matchStory({ line: 4 })))).toThrow(/does not fit/);
	});
});

describe("playMove", () => {
	it("is open for the captain of the turn only and refuses bad cells", async () => {
		const host = createHost(hostOptions());
		host.start();
		const play = (resident: string, cell: number) => host.call(`resident:${resident}`, "playMove", { cell });
		expect(host.openTools("A01")).toContain("playMove");
		expect(host.openTools("A02")).not.toContain("playMove");
		expect(host.openTools("A03")).not.toContain("playMove");

		// A teammate and the opponent's captain are refused; the board does not change.
		expect(await play("A02", 0)).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(await play("A03", 0)).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(host.fact("grid-game.captain")).toBe("A01");

		expect(await play("A01", 9)).toMatchObject({ ok: false, code: "OUT_OF_RANGE" });
		expect(await play("A01", 0)).toMatchObject({ ok: true });

		// The turn passed: A01 is locked, the O captain A03 is open and may not take a taken cell.
		expect(await play("A01", 1)).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(host.openTools("A03")).toContain("playMove");
		expect(await play("A03", 0)).toMatchObject({ ok: false, code: "CELL_TAKEN" });
		expect(await play("A03", 4)).toMatchObject({ ok: true });
		expect(host.fact("grid-game.captain")).toBe("A02");
		expect(ofType(host.log.all(), "move_played")).toHaveLength(2);
	});

	it("still refuses a wrong captain at the rule stage when another mechanic unlocks the tool", async () => {
		const meddler = defineMechanic(
			{ id: "meddler", summary: "Test: opens playMove for a non-captain.", options: Type.Object({}), state: () => undefined, events: {} },
			() => ({ hooks: { runStarted: (ctx) => { ctx.access.unlock("A02", "playMove"); } } }),
		);
		const host = createHost(hostOptions(matchStory({}, [meddler.with()])));
		host.start();
		expect(await host.call("resident:A02", "playMove", { cell: 0 })).toMatchObject({ ok: false, code: "NOT_CAPTAIN" });
		expect(ofType(host.log.all(), "move_played")).toHaveLength(0);
	});

	it("lets every resident read the board", async () => {
		const host = createHost(hostOptions());
		host.start();
		const view = await host.call("resident:A04", "viewBoard", {});
		expect(view).toMatchObject({ ok: true });
		expect(view.ok ? view.reply : "").toContain("Game 1. Side to move: X. Captain of the turn: A01.");
	});

	it("refuses moves once the match is over", async () => {
		const run = await playStory(hostOptions(), scriptedPlayer());
		for (const resident of ["A01", "A02", "A03", "A04"]) {
			expect(await run.host.call(`resident:${resident}`, "playMove", { cell: 0 })).toMatchObject({ ok: false });
		}
	});
});

describe("the grid-game API", () => {
	const probe = defineMechanic(
		{
			id: "probe",
			summary: "Test: reads the grid-game API.",
			options: Type.Object({}),
			state: () => undefined,
			events: {},
			requires: [GridGameApi],
		},
		(kit) => ({
			facts: {
				view: kit.fact(
					Type.Object({
						side: Type.Union([Type.String(), Type.Null()]),
						captain: Type.Union([Type.String(), Type.Null()]),
						board: Type.Array(Type.String()),
						game: Type.Integer(),
						size: Type.Integer(),
					}),
					(view) => ({
						side: view.call(GridGameApi, "side", {}),
						captain: view.call(GridGameApi, "captain", {}),
						board: view.call(GridGameApi, "board", {}),
						game: view.call(GridGameApi, "game", {}),
						size: view.call(GridGameApi, "rules", {}).size,
					}),
				),
			},
		}),
	);

	it("tells side, captain, board and game", async () => {
		const host = createHost(hostOptions(matchStory({}, [probe.with()])));
		host.start();
		expect(host.fact("probe.view")).toEqual({ side: "X", captain: "A01", board: Array.from({ length: 9 }, () => "."), game: 1, size: 3 });
		await host.call("resident:A01", "playMove", { cell: 4 });
		expect(host.fact("probe.view")).toEqual({ side: "O", captain: "A03", board: [".", ".", ".", ".", "X", ".", ".", ".", "."], game: 1, size: 3 });
	});
});

describe("the consensus source", () => {
	const forfeiter = defineMechanic(
		{ id: "forfeiter", summary: "Test: forfeits a move.", options: Type.Object({}), state: () => undefined, events: {}, requires: [ConsensusSourceApi], prompts: { forfeit: [] } },
		(kit) => ({
			tools: [
				kit.tool({
					name: "forfeit",
					description: "forfeit",
					parameters: Type.Object({ cell: Type.Integer() }),
					suggest: ["script"],
					execute: (params, ctx) => {
						const team = ctx.call(ConsensusSourceApi, "team", {});
						const captain = ctx.call(ConsensusSourceApi, "captain", {});
						const legal = ctx.call(ConsensusSourceApi, "legalCells", {});
						const played = ctx.call(ConsensusSourceApi, "playForfeit", { cell: params.cell });
						return reply(JSON.stringify({ team, captain, legal: legal.length, played }));
					},
				}),
			],
		}),
	);

	it("names the team on move and plays a forfeit that switches the side", async () => {
		const host = createHost(hostOptions(matchStory({}, [forfeiter.with()])));
		host.start();
		const first = await host.call("script", "forfeit", { cell: 4 });
		expect(first).toEqual({ ok: true, reply: JSON.stringify({ team: "X", captain: "A01", legal: 9, played: true }) });
		expect(host.fact("grid-game.captain")).toBe("A03");
		const again = await host.call("script", "forfeit", { cell: 4 });
		expect(again).toEqual({ ok: true, reply: JSON.stringify({ team: "O", captain: "A03", legal: 8, played: false }) });
	});
});

describe("module conformance", () => {
	it("documents every option and takes randomness and time only from the host", () => {
		expect(checkOptionsDocumented(gridGame)).toEqual([]);
		const files = ["index", "model", "events", "api"].map((name) => ({ path: `mechanics/grid-game/src/${name}.ts`, text: readFileSync(`mechanics/grid-game/src/${name}.ts`, "utf8") }));
		expect(checkSourceRules(files)).toEqual([]);
	});

	it("has prompt files for its tool descriptions", () => {
		const host = createHost({ ...hostOptions(), prompts: createPromptLookup() });
		expect(host.toolSpecs("resident").map((spec) => spec.name).sort()).toEqual(["playMove", "viewBoard"]);
		for (const spec of host.toolSpecs("resident")) expect(spec.description).not.toMatch(/^grid-game\//);
	});

	it("gives the same events for the same seed", async () => {
		expect(await checkDeterminism(hostOptions(), () => scriptedPlayer())).toEqual([]);
	});

	it("survives a snapshot round trip in the middle of a game and between games", async () => {
		expect(await checkSnapshotRoundTrip(hostOptions(), () => scriptedPlayer(), 2)).toEqual([]);
		expect(await checkSnapshotRoundTrip(hostOptions(), () => scriptedPlayer(), 4)).toEqual([]);
	});
});
