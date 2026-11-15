// SPDX-License-Identifier: Apache-2.0
/**
 * The morris-referee mechanic: the classes of a turn on known tactical positions, the events it writes and who may
 * read them, and its own copy of the position across a snapshot. The first part is carried from
 * `test/mechanics/morris-referee/morris-referee.test.ts`, as far as the contract of `morris` reaches (`scoreTurn`,
 * `classify`); the two cases on `bestTurns` and `evaluate` are the search's own and are not reachable from here.
 */
import type { Envelope } from "@swarmtales/contracts";
import { morris } from "@swarmtales/mechanic-morris";
import { classify, scoreTurn } from "@swarmtales/mechanic-morris/contract";
import { emptyBoard, type Cell, type Position } from "@swarmtales/mechanic-morris/rules";
import { checkOptionsDocumented, play, testKernel } from "@swarmtales/testkit";
import { defineGame } from "@swarmtales/sdk";
import { describe, expect, it } from "vitest";
import { morrisReferee } from "../src/index.ts";
import { field, scoredGame } from "./support.ts";

function at(x: readonly number[], o: readonly number[], side: "X" | "O", inHand: { X: number; O: number }): Position {
	const board: Cell[] = emptyBoard();
	for (const point of x) board[point - 1] = "X";
	for (const point of o) board[point - 1] = "O";
	return { board, side, inHand };
}

describe("the morris reference search", () => {
	it("calls closing a mill best and passing it up a missed mill", () => {
		// X holds 1 and 2 with 3 free; O holds 22 and 24 with 23 free.
		const position = at([1, 2], [22, 24], "X", { X: 7, O: 7 });
		const close = scoreTurn(position, { to: 2, remove: 21 }, true, 2, 200_000);
		expect(close === undefined ? undefined : classify(close)).toBe("best");
		const elsewhere = scoreTurn(position, { to: 10 }, true, 2, 200_000);
		expect(elsewhere?.missedMill).toBe(true);
		expect(["inaccuracy", "blunder"]).toContain(elsewhere === undefined ? undefined : classify(elsewhere));
		// Not blocking O's open two and not closing its own mill loses a piece: a blunder.
		const blunder = scoreTurn(position, { to: 5 }, true, 2, 200_000);
		expect(blunder === undefined ? undefined : classify(blunder)).toBe("blunder");
	});

	it("finds the winning removal when the opponent is down to three pieces", () => {
		// Moving phase: X closes 1-2-3 by 5 to 2; O has three pieces, so any removal wins.
		const position = at([1, 3, 5, 9], [10, 22, 24], "X", { X: 0, O: 0 });
		const win = scoreTurn(position, { from: 4, to: 1, remove: 9 }, true, 2, 200_000);
		expect(win?.best).toBeGreaterThan(50_000);
		expect(win === undefined ? undefined : classify(win)).toBe("best");
		const miss = scoreTurn(position, { from: 8, to: 7 }, true, 2, 200_000);
		expect(miss === undefined ? undefined : classify(miss)).toBe("missed_win");
	});

	it("scores nothing for an illegal or a forced turn, and stops deepening when out of nodes", () => {
		expect(scoreTurn(at([1, 2], [22, 24], "X", { X: 7, O: 7 }), { to: 0 }, true, 2, 200_000)).toBeUndefined();
		const shallow = scoreTurn(at([], [], "X", { X: 9, O: 9 }), { to: 4 }, true, 6, 1_000);
		expect(shallow?.depth).toBe(2);
	});

	it("documents its options", () => {
		expect(checkOptionsDocumented(morrisReferee)).toEqual([]);
	});
});

describe("the mechanic in a match", () => {
	const SOURCE = "@swarmtales/mechanic-morris-referee/morris-referee";
	// Nobody acts: the move timer plays a random legal move for the resident, and the search answers.
	const game = () => scoredGame({ games: 1, brain: false, teamSize: 1, engineDepth: 1, maxTurns: 30, referee: { depth: 1 } });
	const scoredOf = (events: readonly Envelope[]) => events.filter((event) => event.source === SOURCE);

	it("writes move_scored and nothing else, once per whole turn at most, for the human only", async () => {
		const own = scoredOf((await play(game())).events);
		expect(own.length).toBeGreaterThan(10);
		expect(new Set(own.map((event) => event.type))).toEqual(new Set(["move_scored"]));
		expect(own.every((event) => JSON.stringify(event.audience) === JSON.stringify(["human"]))).toBe(true);
		const turns = own.map((event) => String(field(event, "turnNo")));
		expect(new Set(turns).size).toBe(turns.length);
		expect(own.every((event) => field(event, "depth") === 1)).toBe(true);
	});

	it("gives nobody a tool", () => {
		const test = testKernel(game());
		expect(test.kernel.toolSpecs("resident").map((spec) => spec.name).sort()).toEqual(["castVote", "playMove", "postTeam", "proposeMove", "readTeam", "viewBoard"]);
		expect(test.kernel.toolSpecs("gamemaker")).toEqual([]);
	});

	it("is deterministic and resumes from a snapshot in the middle of a game", async () => {
		const straight = await play(game());
		expect((await play(game())).events).toEqual(straight.events);
		const first = await play(game(), { ticks: 12 });
		expect(scoredOf(first.events).length).toBeGreaterThan(0);
		const resumed = await play(game(), { resume: { snapshot: structuredClone(first.kernel.snapshot()), log: first.events } });
		expect(resumed.events).toEqual(straight.events);
	});
});

describe("the referee's own copy of the position", () => {
	// The mechanic and its referee alone: no gate, so a captain plays at once.
	const bare = () => defineGame({ id: "morris-referee-test", seed: 7, residents: ["A01", "A02"], mechanics: [morris({ games: 1, teams: { X: ["A01"], O: ["A02"] } }), morrisReferee({ depth: 2 })], scheduler: { id: "turns", options: { passes: 2, activation: "onNews", order: "roster" } }, end: { ticks: 60 } });
	const MILL = [["A01", 1], ["A02", 10], ["A01", 2], ["A02", 11], ["A01", 3]] as const;
	const slice = (kernel: ReturnType<typeof testKernel>["kernel"]) => kernel.snapshot().plugins["morris-referee"]?.data;

	it("scores a step that closes a mill with its removal, as one turn, also across a snapshot", async () => {
		const test = testKernel(bare());
		for (const [resident, move] of MILL) expect(await test.call(resident, "playMove", { move })).toMatchObject({ ok: true });
		// The mill is closed and the removal is owed: turn 5 is not scored yet, and the step waits in the state.
		expect(test.kernel.log.all().filter((event) => event.type === "move_scored").map((event) => field(event, "turnNo"))).toEqual([1, 2, 3, 4]);
		expect(slice(test.kernel)).toMatchObject({ game: 1, side: "X", inHand: { X: 6, O: 7 }, pending: { side: "X", inHand: { X: 7, O: 7 }, to: 2 } });
		const snapshot = structuredClone(test.kernel.snapshot());
		const resumed = testKernel(bare(), { resume: { snapshot, log: test.kernel.log.all() } });
		for (const kernel of [test, resumed]) {
			expect(await kernel.call("A01", "playMove", { move: 10 })).toMatchObject({ ok: true });
			expect(kernel.kernel.log.all().filter((event) => event.type === "move_scored").at(-1)?.payload).toEqual({ game: 1, turnNo: 5, side: "X", class: "best", best: 76, played: 76, depth: 2, alternatives: 21, missedMill: false });
			const after = slice(kernel.kernel);
			expect(after).toMatchObject({ side: "O", inHand: { X: 6, O: 7 } });
			expect(after).not.toHaveProperty("pending");
		}
	});
});
