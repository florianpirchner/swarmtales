// SPDX-License-Identifier: Apache-2.0
/** The rules of the hint towers as functions, and the reference bot (carried from the old mechanic test). */
import { describe, expect, it } from "vitest";
import { deckOf } from "@swarmtales/mechanic-card-table/contract";
import { botAction, botScore } from "../src/bot.ts";
import { candidates, discard, isPlayable, newGame, nextRank, parseAbout, penaltyStrikes, play, scoreOf, signal, signalProblem, surePlayable, type TowerGame, type Rules } from "../src/model.ts";

const SEATS = ["A01", "A02", "A03", "A04"];
const SUITS = ["Amber", "Cobalt", "Moss"].map((name) => ({ name, ranks: 4 }));
const RULES: Rules = { handSize: 2, maxSignals: 3, maxStrikes: 2, refillOnTower: true, strikePenalty: 0 };

/** A game on a fixed deck order, first card first. */
function gameOn(deck: readonly string[], rules: Rules = RULES): { core: TowerGame; draw: (seat: string) => string | undefined } {
	const pile = [...deck];
	const draw = (): string | undefined => pile.shift();
	return { core: newGame(SEATS, SUITS, rules, "A01", pile.length, draw), draw };
}

// A01: Amber 1, Moss 2 · A02: Amber 2, Cobalt 1 · A03: Moss 1, Cobalt 3 · A04: Amber 3, Cobalt 2; then the pile.
const DECK = ["Amber 1", "Amber 2", "Moss 1", "Amber 3", "Moss 2", "Cobalt 1", "Cobalt 3", "Cobalt 2", "Amber 4", "Moss 3", "Cobalt 4", "Moss 4"];

describe("the rules", () => {
	it("deals in seat order and lights a tower in rank order", () => {
		const { core, draw } = gameOn(DECK);
		expect(core.hands.A01?.map((slot) => slot.card)).toEqual(["Amber 1", "Moss 2"]);
		expect(core.pile).toBe(4);
		expect(isPlayable(core, "Amber 1")).toBe(true);
		expect(isPlayable(core, "Amber 2")).toBe(false);
		const outcome = play(core, 0, RULES, draw);
		expect(outcome).toMatchObject({ card: "Amber 1", lit: true, drawn: "Amber 4" });
		expect(core.hands.A01?.map((slot) => slot.card)).toEqual(["Moss 2", "Amber 4"]);
		expect(core.actor).toBe("A02");
		expect(nextRank(core, "Amber")).toBe(2);
	});

	it("loses a misfired card with a strike and bridges its rank", () => {
		const { core, draw } = gameOn(DECK);
		play(core, 1, RULES, draw); // A01 plays Moss 2 before Moss 1: misfire.
		expect(core.strikes).toBe(1);
		expect(core.lost).toEqual(["Moss 2"]);
		expect(nextRank(core, "Moss")).toBe(1);
		core.lit.push("Moss 1");
		expect(nextRank(core, "Moss")).toBe(3);
	});

	it("tells touched cards the suit or rank and the others the 'not', and spends a signal", () => {
		const { core } = gameOn(DECK);
		expect(signalProblem(core, "A01", { suit: "Amber" })).toBe("SELF_SIGNAL");
		expect(signalProblem(core, "A02", { suit: "Moss" })).toBe("TOUCHES_NOTHING");
		expect(signal(core, "A02", { suit: "Cobalt" }, RULES)).toEqual([1]);
		const [first, second] = core.hands.A02 ?? [];
		expect(first?.know).toEqual({ suit: null, rank: null, notSuits: ["Cobalt"], notRanks: [] });
		expect(second?.know.suit).toBe("Cobalt");
		expect(second?.focus).toBe(1);
		expect(core.signals).toBe(2);
		// A02 sees every other hand: Cobalt 3 and Cobalt 2 are elsewhere, so its Cobalt slot is Cobalt 1 or 4.
		expect(candidates(core, "A02", 1)).toEqual(["Cobalt 1", "Cobalt 4"]);
		expect(surePlayable(core, "A02", 1)).toBe(false);
		core.actor = "A03";
		signal(core, "A02", { rank: 1 }, RULES);
		expect(candidates(core, "A02", 1)).toEqual(["Cobalt 1"]);
		expect(surePlayable(core, "A02", 1)).toBe(true);
	});

	it("reads a signal's subject, any case, and refuses a discard's signal above the cap", () => {
		const { core, draw } = gameOn(DECK);
		expect(parseAbout(core, " moss ")).toEqual({ suit: "Moss" });
		expect(parseAbout(core, "3")).toEqual({ rank: 3 });
		expect(parseAbout(core, "9")).toBeUndefined();
		expect(parseAbout(core, "Ember")).toBeUndefined();
		core.signals = 1;
		discard(core, 0, RULES, draw);
		expect(core.signals).toBe(2);
		expect(core.lost).toEqual(["Amber 1"]);
	});

	it("goes on after the last draw until a whole round lights nothing", () => {
		const { core, draw } = gameOn(DECK);
		for (let turn = 0; turn < 4; turn++) discard(core, 0, { ...RULES, maxSignals: 9 }, draw);
		expect(core.pile).toBe(0);
		expect(core.dark).toBe(0);
		for (let turn = 0; turn < 3; turn++) discard(core, 0, { ...RULES, maxSignals: 9 }, draw);
		expect(core.over).toBeNull();
		discard(core, 0, { ...RULES, maxSignals: 9 }, draw);
		expect(core.over).toBe("dark");
	});

	it("ends at the last strike", () => {
		const { core, draw } = gameOn(DECK);
		play(core, 1, RULES, draw);
		play(core, 0, RULES, draw);
		expect(core.over).toBe("strikes");
	});

	it("soft strikes: the last strike does not end the game, and every misfire from it on costs points", () => {
		const soft: Rules = { ...RULES, strikePenalty: 3 };
		const { core, draw } = gameOn(DECK, soft);
		play(core, 0, soft, draw); // A01 lights Amber 1
		play(core, 1, soft, draw); // A02 lights Cobalt 1
		expect(core.lit).toHaveLength(2);
		play(core, 1, soft, draw); // A03 misfires Cobalt 3
		play(core, 0, soft, draw); // A04 misfires Amber 3
		expect(core.strikes).toBe(2);
		expect(core.over).toBeNull();
		expect(penaltyStrikes(core, soft)).toBe(1);
		expect(scoreOf(core, soft)).toBe(2 - 3);
		expect(scoreOf(core, RULES)).toBe(2);
	});

	it("lets the bot play a sure card, point at a playable card as the newest touched, and score a deal", () => {
		const { core } = gameOn(DECK);
		// A01 knows nothing; A02's Cobalt 1 is playable and the newest card of a "Cobalt" signal.
		expect(botAction(core, RULES)).toEqual({ kind: "signal", to: "A02", about: { rank: 1 } });
		const full = deckOf(SUITS);
		expect(botScore(SEATS, SUITS, RULES, "A01", full)).toBe(botScore(SEATS, SUITS, RULES, "A01", full));
		expect(botScore(SEATS, SUITS, RULES, "A01", full)).toBeGreaterThan(0);
	});
});
