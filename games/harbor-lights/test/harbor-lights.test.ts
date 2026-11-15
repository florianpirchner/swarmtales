// SPDX-License-Identifier: Apache-2.0
/**
 * The game through the real mechanics: scripted matches of the arms `solo` and `nobrain`, offline. Carried from
 * `test/stories/harbor-lights.test.ts` of the old platform (two games, roster order); the cases of the crew arm, the
 * aid and hard strikes go with issue M4-24.
 */
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

const run = async (options: HarborLightsOptions): Promise<Played> => play(rosterGame(options), { seed: 31, drivers: { resident: player } });

/** The context-reset lines each resident got, in order. */
const resets = (events: readonly Logged[]): readonly { readonly resident: string; readonly text: string }[] =>
	ofType(events, "activation_opened").flatMap((event) => {
		const inputs: unknown = field(event, "inputs");
		const resident = String(field(event, "actor")).replace(/^resident:/, "");
		return Array.isArray(inputs) ? inputs.flatMap((input: unknown) => (field({ payload: input }, "kind") === "context-reset" ? [{ resident, text: String(field({ payload: input }, "text")) }] : [])) : [];
	});

describe("harbor-lights, scripted matches", () => {
	it("solo: every seat writes private notes and reads only its own", async () => {
		const { end, events } = await run({ brain: "solo" });
		expect(end).toMatchObject({ reason: "limit", limit: "hint-towers.match" });
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
		const deals = async (brain: "solo" | "nobrain") => ofType((await run({ brain })).events, "deal_revealed").map((event) => JSON.stringify(field(event, "pile")));
		const solo = await deals("solo");
		expect(solo).toHaveLength(2);
		expect(await deals("nobrain")).toEqual(solo);
	});
});
