// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Lanterns as a game: the parts of `test/stories/lanterns.test.ts` that the port of the mechanic left to the game
 * (the scripted match under the game's own retro focus, a fresh context per game with the team's brain), and the
 * control arm without a brain.
 */
import { play } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { field, ofType, player, resets, rosterGame, shown } from "./support.ts";

const players = { drivers: { resident: player } };

describe("lanterns, scripted match", () => {
	it("plays four games with a rotating keeper and a brain per team, and its retro asks for conventions (P195)", async () => {
		const run = await play(rosterGame(), players);
		expect(run.end).toMatchObject({ reason: "limit", limit: "clue-grid.match" });
		expect(ofType(run.events, "clue_game_started").map((event) => field(event, "keepers"))).toEqual([
			{ amber: "A01", teal: "A04" },
			{ amber: "A02", teal: "A05" },
			{ amber: "A03", teal: "A06" },
			{ amber: "A01", teal: "A04" },
		]);
		expect(ofType(run.events, "clue_game_ended")).toHaveLength(4);
		expect(ofType(run.events, "brain_written")).toHaveLength(8);
		const retro = shown(run.events).find((text) => text.includes("Retro after game 1"));
		expect(retro).toContain("conventions");
		expect(retro).toContain("Do not write general caution");
		expect(ofType(run.events, "clue_match_ended").map((event) => field(event, "scores"))).toEqual([run.kernel.fact("clue-grid.scores")]);
	});

	it("starts every game from a fresh context with the rules, the role and the team's brain", async () => {
		const run = await play(rosterGame(), players);
		const second = resets(run.events).filter((reset) => reset.text.startsWith("Game 2 begins"));
		expect(second.length).toBeGreaterThan(0);
		for (const reset of second) expect(reset.text).toContain("strategy brain (version 2");
	});

	it("without a brain plays the same match with no retro and no brain", async () => {
		const run = await play(rosterGame({ brain: false }), players);
		expect(run.end).toMatchObject({ reason: "limit", limit: "clue-grid.match" });
		expect(ofType(run.events, "clue_game_ended")).toHaveLength(4);
		expect([ofType(run.events, "retro_started"), ofType(run.events, "brain_written")]).toEqual([[], []]);
		expect(resets(run.events).some((reset) => reset.text.includes("strategy brain"))).toBe(false);
	});
});
