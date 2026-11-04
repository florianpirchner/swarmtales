/** The tic-tac-toe teams story through the real mechanics: a scripted 3-game match, offline (docs/ideas/tictactoe-teams.md §10). */
import { describe, expect, it } from "vitest";
import { createHost } from "@swarmtales/kernel";
import { createPromptLookup } from "@swarmtales/prompts";
import { checkDeterminism, checkSnapshotRoundTrip, idleAgent, playStory } from "@swarmtales/testkit";
import { brainFor, field, goldenStory, ofType, ticTacToePlayer } from "./tictactoe-support.ts";

const options = (brain = true) => ({ story: goldenStory({ brain }), prompts: createPromptLookup() });

describe("tictactoe-teams, scripted match", () => {
	it("plays three games with a brain written before game 1 and after games 1 and 2", async () => {
		const run = await playStory(options(), ticTacToePlayer());
		expect(run.end).toMatchObject({ reason: "referee", limit: "grid-game.match" });
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
		const refused = ofType(run.events, "tool_refused").filter((event) => field(event, "tool") === "writeBrain");
		expect(refused.map((event) => field(event, "code"))).toEqual(["BRAIN_REPLAY", "BRAIN_REPLAY"]);
		expect(ofType(run.events, "retro_closed").map((event) => field(event, "reason"))).toEqual(Array(6).fill("written"));
	});

	it("marks a match nobody played as invalid after 4 forfeits in a row and ends the run", async () => {
		const run = await playStory(options(false), idleAgent);
		expect(ofType(run.events, "consensus_forfeited")).toHaveLength(4);
		expect(ofType(run.events, "match_invalid").map((event) => field(event, "forfeits"))).toEqual([4]);
		expect(ofType(run.events, "match_ended").map((event) => field(event, "invalid"))).toEqual([true]);
		expect(run.end).toMatchObject({ reason: "referee", limit: "grid-game.match" });
		const make = () => options(false);
		expect(await checkDeterminism(make, () => idleAgent)).toEqual([]);
		expect(await checkSnapshotRoundTrip(make, () => idleAgent, 5)).toEqual([]);
	});

	it("holds each game back until both retro windows are closed, and the last game has no retro", async () => {
		const run = await playStory(options(), ticTacToePlayer());
		const order = run.events.filter((event) => ["game_started", "game_ended", "retro_started", "retro_closed"].includes(event.type)).map((event) => `${event.type}:${String(field(event, "game"))}`);
		expect(order).toEqual([
			"retro_started:0", "retro_started:0", "retro_closed:0", "retro_closed:0", "game_started:1",
			"game_ended:1", "retro_started:1", "retro_started:1", "retro_closed:1", "retro_closed:1", "game_started:2",
			"game_ended:2", "retro_started:2", "retro_started:2", "retro_closed:2", "retro_closed:2", "game_started:3",
			"game_ended:3",
		]);
	});

	it("resets every resident's context at each game start with result-only briefings", async () => {
		const run = await playStory(options(), ticTacToePlayer());
		const resets = run.events.filter((event) => event.type === "turn_started").flatMap((event) => {
			const inputs: unknown = field(event, "inputs");
			return Array.isArray(inputs) ? inputs.filter((input): input is { kind: string; text: string } => typeof input === "object" && input !== null && Reflect.get(input, "kind") === "context-reset").map((input) => ({ resident: event.actor, text: input.text })) : [];
		});
		expect(resets.length).toBeGreaterThanOrEqual(6);
		const third = resets.filter((reset) => reset.text.startsWith("Game 3 begins"));
		expect(third.length).toBeGreaterThan(0);
		for (const reset of third) {
			expect(reset.text).toContain("game 1: X won; game 2: draw");
			expect(reset.text).toContain("version 3");
			expect(reset.text).not.toMatch(/0, 3, 1|0 3 1 4 2/);
		}
	});

	it("gives the control arm the same briefings without a brain", async () => {
		const run = await playStory(options(false), ticTacToePlayer());
		expect(ofType(run.events, "brain_written")).toHaveLength(0);
		expect(ofType(run.events, "retro_started")).toHaveLength(0);
		expect(ofType(run.events, "game_ended")).toHaveLength(3);
		const host = createHost(options(false));
		host.start();
		expect(host.openTools("A01")).not.toContain("writeBrain");
		expect(host.toolSpecs("resident").map((spec) => spec.name)).not.toContain("readBrain");
	});

	it("marks the moves the move timer plays for a silent team as forfeits", async () => {
		const idle = await playStory(options(false), idleAgent);
		const moves = ofType(idle.events, "move_played");
		expect(moves.length).toBeGreaterThan(0);
		expect(moves.every((event) => field(event, "forfeit") === true)).toBe(true);
		expect(moves).toHaveLength(ofType(idle.events, "consensus_forfeited").length);
		const played = await playStory(options(), ticTacToePlayer());
		expect(ofType(played.events, "move_played").every((event) => field(event, "forfeit") === false)).toBe(true);
	});

	it("is deterministic and survives a snapshot round trip between games and inside a retro window", async () => {
		expect(await checkDeterminism(options(), ticTacToePlayer)).toEqual([]);
		for (const cut of [1, 4, 9]) expect(await checkSnapshotRoundTrip(options(), ticTacToePlayer, cut)).toEqual([]);
	});
});
