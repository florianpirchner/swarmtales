// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The morris mechanic where no oracle file reaches (`oracles/morris-teams/README.md`: a fixed captain, the turn
 * limit, the engine as X) and what is new with the port: the `sample` functions for the fake driver, and a snapshot.
 */
import type { ToolOutcome } from "@swarmtales/contracts";
import { defineGame, type Game } from "@swarmtales/sdk";
import { fakeDriver, play, testKernel } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { morris } from "../src/index.ts";
import { field, morrisGame, ofType } from "./support.ts";

/** The reply of an accepted call, or the code and the text of a refusal. */
const textOf = (outcome: ToolOutcome): string => (outcome.ok ? outcome.reply : `${outcome.code}: ${outcome.detail ?? ""}`);

const FOUR = { X: ["A01", "A02"], O: ["A03", "A04"] };

/** The mechanic alone: no gate, no chat, no brain. */
function bare(residents: readonly string[], options: Parameters<typeof morris>[0] = {}): Game {
	return defineGame({ id: "morris-test", seed: 7, residents: [...residents], mechanics: [morris({ games: 1, ...options })], locked: ["playMove"], scheduler: { id: "turns", options: { passes: 2, activation: "onNews", order: "roster" } }, end: { ticks: 60 } });
}

describe("the teams", () => {
	it("refuses teams that do not fit the residents or the engine", () => {
		expect(() => testKernel(bare(["A01", "A02"], { teams: { X: ["A01"], O: ["A99"] } }))).toThrow(/A99 is not a resident/);
		expect(() => testKernel(bare(["A01", "A02"], { teams: { X: ["A01", "A02"], O: ["A02"] } }))).toThrow(/one team only/);
		expect(() => testKernel(bare(["A01", "A02"], { teams: { X: ["A01", "A02"], O: [] } }))).toThrow(/at least one resident/);
		expect(() => testKernel(bare(["A01", "A02"], { teams: { X: ["A01"], O: ["A02"] }, engine: { side: "O", depth: 1, maxNodes: 1000 } }))).toThrow(/team O must have no residents/);
	});

	it("keeps the captain for the removal after a mill, then rotates; a fixed captain never rotates", async () => {
		const test = testKernel(bare(["A01", "A02", "A03", "A04"], { teams: FOUR }));
		for (const [resident, move] of [["A01", 1], ["A03", 10], ["A02", 2], ["A04", 11]] as const) expect(await test.call(resident, "playMove", { move })).toMatchObject({ ok: true });
		expect(textOf(await test.call("A01", "playMove", { move: 3 }))).toBe("Played place on 3. Mill! Your team now removes one O piece: agree on its point (one of 10, 11) and play it as the next move.");
		expect(test.fact("morris.captain")).toBe("A01");
		expect(await test.call("A01", "playMove", { move: 5 })).toMatchObject({ ok: false, code: "ILLEGAL_REMOVAL" });
		expect(await test.call("A01", "playMove", { move: 10 })).toEqual({ ok: true, reply: "Removed the O piece on 10. O to move; captain A03." });
		expect(textOf(await test.call("A03", "playMove", { move: 1011 }))).toBe("ILLEGAL_MOVE: 10 to 11 is not legal now; you are placing: the move number is a free point (1-24). viewBoard lists the legal moves.");
		expect(ofType(test.kernel.log.all(), "move_played").map((event) => [field(event, "by"), field(event, "kind"), field(event, "turnNo")]).slice(-2)).toEqual([["A01", "place", 5], ["A01", "remove", 5]]);

		const fixed = testKernel(bare(["A01", "A02", "A03", "A04"], { teams: FOUR, fixedCaptain: true }));
		for (const [resident, move] of [["A01", 1], ["A03", 10], ["A01", 2]] as const) expect(await fixed.call(resident, "playMove", { move })).toMatchObject({ ok: true });
		expect(fixed.fact("morris.captain")).toBe("A03");
	});
});

describe("the end of a game", () => {
	it("is a draw at the turn limit, which ends the match and the run", async () => {
		const test = testKernel(bare(["A01", "A02"], { maxTurns: 2 }));
		await test.call("A01", "playMove", { move: 1 });
		expect(await test.call("A02", "playMove", { move: 2 })).toEqual({ ok: true, reply: "Played place on 2. Game 1 is over: draw (the turn limit) after 2 turns." });
		expect(ofType(test.kernel.log.all(), "game_ended").map((event) => event.payload)).toEqual([{ game: 1, result: "draw", reason: "turn_limit", turns: 2, pieces: { X: 9, O: 9 }, moves: [1, 2] }]);
		expect(test.fact("morris.tally")).toEqual({ X: 0, O: 0, draw: 1 });
		expect(await test.playTicks(() => Promise.resolve(), 1)).toMatchObject({ reason: "limit", limit: "morris.match" });
	});
});

describe("the engine", () => {
	it("as X plays the first turn of game 1 before any resident, and answers each move in its reply", async () => {
		const test = testKernel(bare(["A01"], { engine: { side: "X", depth: 2, maxNodes: 200_000 } }));
		const first = ofType(test.kernel.log.all(), "move_played");
		expect(first.map((event) => [field(event, "side"), field(event, "by"), field(event, "turnNo")])).toEqual([["X", "engine", 1]]);
		expect(test.fact("morris.captain")).toBe("A01");
		expect(textOf(await test.call("A01", "viewBoard", {}))).toContain("X team: the engine (a computer program). O team: A01.");
		const free = [1, 2, 3].find((point) => first.every((event) => field(event, "to") !== point));
		expect(textOf(await test.call("A01", "playMove", { move: free }))).toMatch(/^Played place on \d\. The engine \(X\): Played place on \d+\. O to move; captain A01\.$/);
	});
});

describe("the fake driver and the snapshot", () => {
	const game = morrisGame({ games: 2, maxTurns: 14, seed: 7 });
	const fake = { seed: 7, drivers: (kernel: Parameters<typeof fakeDriver>[0]) => ({ resident: fakeDriver(kernel, 7) }) };

	it("plays the match of two teams of three to its end, every played move the agreed one", async () => {
		const { end, events } = await play(game, fake);
		expect(end).toMatchObject({ reason: "limit", limit: "morris.match" });
		const accepted = events.filter((event) => event.type === "tool_result").map((event) => event.tool?.split("/").at(-1));
		for (const tool of ["viewBoard", "playMove"]) expect(accepted.filter((name) => name === tool).length, tool).toBeGreaterThan(0);
		const moves = ofType(events, "move_played");
		expect(moves.filter((event) => field(event, "forfeit") === false)).toHaveLength(accepted.filter((name) => name === "playMove").length);
		expect([...new Set(events.filter((event) => event.type === "tool_refused" && event.tool?.endsWith("/playMove")).map((event) => field(event, "code")))].filter((code) => code !== "STEP_LIMIT")).toEqual([]);
	});

	it("resumes from a snapshot in the middle of a game as the straight run went on", async () => {
		const straight = await play(game, fake);
		const first = await play(game, { ...fake, ticks: 5 });
		expect(ofType(first.events, "move_played").length).toBeGreaterThan(0);
		const resumed = await play(game, { ...fake, resume: { snapshot: structuredClone(first.kernel.snapshot()), log: first.events } });
		expect(resumed.events).toEqual(straight.events);
	});
});
