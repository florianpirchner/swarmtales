// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The grid-game mechanic: captains, refusals, the match and its conformance (offline, scripted players). Carried from
 * `test/mechanics/grid-game/grid-game.test.ts`; "the board rules" are in `rules.test.ts`.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { ConsensusSourceService } from "@swarmtales/mechanic-contracts";
import { defineHead, defineMechanic, reply } from "@swarmtales/sdk";
import { play, testKernel } from "@swarmtales/testkit";
import { GridGameService } from "../src/contract.ts";
import { gridGame } from "../src/index.ts";
import { field, matchGame, ofType, scriptedPlayer } from "./support.ts";

const players = { drivers: { resident: scriptedPlayer() } };

describe("a match", () => {
	it("plays win, draw and win, alternating the starting side, and ends the run", async () => {
		const run = await play(matchGame(), players);
		expect(run.end).toMatchObject({ reason: "limit", limit: "grid-game.match" });
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
		expect(run.kernel.fact("grid-game.tally")).toEqual({ X: 1, O: 1, draw: 1 });
	});

	it("rotates the captain through the team, one move each", async () => {
		const run = await play(matchGame(), players);
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
		const run = await play(matchGame({ fixedCaptain: true }), players);
		const moves = ofType(run.events, "move_played");
		expect(moves.length).toBeGreaterThan(5);
		expect(new Set(moves.filter((event) => field(event, "side") === "X").map((event) => field(event, "by")))).toEqual(new Set(["A01"]));
		expect(new Set(moves.filter((event) => field(event, "side") === "O").map((event) => field(event, "by")))).toEqual(new Set(["A03"]));
	});

	it("keeps X as the starting side when alternateStart is off", async () => {
		const run = await play(matchGame({ alternateStart: false, games: 2 }), players);
		expect(ofType(run.events, "game_started").map((event) => field(event, "startingSide"))).toEqual(["X", "X"]);
	});

	it("splits the residents in half when no teams are given", () => {
		const test = testKernel({ ...matchGame(), mechanics: [gridGame({ games: 1 })] });
		expect(ofType(test.kernel.log.all(), "game_started").map((event) => event.payload)).toEqual([{ game: 1, startingSide: "X", xTeam: ["A01", "A02"], oTeam: ["A03", "A04"] }]);
	});

	it("rejects teams that are not residents or overlap", () => {
		expect(() => testKernel(matchGame({ teams: { X: ["A01"], O: ["A99"] } }))).toThrow(/A99/);
		expect(() => testKernel(matchGame({ teams: { X: ["A01", "A02"], O: ["A02"] } }))).toThrow(/one team only/);
		expect(() => testKernel(matchGame({ line: 4 }))).toThrow(/does not fit/);
	});
});

describe("playMove", () => {
	it("is open for the captain of the turn only and refuses bad cells", async () => {
		const test = testKernel(matchGame());
		const move = (resident: string, cell: number) => test.call(resident, "playMove", { cell });
		expect(test.openTools("A01")).toContain("playMove");
		expect(test.openTools("A02")).not.toContain("playMove");
		expect(test.openTools("A03")).not.toContain("playMove");

		// A teammate and the opponent's captain are refused; the board does not change.
		expect(await move("A02", 0)).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(await move("A03", 0)).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(test.fact("grid-game.captain")).toBe("A01");

		expect(await move("A01", 9)).toMatchObject({ ok: false, code: "OUT_OF_RANGE" });
		expect(await move("A01", 0)).toMatchObject({ ok: true });

		// The turn passed: A01 is locked, the O captain A03 is open and may not take a taken cell.
		expect(await move("A01", 1)).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(test.openTools("A03")).toContain("playMove");
		expect(await move("A03", 0)).toMatchObject({ ok: false, code: "CELL_TAKEN" });
		expect(await move("A03", 4)).toMatchObject({ ok: true });
		expect(test.fact("grid-game.captain")).toBe("A02");
		expect(ofType(test.kernel.log.all(), "move_played")).toHaveLength(2);
	});

	it("still refuses a wrong captain at the rule stage when another mechanic unlocks the tool", async () => {
		// A mechanic names its own tools only (`ctx.access` joins its own source), so the stand-in takes a package and an
		// id whose source plus the tool name spell the grid game's canonical `playMove` (see the report of M1-33).
		const meddler = defineMechanic(defineHead({ id: "mechanic-grid-game", package: "@swarmtales", summary: "Test: opens playMove for a non-captain." }), {
			hooks: {
				runStarted: (ctx) => {
					ctx.access.unlock("A02", "grid-game/playMove");
				},
			},
		});
		const test = testKernel(matchGame({}, [meddler()]));
		expect(test.openTools("A02")).toContain("playMove");
		expect(await test.call("A02", "playMove", { cell: 0 })).toMatchObject({ ok: false, code: "NOT_CAPTAIN" });
		expect(ofType(test.kernel.log.all(), "move_played")).toHaveLength(0);
	});

	it("lets every resident read the board", async () => {
		const view = await testKernel(matchGame()).call("A04", "viewBoard", {});
		expect(view).toMatchObject({ ok: true });
		expect(view.ok ? view.reply : "").toContain("Game 1. Side to move: X. Captain of the turn: A01.");
	});

	it("refuses moves once the match is over", async () => {
		// The old test called after the run's end; a kernel that ended takes no call, so the one game is played by hand.
		const test = testKernel(matchGame({ games: 1 }));
		for (const [resident, cell] of [["A01", 0], ["A03", 3], ["A02", 1], ["A04", 4], ["A01", 2]] as const) expect(await test.call(resident, "playMove", { cell })).toMatchObject({ ok: true });
		expect(ofType(test.kernel.log.all(), "match_ended")).toHaveLength(1);
		for (const resident of ["A01", "A02", "A03", "A04"]) {
			expect(await test.call(resident, "playMove", { cell: 8 })).toMatchObject({ ok: false });
		}
	});
});

describe("the grid-game service", () => {
	const probe = defineMechanic(defineHead({ id: "probe", package: "@test/probe", summary: "Test: reads the grid-game service.", requires: [GridGameService] }), {
		facts: {
			view: {
				output: Type.Object({
					side: Type.Union([Type.String(), Type.Null()]),
					captain: Type.Union([Type.String(), Type.Null()]),
					board: Type.Array(Type.String()),
					game: Type.Integer(),
					size: Type.Integer(),
				}),
				compute: (view) => ({
					side: view.call(GridGameService, "side", {}),
					captain: view.call(GridGameService, "captain", {}),
					board: view.call(GridGameService, "board", {}),
					game: view.call(GridGameService, "game", {}),
					size: view.call(GridGameService, "rules", {}).size,
				}),
			},
		},
	});

	it("tells side, captain, board and game", async () => {
		const test = testKernel(matchGame({}, [probe()]));
		expect(test.fact("probe.view")).toEqual({ side: "X", captain: "A01", board: Array.from({ length: 9 }, () => "."), game: 1, size: 3 });
		await test.call("A01", "playMove", { cell: 4 });
		expect(test.fact("probe.view")).toEqual({ side: "O", captain: "A03", board: [".", ".", ".", ".", "X", ".", ".", ".", "."], game: 1, size: 3 });
	});
});

describe("the consensus source", () => {
	// The old tool was granted to an actor `script`; a game has residents only, so a resident calls it.
	const forfeiter = defineMechanic(
		defineHead({
			id: "forfeiter",
			package: "@test/forfeiter",
			summary: "Test: forfeits a move.",
			requires: [ConsensusSourceService],
			tools: { forfeit: { description: "Test: forfeits a move.", params: Type.Object({ cell: Type.Integer() }), for: ["resident"] } },
		}),
		{
			tools: {
				forfeit: {
					run: (params, ctx) => {
						const team = ctx.call(ConsensusSourceService, "team", {});
						const captain = ctx.call(ConsensusSourceService, "captain", {});
						const legal = ctx.call(ConsensusSourceService, "legalCells", {});
						const played = ctx.call(ConsensusSourceService, "playForfeit", { cell: params.cell });
						return reply(JSON.stringify({ team, captain, legal: legal.length, played }));
					},
				},
			},
		},
	);

	it("names the team on move and plays a forfeit that switches the side", async () => {
		const test = testKernel(matchGame({}, [forfeiter()]));
		const first = await test.call("A04", "forfeit", { cell: 4 });
		expect(first).toEqual({ ok: true, reply: JSON.stringify({ team: "X", captain: "A01", legal: 9, played: true }) });
		expect(test.fact("grid-game.captain")).toBe("A03");
		const again = await test.call("A04", "forfeit", { cell: 4 });
		expect(again).toEqual({ ok: true, reply: JSON.stringify({ team: "O", captain: "A03", legal: 8, played: false }) });
	});
});

describe("module conformance", () => {
	// M1-30 builds `checkOptionsDocumented`, `checkDeterminism`, `checkSnapshotRoundTrip` and `checkPackage` in
	// parallel; the integrator swaps the two hand-written checks below for them and adds the other two.
	it("has prompt files for its tool descriptions", () => {
		const specs = testKernel(matchGame()).kernel.toolSpecs("resident");
		expect(specs.map((spec) => spec.name).sort()).toEqual(["playMove", "viewBoard"]);
		for (const spec of specs) expect(spec.description).not.toMatch(/^grid-game\//);
	});

	it("gives the same events for the same seed", async () => {
		expect((await play(matchGame(), players)).events).toEqual((await play(matchGame(), players)).events);
	});

	it("survives a snapshot round trip in the middle of a game and between games", async () => {
		const straight = await play(matchGame(), players);
		for (const cut of [2, 4]) {
			const first = await play(matchGame(), { ...players, ticks: cut });
			const resumed = await play(matchGame(), { ...players, resume: { snapshot: structuredClone(first.kernel.snapshot()), log: first.events } });
			expect(resumed.events).toEqual(straight.events);
		}
	});
});
