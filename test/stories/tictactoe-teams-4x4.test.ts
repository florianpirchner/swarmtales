/** The 4x4 variant (four in a row) through the real mechanics: one scripted match offline, with the briefing and the referee at size 4. */
import { describe, expect, it } from "vitest";
import { createHost } from "@swarmtales/kernel";
import { createPromptLookup } from "@swarmtales/prompts";
import { checkDeterminism, checkSnapshotRoundTrip, playStory } from "@swarmtales/testkit";
import { coreStories } from "../../stories/index.ts";
import { tictactoeStory } from "../../stories/tictactoe-teams/story.ts";
import { CELLS_4X4, field, goldenStory, ofType, ticTacToePlayer } from "./tictactoe-support.ts";

const options = (brain = true) => ({ story: goldenStory({ brain, size: 4, line: 4 }), prompts: createPromptLookup() });
const player = () => ticTacToePlayer(CELLS_4X4, 4);

describe("tictactoe-teams, 4x4 with four in a row", () => {
	it("plays a scripted match to the end: two wins and a full board", async () => {
		const run = await playStory(options(), player());
		expect(run.end).toMatchObject({ reason: "referee", limit: "grid-game.match" });
		expect(ofType(run.events, "game_ended").map((event) => field(event, "result"))).toEqual(["X", "O", "draw"]);
		expect(ofType(run.events, "move_played")).toHaveLength(7 + 7 + 16);
		expect(ofType(run.events, "consensus_forfeited")).toHaveLength(0);
		expect(ofType(run.events, "brain_written").length).toBeGreaterThanOrEqual(6);
		// The referee scores on the 4x4 board: only legal values, and a missed win never appears in this script.
		const scored = ofType(run.events, "move_scored");
		for (const event of scored) expect(["optimal", "blunder", "missed_win", "missed_block"]).toContain(field(event, "class"));
	});

	it("is deterministic and survives a snapshot round trip", async () => {
		expect(await checkDeterminism(options(), player)).toEqual([]);
		for (const cut of [1, 6, 12]) expect(await checkSnapshotRoundTrip(options(), player, cut)).toEqual([]);
	});

	it("derives the briefing and the length from the board", () => {
		const small = coreStories["tictactoe-teams"];
		const big = coreStories["tictactoe-teams-4x4"];
		const nobrain = coreStories["tictactoe-teams-4x4-nobrain"];
		if (small === undefined || big === undefined || nobrain === undefined) throw new Error("tictactoe stories are not registered");
		const host = createHost(options());
		const text = big.briefing("A01", host);
		expect(text).toContain("on a 4x4 board");
		expect(text).toContain("Cells are numbered 0-15, row by row. 4 marks in a row, column or diagonal win;");
		expect(small.briefing("A01", host)).toContain("on a 3x3 board against the other team (6 residents in all). Cells are numbered 0-8, row by row. Marks in a row, column or diagonal win;");
		expect(nobrain.briefing("A01", host)).not.toContain("strategy brain");
		expect(tictactoeStory({ games: 1 }).minutes).toBe(24);
		expect(tictactoeStory({ games: 1, size: 4, line: 4 }).minutes).toBe(36);
	});
});

describe("tictactoe-teams, combinations by name", () => {
	it("resolves solo and fixed-captain names with their briefings", async () => {
		const { findCoreStory } = await import("../../stories/index.ts");
		const host = createHost(options());
		const solo = findCoreStory("tictactoe-teams-5x5-nobrain-r6-solo");
		const fixed = findCoreStory("tictactoe-teams-r6-fc");
		if (solo === undefined || fixed === undefined) throw new Error("combination names do not resolve");
		expect(solo.story.residents).toEqual(["A01", "A04"]);
		expect(solo.briefing("A01", host)).toContain("playing tic-tac-toe alone for side X on a 5x5 board");
		expect(fixed.story.residents).toHaveLength(6);
		expect(fixed.briefing("A01", host)).toContain("A01 is the captain of your team for the whole match");
		expect(fixed.briefing("A01", host)).toContain("You are the captain: you propose and you play, you never vote.");
		expect(fixed.briefing("A02", host)).not.toContain("You are the captain");
		expect(findCoreStory("tictactoe-teams-9x9")).toBeUndefined();
	});

	it("resolves the rule-list brain by name", async () => {
		const { findCoreStory } = await import("../../stories/index.ts");
		expect(findCoreStory("tictactoe-teams-5x5-r6-rules")?.story.id).toBe("tictactoe-teams-5x5-r6-rules8");
		expect(findCoreStory("tictactoe-teams-rules5")?.story.id).toBe("tictactoe-teams-rules5");
	});
});
