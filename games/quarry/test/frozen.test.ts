// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Open quarries frozen per step (lesson LH18, decision A29). With `openHands` the `Quarries:` line of a pick request
 * is the live state, and the seats are asked one after another: a seat asked later sees picks of the same step.
 * With `frozenHands` every pick request of a step shows the quarries as they were when the step opened, whatever
 * the order of the seats. The property is checked over scripted matches of several seeds, under the game's own
 * shuffled turn order, from the log alone: the hands are rebuilt from the sealed `draft_card_picked` events.
 */
import { Card, countsOf, RESOURCES } from "@swarmtales/mechanic-quarry/rules";
import { play, testKernel } from "@swarmtales/testkit";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { quarryGame } from "../game.ts";
import { arm, field, ofType, player, shown } from "./support.ts";

const players = { drivers: { resident: player } };
const SEATS = ["A01", "A02", "A03", "A04"];
/** The first six seeds of the gate series are those of `experiments/open-quarries-frozen.json`. */
const SEEDS = [31, 37, 41, 43, 47, 53];

type Logged = Awaited<ReturnType<typeof play>>["events"][number];

// The line the mechanic writes for these hands.
function lineOf(hands: Readonly<Record<string, readonly Card[]>>): string {
	const quarry = (hand: readonly Card[]): string => {
		const { counts, wilds } = countsOf(hand);
		return [...RESOURCES.map((kind) => `${kind} ${String(counts[kind])}`), `lodestone ${String(wilds)}`].join(", ");
	};
	return `Quarries: ${SEATS.map((seat) => `${seat} ${quarry(hands[seat] ?? [])}`).join("; ")}.`;
}

// The `Quarries:` line among the input lines of an opened activation, or undefined.
function quarriesOf(event: Logged): string | undefined {
	const inputs = field(event, "inputs");
	const texts = Array.isArray(inputs) ? inputs.map((input: unknown) => (typeof input === "object" && input !== null ? String(Reflect.get(input, "text")) : "")) : [];
	return /^Quarries: .*$/m.exec(texts.join("\n"))?.[0];
}

/** The pick requests of a run that show the quarries, and those of them that differ from the quarries at the start of their step. */
function requests(events: readonly Logged[]): { readonly asked: number; readonly leaks: number } {
	let hands: Record<string, Card[]> = {};
	let atStart = lineOf(hands);
	let [asked, leaks] = [0, 0];
	for (const event of events) {
		if (event.type === "draft_game_started") hands = {};
		if (event.type === "draft_pick_opened") atStart = lineOf(hands);
		if (event.type === "draft_card_picked") hands[String(field(event, "resident"))] = [...(hands[String(field(event, "resident"))] ?? []), Value.Parse(Card, field(event, "card"))];
		const line = event.type === "activation_opened" ? quarriesOf(event) : undefined;
		if (line === undefined) continue;
		asked += 1;
		if (line !== atStart) leaks += 1;
	}
	return { asked, leaks };
}

const hashOf = (game: Parameters<typeof testKernel>[0]): string => testKernel(game).kernel.snapshot().gameHash;

describe("open quarries, frozen per step", () => {
	it.each(SEEDS)("seed %i: no pick request shows a pick of the same step", async (seed) => {
		const run = await play(quarryGame({ openHands: true, frozenHands: true }), { seed, ...players });
		expect(run.end).toMatchObject({ reason: "limit", limit: "quarry.match" });
		// Three games of 48 picks: every pick is asked for once, with the line.
		expect(requests(run.events)).toEqual({ asked: 3 * 48, leaks: 0 });
	});

	it.each(SEEDS)("seed %i: without the option the same check finds the same-step picks (LH18), and the picks are the same", async (seed) => {
		const live = await play(quarryGame({ openHands: true }), { seed, ...players });
		const { asked, leaks } = requests(live.events);
		expect(asked).toBe(3 * 48);
		// Only the seat asked first in a step sees no pick of it: about three of four requests show one.
		expect(leaks).toBeGreaterThan(3 * 30);
		// The scripted seat does not read the line: the option changes what is shown, not the rules.
		const frozen = await play(quarryGame({ openHands: true, frozenHands: true }), { seed, ...players });
		expect(ofType(frozen.events, "draft_card_picked").map((event) => event.payload)).toEqual(ofType(live.events, "draft_card_picked").map((event) => event.payload));
	});
});

describe("the option off", () => {
	it("is the game of the oracle files: the same hash and the same log, hidden and open", async () => {
		for (const params of [{}, { openHands: true }]) {
			expect(hashOf(quarryGame({ ...params, frozenHands: false }))).toBe(hashOf(quarryGame(params)));
			expect(hashOf(arm({ ...params, frozenHands: false }))).toBe(hashOf(quarryGame(params)));
			const [off, old] = [await play(arm({ ...params, frozenHands: false }), players), await play(quarryGame(params), players)];
			expect(JSON.stringify(off.events)).toBe(JSON.stringify(old.events));
		}
	});

	it("changes the game only together with openHands: alone it shows what the hidden game shows", async () => {
		const [alone, hidden] = [await play(quarryGame({ frozenHands: true }), players), await play(quarryGame(), players)];
		expect(requests(alone.events).asked).toBe(0);
		expect(shown(alone.events)).toEqual(shown(hidden.events));
		expect(hashOf(quarryGame({ frozenHands: true }))).not.toBe(hashOf(quarryGame()));
	});
});
