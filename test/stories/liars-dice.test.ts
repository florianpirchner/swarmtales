/** Liar's dice through the real mechanics, offline: the bid order, the probabilities, a scripted match (docs/ideas/game-roadmap.md §2.10). */
import { describe, expect, it } from "vitest";
import type { CoreStory, EventEnvelope, TurnTaker } from "@swarmtales/contracts";
import { createHost, residentActor } from "@swarmtales/kernel";
import { createPromptLookup } from "@swarmtales/prompts";
import { checkDeterminism, checkSnapshotRoundTrip, idleAgent, playStory } from "@swarmtales/testkit";
import { atLeast, baselineOf, beats, bidProblem, countFor, legalBids, minimalRaise, nextLive, truthOf, type Rules } from "../../mechanics/liars-dice/src/model.ts";
import { liarsDiceStory, type LiarsDiceOptions } from "../../stories/liars-dice/story.ts";
import { findCoreStory } from "../../stories/index.ts";
import { field, ofType } from "./tictactoe-support.ts";

const as = residentActor;
const WILD: Rules = { faces: 6, wildOnes: true };
const PLAIN: Rules = { faces: 6, wildOnes: false };

function story(extra: LiarsDiceOptions = {}): CoreStory {
	const base = liarsDiceStory(extra);
	return { ...base, turns: { ...base.turns, order: (view) => view.residents } };
}

const options = (extra: LiarsDiceOptions = {}) => ({ story: story(extra), prompts: createPromptLookup() });

/**
 * A01 calls liar on every bid it faces, A02 bids one more die on its most common face with a public remark,
 * A03 makes the smallest raise, A04 calls once a bid names more than half the table. Stateless: it reads its turn line.
 */
const player: TurnTaker = async (turn) => {
	const told = turn.inputs.map((note) => note.text).join("\n");
	if (told.includes("Retro after game") || told.includes("Before game 1")) {
		await turn.call("writeBrain", { text: `${turn.resident}: call high bids, bid my own dice.` });
		return;
	}
	const line = /Your turn \(round \d+\)\. Your dice: ([\d ]+)\. Dice on the table: (\d+)\. The standing bid: ([^.]+)\./.exec(told);
	if (line === null) return;
	const dice = (line[1] ?? "").split(" ").map(Number);
	const total = Number(line[2]);
	const standing = /^(\d+) x (\d+) by/.exec(line[3] ?? "");
	const prev = standing === null ? undefined : { quantity: Number(standing[1]), face: Number(standing[2]) };
	const minimal = minimalRaise(prev, total, WILD);
	if (prev !== undefined && (turn.resident === "A01" || minimal === undefined || (turn.resident === "A04" && prev.quantity > total / 2))) {
		await turn.call("liar", { reason: `script ${turn.resident}` });
		return;
	}
	if (turn.resident === "A02") {
		const faces = [2, 3, 4, 5, 6];
		const face = faces.reduce((best, next) => (countFor(dice, next, WILD) > countFor(dice, best, WILD) ? next : best), 2);
		const quantity = prev === undefined ? 1 : face > prev.face ? prev.quantity : prev.quantity + 1;
		if (quantity <= total) {
			await turn.call("bid", { quantity, face, say: `I have plenty of ${String(face)}s`, reason: "my most common face" });
			return;
		}
	}
	if (minimal === undefined) return;
	await turn.call("bid", { ...minimal, reason: `script ${turn.resident}` });
};

const audienceOf = (event: EventEnvelope): string => JSON.stringify(event.audience);

describe("liar's dice rules", () => {
	it("orders bids by quantity, then face, and refuses bids that do not beat or fit", () => {
		expect(beats({ quantity: 3, face: 2 }, { quantity: 2, face: 6 })).toBe(true);
		expect(beats({ quantity: 2, face: 5 }, { quantity: 2, face: 4 })).toBe(true);
		expect(beats({ quantity: 2, face: 4 }, { quantity: 2, face: 4 })).toBe(false);
		expect(beats({ quantity: 1, face: 6 }, { quantity: 2, face: 2 })).toBe(false);
		expect(bidProblem({ quantity: 2, face: 1 }, undefined, 16, WILD)).toContain("ones are wild");
		expect(bidProblem({ quantity: 2, face: 1 }, undefined, 16, PLAIN)).toBeUndefined();
		expect(bidProblem({ quantity: 17, face: 3 }, undefined, 16, WILD)).toContain("only 16 dice");
		expect(bidProblem({ quantity: 3, face: 3 }, { quantity: 3, face: 4 }, 16, WILD)).toContain("must beat 3 x 4");
		expect(minimalRaise(undefined, 4, WILD)).toEqual({ quantity: 1, face: 2 });
		expect(minimalRaise({ quantity: 2, face: 6 }, 4, WILD)).toEqual({ quantity: 3, face: 2 });
		expect(minimalRaise({ quantity: 4, face: 6 }, 4, WILD)).toBeUndefined();
		expect(legalBids({ quantity: 1, face: 5 }, 2, WILD)).toEqual([
			{ quantity: 1, face: 6 },
			{ quantity: 2, face: 2 },
			{ quantity: 2, face: 3 },
			{ quantity: 2, face: 4 },
			{ quantity: 2, face: 5 },
			{ quantity: 2, face: 6 },
		]);
	});

	it("counts wild ones and computes the chance a bid is true from the own dice", () => {
		expect(countFor([1, 4, 4, 2, 1], 4, WILD)).toBe(4);
		expect(countFor([1, 4, 4, 2, 1], 4, PLAIN)).toBe(2);
		expect(atLeast(0, 5, 0.3)).toBe(1);
		expect(atLeast(6, 5, 0.3)).toBe(0);
		expect(atLeast(1, 1, 1 / 3)).toBeCloseTo(1 / 3, 10);
		expect(atLeast(2, 3, 0.5)).toBeCloseTo(0.5, 10);
		// Holding two 4s (one wild), 2 x 4 is certain; 3 x 4 needs one of the 12 unseen dice to show a 4 or a 1.
		expect(truthOf({ quantity: 2, face: 4 }, [1, 4, 6, 6], 12, WILD)).toBe(1);
		expect(truthOf({ quantity: 3, face: 4 }, [1, 4, 6, 6], 12, WILD)).toBeCloseTo(1 - (2 / 3) ** 12, 10);
	});

	it("calls liar in the baseline when the standing bid is unlikely and raises the most likely bid otherwise", () => {
		// 16 dice, about 5.3 count for any face: 12 x 3 is almost surely false.
		expect(baselineOf({ quantity: 12, face: 3 }, [2, 2, 5, 6], 12, WILD).kind).toBe("liar");
		// Two 5s and a wild in hand: the best raise over 2 x 2 names fives.
		const raise = baselineOf({ quantity: 2, face: 2 }, [1, 5, 5, 6], 12, WILD);
		expect(raise.kind).toBe("bid");
		expect(raise.bid?.face).toBe(5);
		expect(baselineOf(undefined, [3, 3, 4, 6], 12, WILD).kind).toBe("bid");
	});

	it("passes the turn to the next seat with dice", () => {
		const seats = ["A01", "A02", "A03", "A04"];
		expect(nextLive(seats, { A01: 2, A02: 0, A03: 1, A04: 3 }, "A01", false)).toBe("A03");
		expect(nextLive(seats, { A01: 2, A02: 0, A03: 1, A04: 3 }, "A04", false)).toBe("A01");
		expect(nextLive(seats, { A01: 2, A02: 0, A03: 1, A04: 3 }, "A02", true)).toBe("A03");
	});
});

describe("liar's dice, scripted match", () => {
	it("plays three games with secret rolls, checked bids, liar calls, places and a brain per seat", async () => {
		const run = await playStory(options(), player);
		expect(run.end).toMatchObject({ reason: "referee", limit: "liars-dice.match" });
		const ended = ofType(run.events, "dice_game_ended");
		expect(ended).toHaveLength(3);
		for (const type of ["dice_rolled", "dice_decision_scored", "dice_game_scored"]) expect(ofType(run.events, type).every((event) => audienceOf(event) === JSON.stringify(["human"]))).toBe(true);
		for (const type of ["dice_bid", "dice_called", "dice_round_started"]) expect(ofType(run.events, type).every((event) => audienceOf(event) !== JSON.stringify(["human"]))).toBe(true);
		// A reason never reaches a public event; the remark does.
		expect(ofType(run.events, "dice_bid").some((event) => field(event, "reason") !== undefined)).toBe(false);
		expect(ofType(run.events, "dice_bid").some((event) => typeof field(event, "say") === "string")).toBe(true);
		expect(ofType(run.events, "dice_decision_scored").every((event) => field(event, "missed") === false)).toBe(true);

		// Every call takes one die and the dice shown match the roll.
		const calls = ofType(run.events, "dice_called");
		const rolls = ofType(run.events, "dice_rolled");
		for (const call of calls) {
			const roll = rolls.find((event) => field(event, "game") === field(call, "game") && field(event, "round") === field(call, "round"));
			const rolled: unknown = roll === undefined ? undefined : field(roll, "dice");
			const shown: unknown = field(call, "dice");
			const sorted = typeof rolled === "object" && rolled !== null ? Object.fromEntries(Object.entries(rolled).filter(([, dice]) => Array.isArray(dice) && dice.length > 0).map(([seat, dice]: [string, number[]]) => [seat, [...dice].sort((a, b) => a - b)])) : undefined;
			expect(shown).toEqual(sorted);
			const bid: unknown = field(call, "bid");
			const face = typeof bid === "object" && bid !== null ? Number(Reflect.get(bid, "face")) : 0;
			const quantity = typeof bid === "object" && bid !== null ? Number(Reflect.get(bid, "quantity")) : 0;
			const all = typeof shown === "object" && shown !== null ? Object.values(shown).flat().map(Number) : [];
			const count = countFor(all, face, WILD);
			expect(field(call, "count")).toBe(count);
			expect(field(call, "loser")).toBe(count >= quantity ? field(call, "seat") : field(call, "bidder"));
		}
		// Places score 3, 2, 1, 0 in every game, and the match totals are their sum.
		for (const event of ended) {
			const points: unknown = field(event, "points");
			const values = typeof points === "object" && points !== null ? Object.values(points).map(Number).sort() : [];
			expect(values).toEqual([0, 1, 2, 3]);
		}
		const stats = ofType(run.events, "dice_game_scored").map((event) => field(event, "stats"));
		expect(stats).toHaveLength(3);
		// Each seat out lost all four dice, the winner fewer; the calls of a game are the dice lost.
		for (const [index, game] of stats.entries()) {
			const seats = typeof game === "object" && game !== null ? Object.values(game).map((seat: { place: number; diceLost: number }) => seat) : [];
			for (const seat of seats) expect(seat.diceLost).toBe(seat.place === 1 ? seat.diceLost : 4);
			expect(seats.find((seat) => seat.place === 1)?.diceLost).toBeLessThan(4);
			expect(calls.filter((call) => field(call, "game") === index + 1)).toHaveLength(seats.reduce((sum, seat) => sum + seat.diceLost, 0));
		}
		expect(ofType(run.events, "brain_written")).toHaveLength(12);
	});

	it("opens with the lowest bid or calls liar for a seat that does not act, and still ends the match", async () => {
		const run = await playStory(options({ brain: false, games: 1 }), idleAgent);
		expect(run.end).toMatchObject({ reason: "referee", limit: "liars-dice.match" });
		const decisions = ofType(run.events, "dice_decision_scored");
		expect(decisions.length).toBeGreaterThan(0);
		expect(decisions.every((event) => field(event, "missed") === true)).toBe(true);
		expect(ofType(run.events, "dice_bid").every((event) => field(event, "quantity") === 1 && field(event, "face") === 2)).toBe(true);
	});

	it("opens the tools only for the seat to act and refuses illegal bids", async () => {
		const host = createHost(options({ brain: false, seats: 2 }));
		host.start();
		expect(host.openTools("A01")).toContain("bid");
		expect(host.openTools("A01")).not.toContain("liar");
		expect(host.openTools("A02")).not.toContain("bid");
		expect(await host.call(as("A02"), "bid", { quantity: 1, face: 3 })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(await host.call(as("A01"), "bid", { quantity: 1, face: 1 })).toMatchObject({ ok: false, code: "ILLEGAL_BID" });
		expect(await host.call(as("A01"), "bid", { quantity: 9, face: 3 })).toMatchObject({ ok: false, code: "ILLEGAL_BID" });
		expect(await host.call(as("A01"), "bid", { quantity: 2, face: 3, say: "lots of threes here", reason: "a bluff" })).toMatchObject({ ok: true });
		expect(host.openTools("A02")).toContain("liar");
		expect(await host.call(as("A02"), "bid", { quantity: 2, face: 2 })).toMatchObject({ ok: false, code: "ILLEGAL_BID" });
		const view = await host.call(as("A02"), "viewTable", {});
		expect(view.ok && view.reply).toContain('A01 bids 2 x 3 ("lots of threes here")');
		expect(view.ok && view.reply).not.toContain("a bluff");
		expect(await host.call(as("A02"), "liar", {})).toMatchObject({ ok: true });
		const call = ofType(host.log.all(), "dice_called")[0];
		expect(call === undefined ? undefined : field(call, "bidder")).toBe("A01");
		// The loser opens round 2.
		const loser = call === undefined ? "" : String(field(call, "loser"));
		expect(host.openTools(loser)).toContain("bid");
	});

	it("is registered with its arms and its names", () => {
		for (const name of ["liars-dice", "liars-dice-nobrain", "liars-dice-quiet", "liars-dice-hu", "liars-dice-hu-nobrain-quiet-g2-d5", "liars-dice-6p-g1"]) expect(findCoreStory(name)?.story.id).toBe(name);
		expect(findCoreStory("liars-dice-d11")).toBeUndefined();
	});

	it("is deterministic and survives a snapshot round trip inside a game and inside a retro window", async () => {
		const small = { games: 2, dice: 2 };
		expect(await checkDeterminism(options(small), () => player)).toEqual([]);
		for (const cut of [0, 2, 5]) expect(await checkSnapshotRoundTrip(options(small), () => player, cut)).toEqual([]);
	});
});
