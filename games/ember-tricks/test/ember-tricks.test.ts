// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The game through the real mechanics: scripted two-game matches of three rounds with notes, the levers and the
 * control arm, offline. Carried from `test/stories/ember-tricks.test.ts` of the old platform (roster order); the
 * registry case is `carried.test.ts`, determinism and the snapshot are the standing checks.
 */
import { play, type Played } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import type { EmberTricksOptions } from "../game.ts";
import { field, notes, ofType, rosterGame, trickPlayer, type ScriptOptions } from "./support.ts";

type Logged = Played["events"][number];

const run = async (options: EmberTricksOptions = {}, script: ScriptOptions = { notes }): Promise<Played> => play(rosterGame(options), { seed: 23, drivers: { resident: trickPlayer(script) } });

/** Every input line of every activation, with its resident. */
const lines = (events: readonly Logged[]): readonly { readonly resident: string; readonly kind: string; readonly text: string }[] =>
	ofType(events, "activation_opened").flatMap((event) => {
		const inputs: unknown = field(event, "inputs");
		const resident = String(field(event, "actor")).replace(/^resident:/, "");
		return Array.isArray(inputs) ? inputs.map((input: unknown) => ({ resident, kind: String(field({ payload: input }, "kind")), text: String(field({ payload: input }, "text")) })) : [];
	});

/** The context-reset lines each resident got, in order. */
const resets = (events: readonly Logged[]) => lines(events).filter((line) => line.kind === "context-reset");

describe("ember-tricks, scripted match", () => {
	it("plays two games, every seat writes its notes after game 1 and reads them in game 2", async () => {
		const { end, events } = await run();
		expect(end).toMatchObject({ reason: "limit", limit: "trick-play.match" });
		expect(ofType(events, "game_ended")).toHaveLength(2);
		const written = ofType(events, "brain_written");
		expect(written.map((event) => `${String(field(event, "team"))} ${String(field(event, "game"))}`).sort()).toEqual(["A01 1", "A02 1", "A03 1", "A04 1"]);
		expect(written.every((event) => event.audience?.join() === "human")).toBe(true);
		// Game 2's briefing (in every round) carries the seat's own notes, never another seat's.
		const late = resets(events).filter((reset) => reset.text.includes("Game 2 begins"));
		expect(late.length).toBeGreaterThanOrEqual(4 * 3 - 1);
		for (const reset of late) {
			expect(reset.text).toContain(notes(reset.resident, 1));
			expect(reset.text.match(/after game 1:/g)).toHaveLength(1);
		}
		// The debrief of game 1 reached every seat in the retro.
		expect(new Set(lines(events).filter((line) => line.text.includes("Bid/taken per round")).map((line) => line.resident)).size).toBe(4);
	});

	it("gives every seat its own calibration line in the retro with the calibration lever, and none without", async () => {
		const { events } = await run({ lever: "calibration" }, { notes, bid: () => 0 });
		const found = lines(events)
			.filter((line) => line.text.includes("Game 1 is over"))
			.map((line) => ({ resident: line.resident, line: /Your calibration this game: [^\n]+/.exec(line.text)?.[0] ?? "" }));
		expect(new Set(found.map((entry) => entry.resident)).size).toBe(4);
		for (const entry of found) expect(entry.line).toMatch(/^Your calibration this game: you bid 0 tricks in all and took \d+ over 3 rounds; \d of 3 bids hit; 3 of your bids were 0\. In short, /);
		expect(JSON.stringify((await run()).events)).not.toContain("Your calibration");
	});

	it("adds the reference worth of the seat's hands to the calibration line with mcRetro", async () => {
		const { events } = await run({ lever: "mcRetro" }, { notes, bid: () => 0 });
		const found = lines(events)
			.filter((line) => line.text.includes("Game 1 is over"))
			.map((line) => /A simulation of random deals and trumps rated your hands at [^\n]+/.exec(line.text)?.[0] ?? "");
		expect(found).toHaveLength(4);
		for (const line of found) expect(line).toMatch(/^A simulation of random deals and trumps rated your hands at \d+\.\d tricks in all \(\d+\.\d per round\), against your 0 bid: r1 bid 0, worth \d\.\d, took \d; r2 /);
	});

	it("resets every seat at each round, so a conversation never spans two rounds", async () => {
		const firstGame = resets((await run()).events).filter((reset) => reset.text.includes("Game 1 begins"));
		// Three rounds, four seats; a seat that has no turn in a round is reset at its next one.
		expect(firstGame.length).toBeGreaterThanOrEqual(9);
		expect(firstGame.every((reset) => reset.text.includes("not written a brain yet"))).toBe(true);
	});

	it("keeps no notes and opens no retro in the control arm", async () => {
		const { events } = await run({ brain: false });
		expect(ofType(events, "brain_written")).toHaveLength(0);
		expect(ofType(events, "retro_started")).toHaveLength(0);
		expect(resets(events).every((reset) => reset.text.includes("keep no notes"))).toBe(true);
	});
});
