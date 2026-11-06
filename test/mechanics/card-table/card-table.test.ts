/** The card-table mechanic: the deck, card names a model may write, the seeded deal and private hands (offline). */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Type } from "typebox";
import type { CoreStory, Host } from "@swarmtales/contracts";
import { createHost, defineMechanic, reply } from "@swarmtales/kernel";
import { CardTableApi, cardTable, deckOf, parseCard, renderHand } from "@swarmtales/mechanic-card-table";
import { sortHand } from "../../../mechanics/card-table/src/model.ts";
import { checkOptionsDocumented, checkSourceRules } from "@swarmtales/testkit";

const SUITS = [
	{ name: "Ash", ranks: 10 },
	{ name: "Brine", ranks: 9 },
	{ name: "Ember", ranks: 6 },
];

function tableStory(options: Partial<Parameters<typeof cardTable.with>[0]> = {}, seed = 3): CoreStory {
	return { id: "card-table-test", seed, minutes: 5, residents: ["A01", "A02", "A03"], mechanics: [cardTable.with({ suits: SUITS, ...options })], grants: "auto", turns: { passes: 1, activation: "onNews" } };
}

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

	it("refuses decks with clashing suit names", () => {
		expect(() => createHost({ story: tableStory({ suits: [{ name: "Ash", ranks: 3 }, { name: "Amber", ranks: 3 }] }) })).toThrow(/first letter/);
		expect(() => createHost({ story: tableStory({ seats: ["A01", "A09"] }) })).toThrow(/A09/);
	});
});

/** A test mechanic that drives the card table through its API (actor `script`). */
const dealer = defineMechanic(
	{ id: "dealer", summary: "Test: drives the card table.", options: Type.Object({}), state: () => undefined, events: {}, requires: [CardTableApi], prompts: { probe: [] } },
	(kit) => ({
		tools: [
			kit.tool({
				name: "probe",
				description: "probe",
				parameters: Type.Object({ op: Type.String(), resident: Type.Optional(Type.String()), card: Type.Optional(Type.String()), cards: Type.Optional(Type.Integer()) }),
				suggest: ["script"],
				execute: (params, ctx) => {
					const resident = params.resident ?? "";
					const card = params.card ?? "";
					if (params.op === "deal") return reply(JSON.stringify(ctx.call(CardTableApi, "deal", { cards: params.cards ?? 0 })));
					if (params.op === "take") return reply(JSON.stringify(ctx.call(CardTableApi, "take", { resident, card })));
					if (params.op === "give") return reply(JSON.stringify(ctx.call(CardTableApi, "give", { resident, card })));
					if (params.op === "stock") return reply(JSON.stringify(ctx.call(CardTableApi, "stock", {})));
					if (params.op === "draw") return reply(JSON.stringify(ctx.call(CardTableApi, "draw", { resident })));
					if (params.op === "holds") return reply(JSON.stringify(ctx.call(CardTableApi, "holds", { resident, card })));
					return reply(JSON.stringify(ctx.call(CardTableApi, "hand", { resident })));
				},
			}),
		],
	}),
);

const story = (seed = 3): CoreStory => ({ ...tableStory({}, seed), mechanics: [cardTable.with({ suits: SUITS }), dealer.with()] });

async function probe(host: Host, params: Readonly<Record<string, unknown>>): Promise<unknown> {
	const outcome = await host.call("script", "probe", params);
	if (!outcome.ok) throw new Error(`probe refused: ${outcome.code}`);
	const parsed: unknown = JSON.parse(outcome.reply);
	return parsed;
}

const handOf = async (host: Host, resident: string): Promise<string[]> => {
	const hand = await probe(host, { op: "hand", resident });
	return Array.isArray(hand) ? hand.map(String) : [];
};

describe("the deal", () => {
	it("deals the same hands for the same seed, other hands for another, and keeps them private", async () => {
		const dealt = async (seed: number) => {
			const host = createHost({ story: story(seed) });
			host.start();
			await probe(host, { op: "deal", cards: 5 });
			return { host, hands: await Promise.all(["A01", "A02", "A03"].map((resident) => handOf(host, resident))) };
		};
		const one = await dealt(3);
		expect(one.hands.map((hand) => hand.length)).toEqual([5, 5, 5]);
		expect(new Set(one.hands.flat()).size).toBe(15);
		expect((await dealt(3)).hands).toEqual(one.hands);
		expect((await dealt(4)).hands).not.toEqual(one.hands);
		expect(one.host.log.all().filter((event) => event.type === "cards_dealt").map((event) => event.audience)).toEqual([["human"]]);
		expect(await one.host.call("resident:A02", "viewHand", {})).toEqual({ ok: true, reply: `Your hand: ${renderHand(one.hands[1] ?? [], SUITS)}` });
	});

	it("takes a held card from a hand and gives it back", async () => {
		const host = createHost({ story: story() });
		host.start();
		await probe(host, { op: "deal", cards: 2 });
		const [card] = await handOf(host, "A01");
		if (card === undefined) throw new Error("no card");
		expect(await probe(host, { op: "take", resident: "A02", card })).toBe(false);
		expect(await probe(host, { op: "take", resident: "A01", card })).toBe(true);
		expect(await probe(host, { op: "holds", resident: "A01", card })).toBe(false);
		await probe(host, { op: "give", resident: "A01", card });
		expect(await handOf(host, "A01")).toContain(card);
	});
});

describe("the draw pile", () => {
	it("holds the rest of the deck after a deal and moves its top card into a hand", async () => {
		const host = createHost({ story: story() });
		host.start();
		await probe(host, { op: "deal", cards: 0 });
		const stock = await probe(host, { op: "stock" });
		if (!Array.isArray(stock)) throw new Error("no stock");
		expect(stock).toHaveLength(SUITS.reduce((sum, suit) => sum + suit.ranks, 0));
		expect(await probe(host, { op: "draw", resident: "A02" })).toBe(stock[0]);
		expect(await handOf(host, "A02")).toEqual([stock[0]]);
		expect(await probe(host, { op: "stock" })).toEqual(stock.slice(1));
		for (let index = 1; index < stock.length; index++) await probe(host, { op: "draw", resident: "A01" });
		expect(await probe(host, { op: "draw", resident: "A01" })).toBeNull();
	});
});

describe("module conformance", () => {
	it("documents every option and takes randomness and time only from the host", () => {
		expect(checkOptionsDocumented(cardTable)).toEqual([]);
		const files = ["index", "model", "events", "api"].map((name) => ({ path: `mechanics/card-table/src/${name}.ts`, text: readFileSync(`mechanics/card-table/src/${name}.ts`, "utf8") }));
		expect(checkSourceRules(files)).toEqual([]);
	});
});
