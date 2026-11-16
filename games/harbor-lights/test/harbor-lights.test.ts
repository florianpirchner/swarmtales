// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The game through the real mechanics: scripted matches of the three arms, the aid and hard strikes, offline. Carried
 * from `test/stories/harbor-lights.test.ts` of the old platform (two games, roster order); the registry case is
 * `carried.test.ts`, determinism and the snapshot are the standing checks.
 */
import type { ActorDriver } from "@swarmtales/contracts";
import { play, type Played } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { harborLightsGame, type HarborLightsOptions } from "../game.ts";
import { field, notes, ofType, player } from "./support.ts";

type Logged = Played["events"][number];

// Two games in roster order, as the old test played them.
function rosterGame(options: HarborLightsOptions) {
	const game = harborLightsGame({ games: 2, ...options });
	const turns: unknown = game.scheduler?.options;
	return { ...game, scheduler: { id: "turns", options: { ...(typeof turns === "object" ? turns : {}), order: "roster" } } };
}

const run = async (options: HarborLightsOptions, driver: ActorDriver = player): Promise<Played> => play(rosterGame(options), { seed: 31, drivers: { resident: driver } });

/** The texts of every input line of every activation. */
const shown = (events: readonly Logged[]): readonly string[] =>
	ofType(events, "activation_opened").flatMap((event) => {
		const inputs: unknown = field(event, "inputs");
		return Array.isArray(inputs) ? inputs.map((input: unknown) => String(field({ payload: input }, "text"))) : [];
	});

/** The context-reset lines each resident got, in order. */
const resets = (events: readonly Logged[]): readonly { readonly resident: string; readonly text: string }[] =>
	ofType(events, "activation_opened").flatMap((event) => {
		const inputs: unknown = field(event, "inputs");
		const resident = String(field(event, "actor")).replace(/^resident:/, "");
		return Array.isArray(inputs) ? inputs.flatMap((input: unknown) => (field({ payload: input }, "kind") === "context-reset" ? [{ resident, text: String(field({ payload: input }, "text")) }] : [])) : [];
	});

describe("harbor-lights, scripted matches", () => {
	it("crew: talks only between games, one captain writes the shared brain and everyone reads it", async () => {
		const { end, events } = await run({});
		expect(end).toMatchObject({ reason: "limit", limit: "harbor-lights.match" });
		expect(ofType(events, "game_ended")).toHaveLength(2);
		const written = ofType(events, "brain_written");
		expect(written.map((event) => `${String(field(event, "team"))} ${String(field(event, "game"))}`)).toEqual(["crew 0", "crew 1"]);
		const posts = ofType(events, "team_post");
		expect(posts.length).toBeGreaterThan(0);
		// Every post falls between games: after a game's end and before the next game's start, or before game 1.
		const starts = ofType(events, "game_started").map((event) => event.seq);
		const ends = ofType(events, "game_ended").map((event) => event.seq);
		for (const event of posts) expect(starts.some((start, index) => event.seq > start && event.seq < (ends[index] ?? Infinity))).toBe(false);
		const author = String(field(written[1] ?? {}, "author"));
		const late = resets(events).filter((reset) => reset.text.includes("Game 2 begins"));
		expect(late).toHaveLength(4);
		for (const reset of late) expect(reset.text).toContain(notes(author, 1));
	});

	it("crew: the record after a game asks the retro what a signal means and names every discard; soft strikes (the default) tell the seats the penalty", async () => {
		const { events } = await run({});
		expect(ofType(events, "game_ended")).toHaveLength(2);
		const texts = shown(events);
		expect(texts.some((text) => text.includes("Retro question: agree in the chat what a signal means"))).toBe(true);
		expect(texts.some((text) => text.includes("soft strikes: from strike 2 on"))).toBe(true);
		expect(texts.some((text) => text.includes("Discarded, each still needed and each one point lost"))).toBe(true);
		expect(shown((await run({ brain: "solo" })).events).some((text) => text.includes("Retro question"))).toBe(false);
		expect(shown((await run({ strikes: "hard" })).events).some((text) => text.includes("(the last one ends the game)"))).toBe(true);
	});

	it("solo: every seat writes private notes and reads only its own", async () => {
		const { end, events } = await run({ brain: "solo" });
		expect(end).toMatchObject({ reason: "limit", limit: "harbor-lights.match" });
		expect(ofType(events, "team_post")).toHaveLength(0);
		expect(ofType(events, "brain_written").map((event) => String(field(event, "team"))).sort()).toEqual(["A01", "A01", "A02", "A02", "A03", "A03", "A04", "A04"]);
		const late = resets(events).filter((entry) => entry.text.includes("Game 2 begins"));
		expect(late).toHaveLength(4);
		for (const reset of late) {
			expect(reset.text).toContain(notes(reset.resident, 1));
			expect(reset.text.match(/after game 1:/g)).toHaveLength(1);
		}
	});

	it("nobrain: keeps nothing and opens no retro", async () => {
		const { events } = await run({ brain: "nobrain" });
		expect(ofType(events, "brain_written")).toHaveLength(0);
		expect(ofType(events, "retro_started")).toHaveLength(0);
		expect(ofType(events, "game_ended")).toHaveLength(2);
	});

	it("plays the same deals in every arm (the same seed)", async () => {
		const deals = async (brain: "crew" | "solo" | "nobrain") => ofType((await run({ brain })).events, "deal_revealed").map((event) => JSON.stringify(field(event, "pile")));
		const crew = await deals("crew");
		expect(crew).toHaveLength(2);
		expect(await deals("solo")).toEqual(crew);
		expect(await deals("nobrain")).toEqual(crew);
	});

	it("hard strikes: the third misfire ends the game; soft strikes play on and charge the penalty", async () => {
		const blind: ActorDriver = async (turn) => {
			if (turn.inputs.some((note) => note.text.includes("Your turn: one action"))) await turn.call("playSlot", { slot: 1 });
		};
		const ended = async (strikes: "soft" | "hard") => ofType((await run({ brain: "nobrain", games: 1, strikes }, blind)).events, "game_ended").map((event) => [field(event, "reason"), field(event, "misfires")]);
		expect(await ended("hard")).toEqual([["strikes", 3]]);
		const [[reason, misfires] = []] = await ended("soft");
		expect(reason).not.toBe("strikes");
		expect(Number(misfires)).toBeGreaterThan(3);
	});

	it("shows each own slot's chance to light only in the aid arm (P430)", async () => {
		const chance = async (aid: boolean): Promise<readonly string[]> => {
			const seen: string[] = [];
			await run({ brain: "nobrain", games: 1, aid }, async (turn) => {
				seen.push(...turn.inputs.map((note) => note.text));
				await player(turn);
			});
			return seen;
		};
		expect((await chance(true)).some((text) => /Chance a play lights it now: \d+ of \d+ \(\d+ %\)/.test(text))).toBe(true);
		expect((await chance(false)).some((text) => text.includes("Chance a play lights it now"))).toBe(false);
	});
});
