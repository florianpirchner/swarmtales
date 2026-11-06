/** The hold'em story through the real mechanics, offline: the cards, the betting, a scripted match (docs/ideas/game-roadmap.md §2.5). */
import { describe, expect, it } from "vitest";
import type { CoreStory, EventEnvelope, RandomSource, TurnTaker } from "@swarmtales/contracts";
import { createHost, residentActor } from "@swarmtales/kernel";
import { createPromptLookup } from "@swarmtales/prompts";
import { checkDeterminism, checkSnapshotRoundTrip, idleAgent, playStory } from "@swarmtales/testkit";
import { describe as describeHand, describeWith, equity, evaluate } from "../../mechanics/holdem/src/cards.ts";
import { baselineOf, evLossOf, newHand, normalise, play, settle, type Limits } from "../../mechanics/holdem/src/model.ts";
import { holdemStory, type HoldemOptions } from "../../stories/holdem/story.ts";
import { findCoreStory } from "../../stories/index.ts";
import { field, ofType } from "./tictactoe-support.ts";

const as = residentActor;
const LIMITS: Limits = { smallBlind: 1, bigBlind: 2, smallBet: 2, bigBet: 4, cap: 4 };

function story(extra: HoldemOptions = {}): CoreStory {
	const base = holdemStory({ equitySamples: 20, ...extra });
	return { ...base, turns: { ...base.turns, order: (view) => view.residents } };
}

const options = (extra: HoldemOptions = {}) => ({ story: story(extra), prompts: createPromptLookup() });

/** A seeded stream for the pure functions (mulberry32). */
function stream(seed: number): RandomSource {
	let state = seed >>> 0;
	const next = (): number => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	return {
		next,
		int: (min, max) => min + Math.floor(next() * (max - min + 1)),
		pick: (items) => {
			const item = items[Math.floor(next() * items.length)];
			if (item === undefined) throw new RangeError("pick() on an empty list");
			return item;
		},
		shuffle: (items) => [...items],
	};
}

/**
 * A01 bets and raises whenever it may, A02 calls everything, A03 never puts a chip in voluntarily (checks or
 * folds), A04 plays a pair or an ace and folds the rest. Stateless: it reads the table on every turn.
 */
const player: TurnTaker = async (turn) => {
	const told = turn.inputs.map((note) => note.text).join("\n");
	if (told.includes("Retro after game") || told.includes("Before game 1")) {
		await turn.call("writeBrain", { text: `${turn.resident}: play the hands my rule says, from any position.` });
		return;
	}
	if (!told.includes("Your turn (")) return;
	const view = await turn.call("viewTable", {});
	if (!view.ok) return;
	const cards = /Your cards: (\S\S) (\S\S)/.exec(view.reply);
	const facing = !/\b0 to call/.test(view.reply);
	const canRaise = /You may [^.]*(bet|raise)/.test(view.reply);
	const strong = cards !== null && (cards[1]?.[0] === cards[2]?.[0] || cards[1]?.[0] === "A" || cards[2]?.[0] === "A");
	const action = turn.resident === "A01" ? (canRaise ? "raise" : "call") : turn.resident === "A02" ? "call" : turn.resident === "A03" ? (facing ? "fold" : "check") : strong ? "call" : facing ? "fold" : "check";
	await turn.call("act", { action, reason: `script ${turn.resident}` });
};

const audienceOf = (event: EventEnvelope): string => JSON.stringify(event.audience);

describe("holdem cards", () => {
	it("ranks the hand categories and their kickers", () => {
		const order = [
			["As", "Ks", "Qs", "Js", "Ts", "2d", "3c"], // royal flush
			["9h", "9d", "9s", "9c", "2h", "3d", "4c"], // four nines
			["Kh", "Kd", "Ks", "2c", "2h", "7d", "8c"], // kings full of twos
			["Ah", "Jh", "8h", "4h", "2h", "Kd", "Kc"], // ace-high flush (a pair of kings too)
			["5h", "6d", "7s", "8c", "9h", "Kd", "Kc"], // nine-high straight
			["Ah", "2d", "3s", "4c", "5h", "Kd", "Qc"], // the wheel, five high
			["7h", "7d", "7s", "Ac", "2h", "4d", "9c"], // three sevens
			["Ah", "Ad", "8s", "8c", "Kh", "4d", "4c"], // two pair, aces and eights, king kicker
			["Ah", "Ad", "8s", "8c", "Qh", "4d", "4c"], // the same two pair, queen kicker
			["Jh", "Jd", "As", "9c", "7h", "4d", "2c"], // pair of jacks
			["Ah", "Kd", "9s", "7c", "5h", "4d", "2c"], // ace high
		];
		const values = order.map((cards) => evaluate(cards));
		for (let index = 1; index < values.length; index++) expect(values[index - 1]).toBeGreaterThan(values[index] ?? 0);
		expect(order.map((cards) => describeHand(cards))).toEqual([
			"royal flush",
			"four nines",
			"full house, kings full of twos",
			"flush, ace high",
			"straight, nine high",
			"straight, five high",
			"three sevens",
			"two pair, aces and eights",
			"two pair, aces and eights",
			"pair of jacks",
			"ace high",
		]);
		// The board plays: both hands are the same straight, a tie.
		expect(evaluate(["2c", "3d", "5h", "6s", "7c", "8d", "9h"])).toBe(evaluate(["Kc", "Qd", "5h", "6s", "7c", "8d", "9h"]));
	});

	it("says when the best hand comes from the board alone", () => {
		// Run 001: two aces on the board, a seat with 4h 2h read "pair of aces" as its own hand (P132).
		expect(describeWith(["4h", "2h"], ["6h", "Qd", "Jh", "Ac", "As"])).toBe("pair of aces, all from the board (your own cards add at most a kicker)");
		expect(describeWith(["Ah", "Kd"], ["Ac", "7s", "2d"])).toBe("pair of aces");
		expect(describeWith(["Qc", "9s"], ["6h", "Qd", "Jh", "Ac", "As"])).toBe("two pair, aces and queens");
	});

	it("estimates equity against random hands", () => {
		const aces = equity(["As", "Ah"], [], 1, 3000, stream(7));
		expect(aces).toBeGreaterThan(0.8);
		expect(aces).toBeLessThan(0.89);
		const trash = equity(["7c", "2d"], [], 3, 2000, stream(7));
		expect(trash).toBeLessThan(0.2);
		// A made flush on the river against one hand wins almost always.
		expect(equity(["Ah", "Kh"], ["2h", "7h", "9h", "Jc", "3d"], 1, 500, stream(3))).toBeGreaterThan(0.95);
	});
});

describe("holdem betting", () => {
	const holes = [["As", "Ah"], ["Kd", "Kc"], ["7s", "2d"], ["9c", "9d"]];
	const runout = ["Ac", "8h", "3s", "Jd", "4c"];

	it("posts the blinds, starts after the big blind and caps the betting at four bets", () => {
		const hand = newHand(1, ["A01", "A02", "A03", "A04"], 0, holes, runout, LIMITS);
		expect(hand.invested).toEqual({ A01: 0, A02: 1, A03: 2, A04: 0 });
		expect(hand.toAct).toBe("A04");
		expect(normalise(hand, "check", LIMITS)).toEqual({ problem: "You cannot check: 2 to call. Fold, call or raise." });
		play(hand, "raise", LIMITS); // A04 to 4: bet 2
		play(hand, "raise", LIMITS); // A01 to 6: bet 3
		play(hand, "raise", LIMITS); // A02 to 8: bet 4, the cap
		expect(JSON.stringify(normalise(hand, "raise", LIMITS))).toContain("capped");
		play(hand, "fold", LIMITS); // A03
		play(hand, "call", LIMITS); // A04
		play(hand, "call", LIMITS); // A01
		expect(hand.street).toBe("flop");
		expect(hand.board).toEqual(["Ac", "8h", "3s"]);
		// After the flop the first seat left of the button acts (A02, the small blind).
		expect(hand.toAct).toBe("A02");
		expect(normalise(hand, "call", LIMITS)).toEqual({ done: "check" });
		expect(normalise(hand, "raise", LIMITS)).toEqual({ done: "bet" });
	});

	it("plays heads-up with the button on the small blind, first before the flop and last after it", () => {
		const hand = newHand(1, ["A01", "A02"], 1, holes, runout, LIMITS);
		expect(hand.invested).toEqual({ A01: 2, A02: 1 });
		expect(hand.toAct).toBe("A02");
		play(hand, "call", LIMITS);
		// The big blind has its option.
		expect(hand.toAct).toBe("A01");
		play(hand, "check", LIMITS);
		expect(hand.street).toBe("flop");
		expect(hand.toAct).toBe("A01");
		for (let step = 0; step < 6; step++) play(hand, "check", LIMITS);
		expect(hand.over).toBe(true);
		const result = settle(hand);
		// A02 (button) holds aces: three aces on the board's ace.
		expect(result).toMatchObject({ showdown: true, winners: ["A02"], pot: 4, net: { A01: -2, A02: 2 } });
		expect(result.shown.find((entry) => entry.seat === "A02")?.best).toBe("three aces");
	});

	it("splits a tied pot and gives the odd chip to the first winner after the button", () => {
		const hand = newHand(1, ["A01", "A02", "A03"], 0, [["2c", "3d"], ["2d", "3c"], ["4h", "5s"]], ["Ah", "Kh", "Qh", "Jh", "Th"], LIMITS);
		play(hand, "call", LIMITS); // A01 button
		play(hand, "fold", LIMITS); // A02 small blind: 1 in
		play(hand, "check", LIMITS); // A03 big blind
		for (let step = 0; step < 6; step++) play(hand, "check", LIMITS);
		const result = settle(hand);
		// The royal flush on the board plays for both: 5 chips split 3 (A03, first after the button) and 2.
		expect(result.winners).toEqual(["A03", "A01"]);
		expect(result.net).toEqual({ A01: 0, A02: -1, A03: 1 });
	});

	it("scores a decision against the pot-odds baseline", () => {
		expect(baselineOf(0.2, 2, 10, 2, true)).toMatchObject({ baseline: "call" });
		expect(baselineOf(0.1, 2, 10, 2, true)).toMatchObject({ baseline: "fold" });
		expect(baselineOf(0.8, 0, 10, 2, true)).toMatchObject({ baseline: "bet" });
		// Folding 50% equity with 2 to call into 10: gives up 0.5 x 12 - 2 = 4.
		expect(evLossOf("fold", 0.5, 2, 10)).toBe(4);
		// Calling 10% equity: loses 2 - 0.1 x 12 = 0.8.
		expect(evLossOf("call", 0.1, 2, 10)).toBe(0.8);
		expect(evLossOf("raise", 0.9, 2, 10)).toBe(0);
	});
});

describe("holdem, scripted match", () => {
	it("plays four games of eight duplicate hands with private cards, scored decisions and a brain per seat", async () => {
		const run = await playStory(options(), player);
		expect(run.end).toMatchObject({ reason: "referee", limit: "holdem.match" });
		const ended = ofType(run.events, "hand_ended");
		expect(ended).toHaveLength(32);
		for (const event of ended) {
			const net: unknown = field(event, "net");
			const values = typeof net === "object" && net !== null ? Object.values(net).map(Number) : [];
			expect(values.reduce((sum, value) => sum + value, 0)).toBe(0);
		}
		for (const type of ["cards_dealt", "decision_scored", "game_scored"]) expect(ofType(run.events, type).every((event) => audienceOf(event) === JSON.stringify(["human"]))).toBe(true);
		expect(ofType(run.events, "action_taken").every((event) => audienceOf(event) !== JSON.stringify(["human"]))).toBe(true);
		// No decision missed; a reason never reaches a public event.
		expect(ofType(run.events, "decision_scored").every((event) => field(event, "missed") === false)).toBe(true);
		expect(ofType(run.events, "action_taken").some((event) => field(event, "reason") !== undefined)).toBe(false);

		// Duplicate: game 2 hand 1 deals the button's cards of game 1 hand 1 to the next seat, and the same board.
		const dealt = ofType(run.events, "cards_dealt");
		const at = (game: number, hand: number) => dealt.find((event) => field(event, "game") === game && field(event, "hand") === hand);
		const holes = (game: number, hand: number, seat: string): unknown => {
			const event = at(game, hand);
			const all: unknown = event === undefined ? undefined : field(event, "holes");
			return typeof all === "object" && all !== null ? Reflect.get(all, seat) : undefined;
		};
		const runoutOf = (game: number, hand: number): unknown => {
			const event = at(game, hand);
			return event === undefined ? undefined : field(event, "runout");
		};
		expect(holes(2, 1, "A02")).toEqual(holes(1, 1, "A01"));
		expect(holes(4, 1, "A04")).toEqual(holes(1, 1, "A01"));
		expect(runoutOf(3, 5)).toEqual(runoutOf(1, 5));

		// A03 never puts a chip in voluntarily; A01 raises whenever it may.
		const stats = ofType(run.events, "game_scored").map((event) => field(event, "stats"));
		expect(stats).toHaveLength(4);
		for (const game of stats) {
			expect(game).toMatchObject({ A03: { vpip: 0, pfr: 0 }, A01: { vpip: 1, pfr: 1 } });
		}
		// The match totals are the sum of the games.
		const totals = ofType(run.events, "match_ended").map((event) => field(event, "scores"));
		const games = ofType(run.events, "game_ended").map((event) => field(event, "scores"));
		const sum = (seat: string): number => games.reduce<number>((acc, scores) => acc + Number(typeof scores === "object" && scores !== null ? Reflect.get(scores, seat) : 0), 0);
		expect(totals).toEqual([{ A01: sum("A01"), A02: sum("A02"), A03: sum("A03"), A04: sum("A04") }]);
		// A first brain before game 1 and a new one after games 1 to 3, for each seat.
		expect(ofType(run.events, "brain_written")).toHaveLength(16);
	});

	it("checks or folds for a seat that does not act and still ends the match", async () => {
		const run = await playStory(options({ brain: false }), idleAgent);
		expect(run.end).toMatchObject({ reason: "referee", limit: "holdem.match" });
		const decisions = ofType(run.events, "decision_scored");
		expect(decisions.length).toBeGreaterThan(0);
		expect(decisions.every((event) => field(event, "missed") === true && field(event, "done") === "fold")).toBe(true);
		// Everyone folds to the big blind, which wins the small blind: each seat is each blind twice a game, so all end on 0.
		expect(ofType(run.events, "match_ended").map((event) => field(event, "scores"))).toEqual([{ A01: 0, A02: 0, A03: 0, A04: 0 }]);
	});

	it("opens act only for the seat to act and refuses illegal actions", async () => {
		const host = createHost(options({ seats: 2, brain: false }));
		host.start();
		// Hand 1: the button A01 posts the small blind and acts first.
		expect(host.openTools("A01")).toContain("act");
		expect(host.openTools("A02")).not.toContain("act");
		expect(await host.call(as("A02"), "act", { action: "call" })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(await host.call(as("A01"), "act", { action: "check" })).toMatchObject({ ok: false, code: "ILLEGAL_ACTION" });
		expect(await host.call(as("A01"), "act", { action: "raise", reason: "a bluff" })).toMatchObject({ ok: true });
		expect(host.openTools("A02")).toContain("act");
		expect(await host.call(as("A02"), "act", { action: "fold" })).toMatchObject({ ok: true });
		const result = ofType(host.log.all(), "hand_ended")[0];
		expect(result === undefined ? undefined : field(result, "net")).toEqual({ A01: 2, A02: -2 });
		// Hand 2: the button moved to A02.
		expect(host.openTools("A02")).toContain("act");
		const view = await host.call(as("A01"), "viewTable", {});
		expect(view.ok && view.reply).toContain("Hand 1 result: everyone else folded on the preflop, A01 (you) won the pot of 6; your points +2.");
	});

	it("keeps a brain only for the brain seats of a mixed table", async () => {
		const run = await playStory(options({ brainSeats: ["A01", "A03"], games: 2, hands: 2 }), player);
		expect(run.end).toMatchObject({ reason: "referee", limit: "holdem.match" });
		const authors = new Set(ofType(run.events, "brain_written").map((event) => field(event, "author")));
		expect(authors).toEqual(new Set(["A01", "A03"]));
		expect(ofType(run.events, "brain_written")).toHaveLength(4);
	});

	it("is registered with its arms", () => {
		for (const name of ["holdem", "holdem-nobrain", "holdem-mixed", "holdem-hu", "holdem-hu-nobrain"]) expect(findCoreStory(name)?.story.id).toBe(name);
	});

	it("is deterministic and survives a snapshot round trip inside a hand and inside a retro window", async () => {
		const small = { games: 2, hands: 3 };
		expect(await checkDeterminism(options(small), () => player)).toEqual([]);
		for (const cut of [0, 2, 5]) expect(await checkSnapshotRoundTrip(options(small), () => player, cut)).toEqual([]);
	});
});
