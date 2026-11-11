/** A team of three against one agent alone (`soloSide`): the head-to-head test of what a team adds, played offline by script. */
import { describe, expect, it } from "vitest";
import { createHost } from "@swarmtales/kernel";
import { createPromptLookup } from "@swarmtales/prompts";
import { playStory } from "@swarmtales/testkit";
import { findCoreStory } from "../../stories/index.ts";
import { field, goldenStory, ofType, ticTacToePlayer } from "./tictactoe-support.ts";

const options = () => ({ story: goldenStory({ brain: false, soloSide: "O" }), prompts: createPromptLookup() });

describe("tictactoe-teams, a team against one agent alone", () => {
	it("plays a scripted match: the lone side agrees with itself and moves", async () => {
		const run = await playStory(options(), ticTacToePlayer());
		expect(run.end).toMatchObject({ reason: "referee", limit: "grid-game.match" });
		expect(ofType(run.events, "game_ended")).toHaveLength(3);
		expect(ofType(run.events, "consensus_forfeited")).toHaveLength(0);
		const players = new Set(ofType(run.events, "move_played").map((event) => field(event, "by")));
		expect(players.has("A04")).toBe(true);
		expect(players.has("A05") || players.has("A06")).toBe(false);
	});

	it("resolves -solo-o and -solo-x by name with the right rosters and briefings", () => {
		const host = createHost(options());
		const loneO = findCoreStory("tictactoe-teams-5x5-nobrain-r6-solo-o");
		const loneX = findCoreStory("tictactoe-teams-5x5-solo-x");
		if (loneO === undefined || loneX === undefined) throw new Error("combination names do not resolve");
		expect(loneO.story.id).toBe("tictactoe-teams-5x5-r6-solo-o");
		expect(loneO.story.residents).toEqual(["A01", "A02", "A03", "A04"]);
		expect(loneX.story.residents).toEqual(["A01", "A04", "A05", "A06"]);
		expect(loneO.briefing("A04", host)).toContain("playing tic-tac-toe alone for side O on a 5x5 board against a team of three");
		expect(loneO.briefing("A01", host)).toContain("against a single player");
		expect(loneO.briefing("A01", host)).toContain("the other player's moves are not visible");
		expect(loneX.briefing("A01", host)).toContain("strategy brain: a short text (readBrain). After each game you rewrite it");
		expect(loneX.briefing("A05", host)).toContain("your team discusses in the chat");
	});
});
