// SPDX-License-Identifier: Apache-2.0
/**
 * Tic-tac-toe teams through the real mechanics: a scripted 3-game match, offline. Carried from
 * `test/stories/tictactoe-teams.test.ts`; the assertions on the old `turn_started` read `activation_opened`.
 */
import { checkDeterminism, checkSnapshotRoundTrip, idleDriver, play, testKernel } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { brainFor, field, goldenGame, ofType, resets, ticTacToePlayer } from "./support.ts";

const game = (brain = true) => goldenGame({ brain });
const drivers = () => ({ drivers: { resident: ticTacToePlayer() } });

describe("tictactoe-teams, scripted match", () => {
	it("plays three games with a brain written before game 1 and after games 1 and 2", async () => {
		const run = await play(game(), drivers());
		expect(run.end).toMatchObject({ reason: "limit", limit: "grid-game.match" });
		expect(ofType(run.events, "game_ended").map((event) => field(event, "result"))).toEqual(["X", "draw", "O"]);
		expect(ofType(run.events, "match_ended").map((event) => event.payload)).toEqual([{ tally: { X: 1, O: 1, draw: 1 } }]);
		expect(ofType(run.events, "consensus_forfeited")).toHaveLength(0);

		const written = ofType(run.events, "brain_written");
		// The retro captain rotates by game; the two teams write in the same window, in either order.
		const key = (event: (typeof written)[number]): string => `${String(field(event, "game"))}${String(field(event, "team"))} v${String(field(event, "version"))} ${String(field(event, "author"))}`;
		expect(written.map(key).sort()).toEqual(["0O v1 A04", "0X v1 A01", "1O v2 A05", "1X v2 A02", "2O v3 A06", "2X v3 A03"].sort());
		for (const event of written) {
			expect(field(event, "words")).toBeGreaterThan(5);
			expect(field(event, "hash")).toMatch(/^[0-9a-f]{14}$/);
			expect(event.audience).toEqual(["human"]);
		}
		expect(written.map((event) => field(event, "text"))).toContain(brainFor("X", 1));
		// The replay of game 1's moves was refused once, at the rule stage.
		const refused = ofType(run.events, "tool_refused").filter((event) => field(event, "as") === "writeBrain");
		expect(refused.map((event) => field(event, "code"))).toEqual(["BRAIN_REPLAY", "BRAIN_REPLAY"]);
		expect(refused.map((event) => field(event, "stage"))).toEqual(["rule", "rule"]);
		expect(ofType(run.events, "retro_closed").map((event) => field(event, "reason"))).toEqual(Array(6).fill("written"));
	});

	it("marks a match nobody played as invalid after 4 forfeits in a row and ends the run", async () => {
		const run = await play(game(false));
		expect(ofType(run.events, "consensus_forfeited")).toHaveLength(4);
		expect(ofType(run.events, "match_invalid").map((event) => field(event, "forfeits"))).toEqual([4]);
		// The captain of the turn is told once per turn and tick, so a silent one is asked again (P410).
		const told = ofType(run.events, "activation_opened").filter((event) => JSON.stringify(field(event, "inputs")).includes("is on move"));
		expect(told.length).toBeGreaterThanOrEqual(4 * 3);
		expect(new Set(told.map((event) => `${String(event.tick)}:${String(field(event, "actor"))}`)).size).toBe(told.length);
		expect(ofType(run.events, "match_ended").map((event) => field(event, "invalid"))).toEqual([true]);
		expect(run.end).toMatchObject({ reason: "limit", limit: "grid-game.match" });
		expect(await checkDeterminism(game(false), () => idleDriver)).toEqual([]);
		expect(await checkSnapshotRoundTrip(game(false), () => idleDriver, 5)).toEqual([]);
	});

	it("holds each game back until both retro windows are closed, and the last game has no retro", async () => {
		const run = await play(game(), drivers());
		const order = run.events.filter((event) => ["game_started", "game_ended", "retro_started", "retro_closed"].includes(event.type)).map((event) => `${event.type}:${String(field(event, "game"))}`);
		expect(order).toEqual([
			"retro_started:0", "retro_started:0", "retro_closed:0", "retro_closed:0", "game_started:1",
			"game_ended:1", "retro_started:1", "retro_started:1", "retro_closed:1", "retro_closed:1", "game_started:2",
			"game_ended:2", "retro_started:2", "retro_started:2", "retro_closed:2", "retro_closed:2", "game_started:3",
			"game_ended:3",
		]);
	});

	it("resets every resident's context at each game start with result-only briefings", async () => {
		const run = await play(game(), drivers());
		const shown = resets(run.events);
		expect(shown.length).toBeGreaterThanOrEqual(6);
		const third = shown.filter((reset) => reset.text.startsWith("Game 3 begins"));
		expect(third.length).toBeGreaterThan(0);
		for (const reset of third) {
			expect(reset.text).toContain("game 1: X won; game 2: draw");
			expect(reset.text).toContain("version 3");
			expect(reset.text).not.toMatch(/0, 3, 1|0 3 1 4 2/);
		}
	});

	it("gives the control arm the same briefings without a brain", async () => {
		const run = await play(game(false), drivers());
		expect(ofType(run.events, "brain_written")).toHaveLength(0);
		expect(ofType(run.events, "retro_started")).toHaveLength(0);
		expect(ofType(run.events, "game_ended")).toHaveLength(3);
		const test = testKernel(game(false));
		expect(test.openTools("A01")).not.toContain("writeBrain");
		// The old test read the tool list of the grant; here the call of a tool that is not in the grant is refused.
		expect(await test.call("A01", "readBrain", {})).toMatchObject({ ok: false, code: "TOOL_NOT_GRANTED" });
	});

	it("marks the moves the move timer plays for a silent team as forfeits", async () => {
		const idle = await play(game(false));
		const moves = ofType(idle.events, "move_played");
		expect(moves.length).toBeGreaterThan(0);
		expect(moves.every((event) => field(event, "forfeit") === true)).toBe(true);
		expect(moves).toHaveLength(ofType(idle.events, "consensus_forfeited").length);
		const played = await play(game(), drivers());
		expect(ofType(played.events, "move_played").every((event) => field(event, "forfeit") === false)).toBe(true);
	});

	it("is deterministic and survives a snapshot round trip between games and inside a retro window", async () => {
		expect(await checkDeterminism(game(), ticTacToePlayer)).toEqual([]);
		// The old cut after 9 ticks came after the end of the run (8 ticks) and resumed nothing; 7 is the last tick that is resumed.
		for (const cut of [1, 4, 7]) expect(await checkSnapshotRoundTrip(game(), ticTacToePlayer, cut)).toEqual([]);
	});
});
