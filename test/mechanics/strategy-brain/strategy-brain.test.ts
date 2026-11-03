/** The strategy-brain mechanic: text checks, the retro window and its refusals, the hold on the grid game (offline, scripted). */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createHost, residentActor } from "@swarmtales/kernel";
import { strategyBrain, replaysMoves, wordCount, hashText } from "@swarmtales/mechanic-strategy-brain";
import { createPromptLookup } from "@swarmtales/prompts";
import { checkOptionsDocumented, checkSnapshotRoundTrip, checkSourceRules, idleAgent, playStory, scriptedAgent } from "@swarmtales/testkit";
import type { CoreStory } from "@swarmtales/contracts";
import { field, goldenStory, ofType, ticTacToePlayer } from "../../stories/tictactoe-support.ts";

const options = (extra: Parameters<typeof goldenStory>[0] = {}) => ({ story: goldenStory(extra), prompts: createPromptLookup() });
const as = residentActor;

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
});

describe("writeBrain", () => {
	it("is locked outside a retro window and open only for the retro captain", async () => {
		const host = createHost(options());
		host.start();
		// Before game 1 both teams have a window; the captains are A01 and A04.
		expect(host.openTools("A01")).toContain("writeBrain");
		expect(host.openTools("A04")).toContain("writeBrain");
		expect(host.openTools("A02")).not.toContain("writeBrain");
		expect(await host.call(as("A02"), "writeBrain", { text: "no" })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(await host.call(as("A01"), "writeBrain", { text: "" })).toMatchObject({ ok: false, code: "BRAIN_EMPTY" });
		expect(await host.call(as("A01"), "writeBrain", { text: Array(301).fill("w").join(" ") })).toMatchObject({ ok: false, code: "BRAIN_TOO_LONG" });
		expect(await host.call(as("A01"), "writeBrain", { text: Array(300).fill("w").join(" ") })).toMatchObject({ ok: true });
		expect(host.openTools("A01")).not.toContain("writeBrain");
		expect(await host.call(as("A01"), "writeBrain", { text: "again" })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		// One team's window is still open, so no game has started.
		expect(ofType(host.log.all(), "game_started")).toHaveLength(0);
		expect(await host.call(as("A04"), "writeBrain", { text: "o brain" })).toMatchObject({ ok: true });
		expect(await host.call(as("A01"), "readBrain", {})).toMatchObject({ ok: true });
	});

	it("keeps the brains of the two teams apart", async () => {
		const host = createHost(options());
		host.start();
		await host.call(as("A01"), "writeBrain", { text: "x secret" });
		await host.call(as("A04"), "writeBrain", { text: "o secret" });
		const x = await host.call(as("A02"), "readBrain", {});
		const o = await host.call(as("A05"), "readBrain", {});
		expect(x.ok && x.reply).toContain("x secret");
		expect(x.ok && x.reply).not.toContain("o secret");
		expect(o.ok && o.reply).toContain("o secret");
	});

	it("is refused when the brain is off", async () => {
		const host = createHost(options({ brain: false }));
		host.start();
		expect(await host.call(as("A01"), "writeBrain", { text: "x" })).toMatchObject({ ok: false, code: "TOOL_NOT_GRANTED" });
		expect(ofType(host.log.all(), "game_started")).toHaveLength(1);
	});
});

describe("the retro window", () => {
	it("closes on its own after retroMaxMinutes and then the game starts", async () => {
		const run = await playStory({ ...options({ minutes: 8 }) }, idleAgent);
		expect(ofType(run.events, "retro_closed").map((event) => [field(event, "team"), field(event, "reason")])).toEqual([["X", "timeout"], ["O", "timeout"]]);
		expect(ofType(run.events, "brain_written")).toHaveLength(0);
		const closed = ofType(run.events, "retro_closed")[0];
		const started = ofType(run.events, "game_started")[0];
		expect(closed?.minute).toBe(2);
		expect(started?.minute).toBe(3);
	});

	it("closes after retroMaxPosts team posts at the end of the minute", async () => {
		const poster = scriptedAgent((turn) => (turn.resident === "A02" || turn.resident === "A03" ? Array.from({ length: 3 }, () => ({ tool: "postTeam", params: { text: "talk" } })) : []));
		const run = await playStory({ ...options({ minutes: 4 }) }, poster);
		const reasons = ofType(run.events, "retro_closed").map((event) => [field(event, "team"), field(event, "reason"), String(event.minute)]);
		expect(reasons).toContainEqual(["X", "max_posts", "1"]);
		expect(reasons).toContainEqual(["O", "timeout", "2"]);
	});

	it("keeps its source free of forbidden globals and documents its options", () => {
		expect(checkOptionsDocumented(strategyBrain)).toEqual([]);
		const files = ["index", "text"].map((name) => ({ path: `mechanics/strategy-brain/src/${name}.ts`, text: readFileSync(`mechanics/strategy-brain/src/${name}.ts`, "utf8") }));
		expect(checkSourceRules(files)).toEqual([]);
	});
});

describe("the briefing and the hold", () => {
	it("names the side that started the game in the briefing of the waiting team too", async () => {
		const heads: string[] = [];
		const player = ticTacToePlayer();
		const run = await playStory(options(), async (turn) => {
			for (const note of turn.inputs) if (note.text.includes(" begins. You play for team ")) heads.push(`${turn.resident} ${note.text.split("\n")[0] ?? ""}`);
			await player(turn);
		});
		expect(ofType(run.events, "game_ended")).toHaveLength(3);
		// Game 2 starts with O: the waiting team X (A01) and the team on move (A04) are told the same.
		expect(heads).toContain("A01 Game 2 begins. You play for team X. Team O moves first.");
		expect(heads).toContain("A04 Game 2 begins. You play for team O. Team O moves first.");
		expect(heads).toContain("A04 Game 3 begins. You play for team O. Team X moves first.");
	});

	it("keeps the starting side in the snapshot, so a resumed briefing is the same", async () => {
		for (const cut of [4, 9]) expect(await checkSnapshotRoundTrip(options(), ticTacToePlayer, cut)).toEqual([]);
	});

	it("holds no game back when no retro window can open (enabled, but a brain for nobody)", async () => {
		const empty = (): CoreStory => {
			const story = goldenStory({ games: 2, minutes: 12 });
			return { ...story, mechanics: story.mechanics.map((use) => (use.mechanic.id === "strategy-brain" ? strategyBrain.with({ enabled: true, teams: {} }) : use)) };
		};
		const run = await playStory({ story: empty(), prompts: createPromptLookup() }, ticTacToePlayer());
		expect(ofType(run.events, "retro_started")).toHaveLength(0);
		expect(ofType(run.events, "game_started")).toHaveLength(2);
		expect(ofType(run.events, "match_ended")).toHaveLength(1);
	});
});
