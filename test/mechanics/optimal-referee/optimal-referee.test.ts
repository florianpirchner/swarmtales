/** The optimal-referee mechanic: minimax classes on known positions, the events it writes and who may read them. */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createHost } from "@swarmtales/kernel";
import { emptyBoard, type Cell } from "@swarmtales/mechanic-grid-game";
import { optimalReferee, scoreMove } from "@swarmtales/mechanic-optimal-referee";
import { checkDeterminism, checkOptionsDocumented, checkSnapshotRoundTrip, checkSourceRules, playStory } from "@swarmtales/testkit";
import { field, hostOptions, matchStory, scriptedPlayer } from "../grid-game/support.ts";

/** A 3x3 board from text: X, O, anything else is free. */
const board = (text: string): Cell[] => Array.from(text, (c): Cell => (c === "X" || c === "O" ? c : "."));

describe("the minimax classes", () => {
	it("scores nothing where no error is possible", () => {
		// Every first move draws with best play.
		expect(scoreMove(emptyBoard(3), 3, 3, "X", 4, 9)).toBeUndefined();
		// One free cell left: no choice.
		expect(scoreMove(board("XOXOXOOX."), 3, 3, "X", 8, 9)).toBeUndefined();
		// Too many free cells for the configured depth.
		expect(scoreMove(board("X........"), 3, 3, "O", 4, 7)).toBeUndefined();
	});

	it("calls the only saving reply optimal and any other one a blunder", () => {
		// X took a corner: only the centre holds the draw.
		expect(scoreMove(board("X........"), 3, 3, "O", 4, 9)).toEqual({ valueBefore: 0, valueAfter: 0, class: "optimal" });
		expect(scoreMove(board("X........"), 3, 3, "O", 1, 9)).toEqual({ valueBefore: 0, valueAfter: -1, class: "blunder" });
	});

	it("finds a missed win", () => {
		// X X . / O O . / . . . with X to move: cell 2 wins at once.
		const position = board("XX.OO....");
		expect(scoreMove(position, 3, 3, "X", 2, 9)).toEqual({ valueBefore: 1, valueAfter: 1, class: "optimal" });
		expect(scoreMove(position, 3, 3, "X", 8, 9)).toEqual({ valueBefore: 1, valueAfter: -1, class: "missed_win" });
	});

	it("finds a missed block", () => {
		// X X . / . O . / . . . with O to move: X threatens cell 2.
		const position = board("XX..O....");
		expect(scoreMove(position, 3, 3, "O", 2, 9)).toEqual({ valueBefore: 0, valueAfter: 0, class: "optimal" });
		expect(scoreMove(position, 3, 3, "O", 8, 9)).toEqual({ valueBefore: 0, valueAfter: -1, class: "missed_block" });
	});

	it("scores nothing in a lost position where every move loses", () => {
		// X X . / O . . / . . . with O to move: blocking cell 2 still loses to the fork, so no choice matters.
		const position = board("XX.O.....");
		expect(scoreMove(position, 3, 3, "O", 2, 9)).toBeUndefined();
		expect(scoreMove(position, 3, 3, "O", 8, 9)).toBeUndefined();
	});
});

describe("the mechanic in a match", () => {
	const story = () => matchStory({ games: 1 }, [optimalReferee.with()]);
	const only = { 1: [0, 1, 2, 4, 6, 3, 5, 7, 8] } as const;

	it("writes move_scored for the moves where an error was possible, with an audience of the human only", async () => {
		// X0 (all first moves draw: unscored), O1 (blunder), X4 (optimal), O2 (blunder: X wins with 8 or 3...), X6.
		const run = await playStory(hostOptions(story()), scriptedPlayer(only));
		const scored = run.events.filter((event) => event.type === "move_scored");
		expect(scored.length).toBeGreaterThan(0);
		expect(scored.every((event) => event.source === "optimal-referee")).toBe(true);
		expect(scored.every((event) => JSON.stringify(event.audience) === JSON.stringify(["human"]))).toBe(true);
		const first = scored[0]?.payload;
		expect(first).toEqual({ game: 1, moveNo: 2, side: "O", value_before: 0, value_after: -1, class: "blunder" });
		// No move 1 score (nothing to get wrong), and every payload is complete.
		expect(scored.map((event) => field(event, "moveNo"))).not.toContain(1);
	});

	it("has no tools and writes nothing but move_scored", async () => {
		const run = await playStory(hostOptions(story()), scriptedPlayer(only));
		expect(new Set(run.events.filter((event) => event.source === "optimal-referee").map((event) => event.type))).toEqual(new Set(["move_scored"]));
		const host = createHost(hostOptions(story()));
		expect(host.toolSpecs("resident").map((spec) => spec.name).sort()).toEqual(["playMove", "viewBoard"]);
		expect(host.toolSpecs("gamemaker")).toEqual([]);
	});

	it("is conformant, deterministic and survives a snapshot round trip mid-game", async () => {
		expect(checkOptionsDocumented(optimalReferee)).toEqual([]);
		const files = ["index", "minimax"].map((name) => ({ path: `mechanics/optimal-referee/src/${name}.ts`, text: readFileSync(`mechanics/optimal-referee/src/${name}.ts`, "utf8") }));
		expect(checkSourceRules(files)).toEqual([]);
		expect(await checkDeterminism(hostOptions(story()), () => scriptedPlayer(only))).toEqual([]);
		expect(await checkSnapshotRoundTrip(hostOptions(story()), () => scriptedPlayer(only), 2)).toEqual([]);
	});
});
