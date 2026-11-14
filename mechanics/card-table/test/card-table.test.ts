// SPDX-License-Identifier: Apache-2.0
/** The card-table mechanic: the deck, card names a model may write, the seeded deal and private hands (offline). */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { defineGame, defineHead, defineMechanic, reply, type Game } from "@swarmtales/sdk";
import { checkOptionsDocumented, checkPackage, fakeDriver, testKernel, type TestKernel } from "@swarmtales/testkit";
import { CardTableService, deckOf, parseCard, renderHand, sortHand } from "../src/contract.ts";
import { cardTable } from "../src/index.ts";

const SUITS = [
	{ name: "Ash", ranks: 10 },
	{ name: "Brine", ranks: 9 },
	{ name: "Ember", ranks: 6 },
];
const prompts = { render: (_owner: string, id: string) => id };

/** A test mechanic that drives the card table through its service. */
const dealer = defineMechanic(
	defineHead({
		id: "dealer",
		package: "@test/dealer",
		summary: "Test: drives the card table.",
		requires: [CardTableService],
		tools: { probe: { description: "probe", params: Type.Object({ op: Type.String(), resident: Type.Optional(Type.String()), card: Type.Optional(Type.String()), cards: Type.Optional(Type.Integer()) }), for: ["resident"] } },
	}),
	{
		tools: {
			probe: {
				run: (params, ctx) => {
					const resident = params.resident ?? "";
					const card = params.card ?? "";
					const ops: Readonly<Record<string, () => unknown>> = {
						deal: () => ctx.call(CardTableService, "deal", { cards: params.cards ?? 0 }),
						take: () => ctx.call(CardTableService, "take", { resident, card }),
						give: () => ctx.call(CardTableService, "give", { resident, card }),
						stock: () => ctx.call(CardTableService, "stock", {}),
						draw: () => ctx.call(CardTableService, "draw", { resident }),
						holds: () => ctx.call(CardTableService, "holds", { resident, card }),
						seats: () => ctx.call(CardTableService, "seats", {}),
						hand: () => ctx.call(CardTableService, "hand", { resident }),
					};
					return reply(JSON.stringify(ops[params.op]?.() ?? null));
				},
			},
		},
	},
);

function tableGame(options: Parameters<typeof cardTable>[0] = {}, seed = 3): Game {
	return defineGame({ id: "card-table-test", seed, residents: ["A01", "A02", "A03"], mechanics: [cardTable({ suits: SUITS, ...options }), dealer()], scheduler: { id: "turns", options: { passes: 1, activation: "onNews" } }, end: { ticks: 5 } });
}

const start = (options: Parameters<typeof cardTable>[0] = {}, seed = 3): TestKernel => testKernel(tableGame(options, seed), { prompts });

async function probe(test: TestKernel, params: Readonly<Record<string, unknown>>): Promise<unknown> {
	const outcome = await test.call("A01", "probe", params);
	if (!outcome.ok) throw new RangeError(`probe refused: ${outcome.code}`);
	const parsed: unknown = JSON.parse(outcome.reply);
	return parsed;
}

const handOf = async (test: TestKernel, resident: string): Promise<string[]> => {
	const hand = await probe(test, { op: "hand", resident });
	return Array.isArray(hand) ? hand.map(String) : [];
};

describe("the deck", () => {
	it("has the ranks 1 to n of every suit, in order", () => {
		expect(deckOf(SUITS)).toHaveLength(25);
		expect(deckOf(SUITS).slice(9, 11)).toEqual(["Ash 10", "Brine 1"]);
	});

	it("reads the card names a model writes", () => {
		for (const text of ["Ember 4", "ember4", "E4", "e 4", "4 Ember", "4 of Ember", "Ember-4", " EMBER 4 "]) expect(parseCard(text, SUITS)).toBe("Ember 4");
		for (const text of ["Ember 7", "Smoke 2", "Ash", "7", "Ash 2 Brine 3", "A 0"]) expect(parseCard(text, SUITS)).toBeUndefined();
	});

	it("sorts and shows a hand by suit", () => {
		const hand = ["Ember 2", "Ash 9", "Ash 1", "Brine 5"];
		expect(sortHand(hand, SUITS)).toEqual(["Ash 1", "Ash 9", "Brine 5", "Ember 2"]);
		expect(renderHand(hand, SUITS)).toBe("Ash: 1 9 · Brine: 5 · Ember: 2");
		expect(renderHand([], SUITS)).toBe("(no cards)");
	});

	it("refuses decks with clashing suit names, and seats that are no residents or sit twice", () => {
		const bad = [
			{ name: "Ash", ranks: 3 },
			{ name: "Amber", ranks: 3 },
		];
		expect(() => start({ suits: bad })).toThrow(/first letter/);
		expect(() => start({ seats: ["A01", "A09"] })).toThrow(/A09/);
		expect(() => start({ seats: ["A01", "A01"] })).toThrow(/one seat only/);
	});
});

describe("the deal", () => {
	it("deals the same hands for the same seed, other hands for another, and keeps them private", async () => {
		const dealt = async (seed: number) => {
			const test = start({}, seed);
			expect(await probe(test, { op: "deal", cards: 5 })).toBe(1);
			return { test, hands: await Promise.all(["A01", "A02", "A03"].map((resident) => handOf(test, resident))) };
		};
		const one = await dealt(3);
		expect(one.hands.map((hand) => hand.length)).toEqual([5, 5, 5]);
		expect(new Set(one.hands.flat()).size).toBe(15);
		expect((await dealt(3)).hands).toEqual(one.hands);
		expect((await dealt(4)).hands).not.toEqual(one.hands);
		const events = one.test.kernel.log.all().filter((event) => event.type === "cards_dealt");
		expect(events.map((event) => event.audience)).toEqual([["human"]]);
		expect(events[0]?.payload).toEqual({ deal: 1, cards: 5, hands: { A01: one.hands[0], A02: one.hands[1], A03: one.hands[2] } });
		expect(await one.test.call("A02", "viewHand", {})).toMatchObject({ ok: true, reply: `Your hand: ${renderHand(one.hands[1] ?? [], SUITS)}` });
		expect(one.test.fact("card-table.handSizes")).toEqual({ A01: 5, A02: 5, A03: 5 });
		// Each deal has its own stream: the second deal of a run is another shuffle of the whole deck.
		expect(await probe(one.test, { op: "deal", cards: 5 })).toBe(2);
		expect(await Promise.all(["A01", "A02", "A03"].map((resident) => handOf(one.test, resident)))).not.toEqual(one.hands);
	});

	it("seats only the residents of `seats`, refuses the hand of the others and a deal above the deck", async () => {
		const test = start({ seats: ["A03", "A01"] });
		expect(await probe(test, { op: "seats" })).toEqual(["A03", "A01"]);
		await probe(test, { op: "deal", cards: 12 });
		expect(await test.call("A02", "viewHand", {})).toMatchObject({ ok: false, code: "NO_SEAT" });
		expect(await handOf(test, "A02")).toEqual([]);
		await expect(probe(test, { op: "deal", cards: 13 })).rejects.toThrow(/need more than the deck's 25/);
	});

	it("takes a held card from a hand and gives it back", async () => {
		const test = start();
		await probe(test, { op: "deal", cards: 2 });
		const [card] = await handOf(test, "A01");
		if (card === undefined) throw new RangeError("no card");
		expect(await probe(test, { op: "take", resident: "A02", card })).toBe(false);
		expect(await probe(test, { op: "take", resident: "A01", card })).toBe(true);
		expect(await probe(test, { op: "holds", resident: "A01", card })).toBe(false);
		await probe(test, { op: "give", resident: "A01", card });
		expect(await handOf(test, "A01")).toContain(card);
	});
});

describe("the draw pile", () => {
	it("holds the rest of the deck after a deal and moves its top card into a hand", async () => {
		const test = start();
		await probe(test, { op: "deal", cards: 0 });
		const stock = await probe(test, { op: "stock" });
		if (!Array.isArray(stock)) throw new RangeError("no stock");
		expect(stock).toHaveLength(SUITS.reduce((sum, suit) => sum + suit.ranks, 0));
		expect(await probe(test, { op: "draw", resident: "A02" })).toBe(stock[0]);
		expect(await handOf(test, "A02")).toEqual([stock[0]]);
		expect(await probe(test, { op: "stock" })).toEqual(stock.slice(1));
		for (let index = 1; index < stock.length; index++) await probe(test, { op: "draw", resident: "A01" });
		expect(await probe(test, { op: "draw", resident: "A01" })).toBeNull();
	});
});

describe("the slice", () => {
	it("survives a snapshot: the resumed table holds the hands and the pile, and deals the next deal as the first run does", async () => {
		const first = start();
		await probe(first, { op: "deal", cards: 4 });
		await probe(first, { op: "draw", resident: "A03" });
		const snapshot: unknown = JSON.parse(JSON.stringify(first.kernel.snapshot()));
		const log: readonly unknown[] = first.kernel.log.all().map((event): unknown => JSON.parse(JSON.stringify(event)));
		const resumed = testKernel(tableGame(), { prompts, resume: { snapshot, log } });
		expect(resumed.kernel.snapshot()).toEqual(snapshot);
		expect(await handOf(resumed, "A03")).toHaveLength(5);
		for (const test of [first, resumed]) expect(await probe(test, { op: "deal", cards: 3 })).toBe(2);
		expect(await probe(resumed, { op: "stock" })).toEqual(await probe(first, { op: "stock" }));
		expect(await handOf(resumed, "A02")).toEqual(await handOf(first, "A02"));
	});
});

describe("module conformance", () => {
	it("agrees with its package and documents every option", () => {
		const packageJson: unknown = JSON.parse(readFileSync(join(import.meta.dirname, "..", "package.json"), "utf8"));
		expect(checkPackage(cardTable, packageJson)).toEqual([]);
		expect(checkOptionsDocumented(cardTable)).toEqual([]);
	});

	it("gives the fake driver a call of viewHand for every seat, and none for a resident without one", async () => {
		const game = defineGame({ id: "card-table-fake", seed: 3, residents: ["A01", "A02", "A03"], mechanics: [cardTable({ suits: SUITS, seats: ["A01", "A03"] })], end: { ticks: 3 } });
		const test = testKernel(game, { prompts });
		await test.playTicks(fakeDriver(test.kernel, 7), 3);
		const events = test.kernel.log.all();
		const callers = new Set(events.filter((event) => event.type === "tool_called").map((event) => event.actor));
		expect([...callers].sort()).toEqual(["resident:A01", "resident:A03"]);
		expect(events.filter((event) => event.type === "tool_refused")).toEqual([]);
	});
});
