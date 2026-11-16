// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Sample 4 in process: the coach is woken every second tick, and its dial `direction` at 0 and at 8 gives two runs
 * whose logs differ (no note against a note to the captain on move); a model's answer reaches the captain at any
 * direction; and the shipped gamemaker, placed in the same game, is refused because it needs the City's run frame
 * (the first test of the sample, with the error of the README). No model is asked: the asker is a function of the test.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { defineGamemaker } from "@swarmtales/city-directors";
import type { AskModel, DriverTable, Envelope, Kernel } from "@swarmtales/contracts";
import { createDirectorDrivers, DIRECTOR_RECORDS, turns } from "@swarmtales/engine";
import { runFrame } from "@swarmtales/mechanic-arena";
import { fakeDriver, play } from "@swarmtales/testkit";
import { resolveGame } from "swarmtales";
import { describe, expect, it } from "vitest";
import family from "../game.ts";
import { coach, COACH_REMINDER } from "../src/index.ts";

const SEED = 2;
const RECORDS = [DIRECTOR_RECORDS];
const NO_ANSWER: AskModel = () => Promise.resolve({ ok: false, reason: "error", detail: "no model in a test" });
const answering = (note: string): AskModel => () => Promise.resolve({ ok: true, value: { note }, costUsd: 0 });

/** Plays the game at one direction: the fake driver for the residents, the coach's driver with the given asker. */
async function playAt(direction: number, ask: AskModel = NO_ANSWER) {
	const game = family.build({ direction });
	const drivers = (kernel: Kernel): DriverTable => {
		const resolved = resolveGame({ game, seed: SEED, schedulers: { turns }, prompts: { render: (_owner, id) => id }, records: RECORDS });
		return { resident: fakeDriver(kernel, SEED), ...createDirectorDrivers({ game: resolved, ask, facts: (key) => kernel.fact(key) }) };
	};
	return (await play(game, { seed: SEED, drivers, records: RECORDS })).events;
}

const ofType = (events: readonly Envelope[], type: string): readonly Envelope[] => events.filter((event) => event.type === type);
const notes = (events: readonly Envelope[]): readonly unknown[] => ofType(events, "gamemaker_note").map((event) => event.payload);

describe("sample 4: the coach and its dial", () => {
	it("is asked every second tick; at direction 0 it sends nothing, at 8 its fallback reminds the captain on move", async () => {
		const [still, steered] = await Promise.all([playAt(0), playAt(8)]);
		for (const events of [still, steered]) {
			expect(ofType(events, "asked").map((event) => event.tick)).toEqual([0, 2, 4, 6, 8]);
			expect(ofType(events, "skipped")).toMatchObject([{ tick: 10, payload: { director: "coach", reason: "maxCalls" } }]);
		}
		expect(ofType(still, "answered").map((event) => event.payload)).toMatchObject(Array(5).fill({ ok: false, fallback: false }));
		expect(notes(still)).toEqual([]);
		expect(ofType(steered, "answered").map((event) => event.payload)).toMatchObject(Array(5).fill({ ok: false, fallback: true }));
		expect(notes(steered).length).toBeGreaterThan(2);
		expect(notes(steered)).toContainEqual({ author: "COACH", number: 1, to: "A01", text: `A01, ${COACH_REMINDER}` });
		// The same reminder twice in a row to one captain is refused by the note desk of `channels`.
		expect(ofType(steered, "tool_refused").map((event) => event.payload)).toContainEqual(expect.objectContaining({ as: "notify", code: "REPEATED" }));
		const ctx = (direction: number) => ({ name: "coach", options: { direction }, tick: 0, firings: [], facts: {} });
		expect(coach.system(ctx(0))).toContain("Direction 0: do not steer.");
		expect(coach.system(ctx(8))).toContain("Direction 8 of 10: steer the captain");
	});

	it("sends the model's note to the captain on move at any direction, and nothing for an empty note", async () => {
		expect(notes(await playAt(0, answering("Take the centre.")))[0]).toEqual({ author: "COACH", number: 1, to: "A01", text: "Take the centre." });
		expect(notes(await playAt(8, answering("")))).toEqual([]);
	});

	it("the shipped gamemaker in this game is refused: it needs the City's run frame, the error of the README", async () => {
		const game = family.build({ direction: 0 });
		const gamemaker = defineGamemaker({ facts: [], events: ["channels.dm_sent"], every: 2 });
		const placed = { ...game, mechanics: [...game.mechanics, runFrame({ story: "coached-game", rewards: [], acts: [] })], directors: [{ use: gamemaker, options: { direction: 8, system: "-", budgetLine: "-" } }] };
		const error: unknown = await play(placed, { seed: SEED, records: RECORDS }).catch((thrown: unknown) => thrown);
		const shown = String(error).replace(/^SwtError: /, "");
		expect(shown).toMatch(/^error SWT-G030: mechanic "arena" needs the service "progression"/);
		expect(readFileSync(join(import.meta.dirname, "..", "README.md"), "utf8")).toContain(`\`\`\`text\n${shown}\n\`\`\``);
	});
});
