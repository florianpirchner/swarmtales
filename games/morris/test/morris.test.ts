// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The game's part of the old `test/stories/morris-teams.test.ts`: a scripted match of two teams with mills,
 * removals, brains and scored turns; a match nobody plays; a single resident and a team of three against the search.
 * The refusals of the tools and the reply naming the search's answer are proven by the mechanic's own tests
 * (`mechanics/morris/test/`); the old checks of determinism and snapshots are the standing checks (`standing.test.ts`).
 */
import { idleDriver, play } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { morrisGame, type MorrisOptions } from "../game.ts";
import { field, morrisPlayer, ofType } from "./support.ts";

/** The shortened match of the old test: two games of at most 40 turns, the Referee at depth 2. */
const short = (extra: MorrisOptions = {}) => morrisGame({ games: 2, maxTurns: 40, refereeDepth: 2, ...extra });

describe("morris, scripted match", () => {
	it("plays two games with mills, removals, brains and scored turns", async () => {
		const run = await play(short(), { drivers: { resident: morrisPlayer } });
		expect(run.end).toMatchObject({ reason: "limit", limit: "morris.match" });
		expect(ofType(run.events, "game_started").map((event) => field(event, "startingSide"))).toEqual(["X", "O"]);
		expect(ofType(run.events, "game_ended")).toHaveLength(2);
		expect(ofType(run.events, "match_ended")).toHaveLength(1);
		expect(ofType(run.events, "consensus_forfeited")).toHaveLength(0);
		const moves = ofType(run.events, "move_played");
		expect(moves.some((event) => field(event, "kind") === "remove")).toBe(true);
		expect(moves.some((event) => field(event, "kind") === "move")).toBe(true);
		// Every mill is followed by a removal of the same side.
		moves.forEach((event, index) => {
			if (field(event, "mill") === true) expect(field(moves[index + 1] ?? event, "kind")).toBe("remove");
		});
		const scored = ofType(run.events, "move_scored");
		expect(scored.length).toBeGreaterThan(10);
		expect(scored.every((event) => JSON.stringify(event.audience) === JSON.stringify(["human"]))).toBe(true);
		const written = ofType(run.events, "brain_written");
		expect(written.map((event) => `${String(field(event, "game"))}${String(field(event, "team"))}`).sort()).toEqual(["0O", "0X", "1O", "1X"]);
	});

	it("marks a match nobody played as invalid after six forfeits in a row", async () => {
		const run = await play(short({ brain: false }), { drivers: { resident: idleDriver } });
		expect(ofType(run.events, "consensus_forfeited")).toHaveLength(6);
		expect(ofType(run.events, "match_ended").map((event) => field(event, "invalid"))).toEqual([true]);
		expect(ofType(run.events, "move_played").every((event) => field(event, "forfeit") === true)).toBe(true);
	});
});

describe("morris against the engine", () => {
	it("lets the search play side O at once, step and removal, with the resident on X only", async () => {
		const run = await play(short({ teamSize: 1, engineDepth: 2 }), { drivers: { resident: morrisPlayer } });
		expect(run.end).toMatchObject({ reason: "limit", limit: "morris.match" });
		expect(ofType(run.events, "game_ended")).toHaveLength(2);
		expect(ofType(run.events, "consensus_forfeited")).toHaveLength(0);
		const moves = ofType(run.events, "move_played");
		const engine = moves.filter((event) => field(event, "side") === "O");
		expect(engine.length).toBeGreaterThan(10);
		expect(engine.every((event) => field(event, "by") === "engine")).toBe(true);
		expect(moves.filter((event) => field(event, "side") === "X").every((event) => field(event, "by") === "A01")).toBe(true);
		// Game 2 starts with O: the engine places before the resident is ever on move.
		expect(moves.filter((event) => field(event, "game") === 2).map((event) => field(event, "side"))[0]).toBe("O");
	});

	it("plays a team of three against the engine", async () => {
		const run = await play(short({ engineDepth: 1, games: 1, maxTurns: 30 }), { drivers: { resident: morrisPlayer } });
		expect(ofType(run.events, "game_ended")).toHaveLength(1);
		expect(ofType(run.events, "consensus_forfeited")).toHaveLength(0);
		expect(new Set(ofType(run.events, "move_played").filter((event) => field(event, "side") === "X").map((event) => field(event, "by")))).toEqual(new Set(["A01", "A02", "A03"]));
	});
});
