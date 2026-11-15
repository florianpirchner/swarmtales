// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `showResults: false` (the cure of LH19): a seat is shown nothing of an earlier game once the next one has started
 * (no points, no final quarries), in its inputs and in the replies of `viewTable`, with and without a brain, over
 * several seeds. The default is the game of the oracle files: the same hash, and the results line as before.
 */
import { play, testKernel, type Played } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { arm, field, ofType, player } from "./support.ts";

const SEEDS = [13, 41, 59];
const PINNED = "6490b2a8e16e7dfaf9c4180004b0a5c3acb81183a95c5685a7b773e7689041c1";

// The scripted seat, which also looks at the table when a game begins and in a retro: what `viewTable` would tell it.
const looking: typeof player = async (activation) => {
	if (activation.inputs.some((input) => /begins|Retro after game/.test(input.text))) await activation.call("viewTable", {});
	await player(activation);
};

// Every text a seat was shown (input lines and tool replies), with the number of games started before it.
function shownTexts(events: Played["events"]): readonly { readonly game: number; readonly text: string }[] {
	let game = 0;
	return events.flatMap((event) => {
		if (event.type === "draft_game_started") game += 1;
		if (event.type === "activation_opened") return [{ game, text: JSON.stringify(field(event, "inputs")) }];
		return event.type === "tool_result" ? [{ game, text: String(field(event, "reply")) }] : [];
	});
}

// The texts of a later game that hold the results line, the result of an earlier game, or a seat's earlier points.
const leaks = (events: Played["events"]): string[] =>
	shownTexts(events)
		.filter(({ game, text }) => game >= 2 && (/Results so far|earlier games/.test(text) || Array.from({ length: game - 1 }, (_, index) => `game ${String(index + 1)}: points`).some((head) => text.includes(head))))
		.map(({ text }) => text);

const playArm = async (params: Readonly<Record<string, unknown>>, seed: number): Promise<Played["events"]> => (await play(arm(params), { seed, drivers: { resident: looking } })).events;

describe("quarry without the results of earlier games (LH19)", () => {
	it.each(SEEDS)("seed %i: with showResults false no input and no viewTable of a later game holds an earlier result, with and without a brain", async (seed) => {
		for (const brain of [true, false]) {
			const events = await playArm({ brain, showResults: false }, seed);
			expect(ofType(events, "draft_game_ended")).toHaveLength(3);
			expect(shownTexts(events).filter(({ game }) => game >= 2).length).toBeGreaterThan(100);
			expect(leaks(events)).toEqual([]);
			const texts = shownTexts(events).map(({ text }) => text);
			expect(texts.some((text) => text.includes("No game has been played yet."))).toBe(true);
			expect(texts.some((text) => text.includes(brain ? "Your strategy brain (version 3)" : "You keep no notes between games."))).toBe(true);
		}
	});

	it.each(SEEDS)("seed %i: the default shows them, so the check above can fail, and the match is the same", async (seed) => {
		for (const brain of [true, false]) {
			const shown = await playArm({ brain }, seed);
			const hidden = await playArm({ brain, showResults: false }, seed);
			expect(leaks(shown).some((text) => text.includes("Results so far: game 1: points A01 "))).toBe(true);
			expect(leaks(shown).some((text) => text.includes("Your points from earlier games: "))).toBe(true);
			expect(ofType(hidden, "draft_match_ended").map((event) => field(event, "scores"))).toEqual(ofType(shown, "draft_match_ended").map((event) => field(event, "scores")));
			// Game 1 and the retro after it get the same input lines in both.
			const first = (events: Played["events"]): string[] => shownTexts(events).filter(({ game, text }) => game <= 1 && text.startsWith("[")).map(({ text }) => text);
			expect(first(hidden)).toEqual(first(shown));
		}
	});

	it("showResults true is the default game: the pinned hash of the oracle game; false is another game", () => {
		const hashOf = (params: Readonly<Record<string, unknown>>): string => testKernel(arm(params)).kernel.snapshot().gameHash;
		expect(hashOf({ showResults: true })).toBe(PINNED);
		expect(hashOf({ showResults: false })).not.toBe(PINNED);
		expect(hashOf({ openHands: true, showResults: true })).toBe(hashOf({ openHands: true }));
	});
});
