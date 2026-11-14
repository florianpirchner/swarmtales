// SPDX-License-Identifier: Apache-2.0
/**
 * The strategy-brain mechanic: text checks, the retro window and its refusals, the hold on the grid game (offline,
 * scripted). Carried from `test/mechanics/strategy-brain/strategy-brain.test.ts`; `support.ts` says what stands in
 * for the team channel and the consensus gate of the old game.
 */
import { describe, expect, it } from "vitest";
import { nameOf, type Activation } from "@swarmtales/contracts";
import { idleDriver, play, scriptedDriver, testKernel } from "@swarmtales/testkit";
import { hashText, replaysLine, replaysMoves, wordCount } from "../src/text.ts";
import { brainFor, brainGame, field, ofType, ticTacToePlayer } from "./support.ts";

describe("text checks", () => {
	it("counts words and hashes the text stably", () => {
		expect(wordCount("  one two\n three ")).toBe(3);
		expect(wordCount("   ")).toBe(0);
		expect(hashText("a")).toBe(hashText("a"));
		expect(hashText("a")).not.toBe(hashText("b"));
	});

	it("finds a game's full move list, with ordinals in between, but not rules keyed to positions", () => {
		const moves = [0, 3, 1, 4, 2];
		expect(replaysMoves("They played 0, 3, 1, 4, 2.", moves, 5)).toBe(true);
		expect(replaysMoves("1. 0 2. 3 3. 1 4. 4 5. 2", moves, 5)).toBe(true);
		expect(replaysMoves("If the opponent holds corner 0 and you hold 4, take 8; with 1 and 2 taken block 0.", moves, 5)).toBe(false);
		expect(replaysMoves("0 3 1 4", moves, 5)).toBe(false);
		expect(replaysMoves("0 3 1", [0, 3, 1], 5)).toBe(false);
	});

	// New with the port: `replaysLine` was split for the complexity limit and had no test.
	it("finds a run of a game whose moves are text, in any accepted spelling, with move numbers in between", () => {
		const line = [["e4", "e2e4"], ["e5", "e7e5"], ["Nf3", "g1f3"], ["Nc6", "b8c6"]];
		expect(replaysLine("We opened 1. e4 e5 2. g1f3 and lost.", line, 3)).toBe(true);
		expect(replaysLine("1... e5 2. Nf3! Nc6,", line, 3)).toBe(true);
		expect(replaysLine("e4 Nf3 e5 Nc6", line, 3)).toBe(false);
		expect(replaysLine("e4 e5", line, 3)).toBe(false);
		expect(replaysLine("e4 e5 Nf3", line, 5)).toBe(false);
	});
});

describe("writeBrain", () => {
	it("is locked outside a retro window and open only for the retro captain", async () => {
		const test = testKernel(brainGame());
		// Before game 1 both teams have a window; the captains are A01 and A04.
		expect(test.openTools("A01")).toContain("writeBrain");
		expect(test.openTools("A04")).toContain("writeBrain");
		expect(test.openTools("A02")).not.toContain("writeBrain");
		expect(await test.call("A02", "writeBrain", { text: "no" })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(await test.call("A01", "writeBrain", { text: "" })).toMatchObject({ ok: false, code: "BRAIN_EMPTY" });
		expect(await test.call("A01", "writeBrain", { text: Array(301).fill("w").join(" ") })).toMatchObject({ ok: false, code: "BRAIN_TOO_LONG" });
		expect(await test.call("A01", "writeBrain", { text: Array(300).fill("w").join(" ") })).toMatchObject({ ok: true });
		expect(test.openTools("A01")).not.toContain("writeBrain");
		expect(await test.call("A01", "writeBrain", { text: "again" })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		// One team's window is still open, so no game has started.
		expect(ofType(test.kernel.log.all(), "game_started")).toHaveLength(0);
		expect(await test.call("A04", "writeBrain", { text: "o brain" })).toMatchObject({ ok: true });
		expect(await test.call("A01", "readBrain", {})).toMatchObject({ ok: true });
	});

	it("keeps the brains of the two teams apart", async () => {
		const test = testKernel(brainGame());
		await test.call("A01", "writeBrain", { text: "x secret" });
		await test.call("A04", "writeBrain", { text: "o secret" });
		const x = await test.call("A02", "readBrain", {});
		const o = await test.call("A05", "readBrain", {});
		expect(x.ok && x.reply).toContain("x secret");
		expect(x.ok && x.reply).not.toContain("o secret");
		expect(o.ok && o.reply).toContain("o secret");
		expect(test.fact("strategy-brain.brains")).toEqual({ X: 1, O: 1 });
	});

	it("is refused when the brain is off", async () => {
		const test = testKernel(brainGame({ brain: false }));
		expect(await test.call("A01", "writeBrain", { text: "x" })).toMatchObject({ ok: false, code: "TOOL_NOT_GRANTED" });
		expect(ofType(test.kernel.log.all(), "game_started")).toHaveLength(1);
	});
});

describe("a brain of at most maxRules rules", () => {
	it("refuses more lines than rules and names the limit in the retro", async () => {
		const test = testKernel(brainGame({ maxRules: 3 }));
		const four = ["1. a", "2. b", "", "3. c", "4. d"].join("\n");
		expect(await test.call("A01", "writeBrain", { text: four })).toMatchObject({ ok: false, code: "BRAIN_TOO_MANY_RULES" });
		expect(await test.call("A01", "writeBrain", { text: ["1. a", "2. b", "3. c"].join("\n") })).toMatchObject({ ok: true });
	});
});

describe("the retro window", () => {
	it("closes on its own after retroMaxMinutes and then the game starts", async () => {
		const run = await play(brainGame({ ticks: 8 }), { drivers: { resident: idleDriver } });
		expect(ofType(run.events, "retro_closed").map((event) => [field(event, "team"), field(event, "reason")])).toEqual([["X", "timeout"], ["O", "timeout"]]);
		expect(ofType(run.events, "brain_written")).toHaveLength(0);
		const closed = ofType(run.events, "retro_closed")[0];
		const started = ofType(run.events, "game_started")[0];
		expect(closed?.tick).toBe(2);
		expect(started?.tick).toBe(3);
	});

	it("closes after retroMaxPosts team posts at the end of the minute", async () => {
		const poster = scriptedDriver((turn) => (["A02", "A03"].includes(nameOf(turn.actor)) ? Array.from({ length: 3 }, () => ({ tool: "postTeam", params: { text: "talk" } })) : []));
		const run = await play(brainGame({ ticks: 4 }), { drivers: { resident: poster } });
		const reasons = ofType(run.events, "retro_closed").map((event) => [field(event, "team"), field(event, "reason"), String(event.tick)]);
		expect(reasons).toContainEqual(["X", "max_posts", "1"]);
		expect(reasons).toContainEqual(["O", "timeout", "2"]);
	});
});

describe("the briefing and the hold", () => {
	const players = { drivers: { resident: ticTacToePlayer() } };

	it("names the side that started the game in the briefing of the waiting team too", async () => {
		const heads: string[] = [];
		const player = ticTacToePlayer();
		const run = await play(brainGame(), {
			drivers: {
				resident: async (turn) => {
					for (const note of turn.inputs) if (note.text.includes(" begins. You play for team ")) heads.push(`${nameOf(turn.actor)} ${note.text.split("\n")[0] ?? ""}`);
					await player(turn);
				},
			},
		});
		expect(ofType(run.events, "game_ended")).toHaveLength(3);
		// Game 2 starts with O: the waiting team X (A01) and the team on move (A04) are told the same.
		expect(heads).toContain("A01 Game 2 begins. You play for team X. Team O moves first.");
		expect(heads).toContain("A04 Game 2 begins. You play for team O. Team O moves first.");
		expect(heads).toContain("A04 Game 3 begins. You play for team O. Team X moves first.");
	});

	it("writes a brain per team in every retro and refuses the replay of a game", async () => {
		const run = await play(brainGame(), players);
		expect(run.end).toMatchObject({ reason: "limit", limit: "grid-game.match" });
		// The retro captain rotates by game: A01 and A04 before game 1, A02 and A05 after it, A03 and A06 after game 2.
		const written = ofType(run.events, "brain_written");
		expect(written.map((event) => [field(event, "team"), field(event, "game"), field(event, "version"), field(event, "author")].join(" ")).sort()).toEqual(["O 0 1 A04", "O 1 2 A05", "O 2 3 A06", "X 0 1 A01", "X 1 2 A02", "X 2 3 A03"]);
		expect(written.find((event) => field(event, "author") === "A06")?.payload).toMatchObject({ text: brainFor("O", 2), words: 31 });
		expect(written.every((event) => JSON.stringify(event.audience) === JSON.stringify(["human"]))).toBe(true);
		expect(run.events.filter((event) => event.type === "tool_refused" && field(event, "code") === "BRAIN_REPLAY")).toHaveLength(2);
		expect(ofType(run.events, "retro_closed").map((event) => field(event, "reason"))).toEqual(Array.from({ length: 6 }, () => "written"));
	});

	// M1-30 builds `checkSnapshotRoundTrip` (and `checkOptionsDocumented`, `checkPackage`) in parallel; the integrator
	// swaps this hand-written check for it and adds the other two.
	it("keeps the starting side in the snapshot, so a resumed briefing is the same", async () => {
		// Nobody moves before tick 3, so at the cut after tick 1 five residents still wait for the briefing of game 1,
		// which names the side that starts: it is rendered after the resume, from the loaded state.
		const player = ticTacToePlayer();
		const slow = { drivers: { resident: (turn: Activation) => (turn.tick < 3 && !turn.inputs.some((note) => note.text.includes("Before game 1")) ? Promise.resolve() : player(turn)) } };
		const straight = await play(brainGame(), slow);
		expect(ofType(straight.events, "game_ended")).toHaveLength(3);
		for (const cut of [2, 4, 7]) {
			const first = await play(brainGame(), { ...slow, ticks: cut });
			const resumed = await play(brainGame(), { ...slow, resume: { snapshot: structuredClone(first.kernel.snapshot()), log: first.events } });
			expect(resumed.events).toEqual(straight.events);
		}
	});

	it("holds no game back when no retro window can open (enabled, but a brain for nobody)", async () => {
		const run = await play(brainGame({ games: 2, ticks: 12, brainTeams: {} }), players);
		expect(ofType(run.events, "retro_started")).toHaveLength(0);
		expect(ofType(run.events, "game_started")).toHaveLength(2);
		expect(ofType(run.events, "match_ended")).toHaveLength(1);
	});
});
