// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The option `markOwnOffers` (A46, M4-70, P478): off, no text a trader reads carries the mark; on, the open offers a
 * trader reads mark its own offers, every one of them, and no offer of another trader.
 */
import { describe, expect, it } from "vitest";
import type { ActorDriver, Envelope } from "@swarmtales/contracts";
import { play } from "@swarmtales/testkit";
import type { Offer } from "../src/model.ts";
import { OWN_MARK, OWN_SHORT, offerIdsText, offersText } from "../src/own.ts";
import { field, marketGame, payloads } from "./support.ts";

const offer = (id: string, from: string, to: string): Offer => ({ id, game: 1, round: 1, from, to, give: { salt: 1, cloth: 0, copper: 0, spice: 0, wax: 0 }, get: { salt: 0, cloth: 1, copper: 0, spice: 0, wax: 0 }, note: "", status: "open" });
const BOOK = [offer("O1", "A01", "A02"), offer("O2", "A02", "all"), offer("O3", "A03", "A01")];

/** A text a trader read, with the reader and the game it was read in. */
interface Read {
	readonly reader: string;
	readonly game: number;
	readonly text: string;
}

// Every turn input and every answer of `viewMarket`, in log order, with the game that ran then.
function readsOf(events: readonly Envelope[]): Read[] {
	let game = 0;
	const reads: Read[] = [];
	for (const event of events) {
		if (event.type === "market_game_started") game = Number(field(event.payload, "game"));
		const reader = event.actor.replace("resident:", "");
		const inputs = field(event.payload, "inputs");
		if (event.type === "activation_opened" && Array.isArray(inputs)) for (const line of inputs) reads.push({ reader, game, text: String(field(line, "text")) });
		if (event.type === "tool_result" && field(event.payload, "as") === "viewMarket") reads.push({ reader, game, text: String(field(event.payload, "reply")) });
	}
	return reads;
}

// A trader that leaves offers open: at the start of every odd round it offers 1 salt to all for 1 unit of a perishable
// good, and nobody accepts; then it looks at the market. Its later turns of a round read the short list.
const hawker: ActorDriver = async (turn) => {
	const told = turn.inputs.map((note) => note.text).join("\n");
	const round = /Round (\d+) of \d+ \(/.exec(told);
	if (round === null || Number(round[1]) % 2 === 0) return;
	await turn.call("offer", { to: "all", give: { salt: 1 }, get: { wax: 1 }, note: "for wax" });
	await turn.call("viewMarket", {});
};

// The ids of the offers marked as the reader's own, in the full line and in the short list.
const markedIn = (text: string): string[] => [...text.matchAll(/(O\d+) \(your own/g)].map((match) => match[1] ?? "");

describe("markOwnOffers", () => {
	it("marks the reader's own offers and only those, in the full line and in the short list", () => {
		expect(offersText(BOOK, "A02", true)).toBe(`O1 from A01 to A02 (you): A01 gives 1 salt and wants 1 cloth. | O2 ${OWN_MARK} from A02 (you) to anyone: A02 (you) gives 1 salt and wants 1 cloth. | O3 from A03 to A01: A03 gives 1 salt and wants 1 cloth.`);
		expect(offerIdsText(BOOK, "A02", true)).toBe(`O1, O2 ${OWN_SHORT}, O3`);
		expect(offersText(BOOK, "A04", true)).toBe(offersText(BOOK, "A04", false));
		expect([offersText([], "A01", true), offerIdsText([], "A01", true)]).toEqual(["none", "none"]);
	});

	it("leaves the old text when off", () => {
		expect(offersText(BOOK, "A02", false)).not.toContain("your own");
		expect(offerIdsText(BOOK, "A02", false)).toBe("O1, O2, O3");
	});

	it("off: no text of a scripted match with open offers carries the mark", async () => {
		const run = await play(marketGame({ games: 2 }), { drivers: { resident: hawker } });
		const reads = readsOf(run.events);
		expect(reads.length).toBeGreaterThan(20);
		expect(reads.filter((read) => read.text.includes("your own"))).toEqual([]);
		// The traders do read their own open offers, unmarked as on the old platform.
		expect(reads.some((read) => new RegExp(`O\\d+ from ${read.reader} \\(you\\)`).test(read.text))).toBe(true);
	});

	it("on: in a scripted match with open offers every own open offer a trader reads is marked, and no offer of another", async () => {
		const run = await play(marketGame({ games: 2, markOwnOffers: true }), { drivers: { resident: hawker } });
		const owner = new Map(payloads(run.events, "market_offer_made").map((made) => [`${String(field(made, "game"))}:${String(field(made, "id"))}`, String(field(made, "from"))]));
		const reads = readsOf(run.events);
		const marked = reads.flatMap((read) => markedIn(read.text).map((id) => ({ ...read, id })));
		expect(marked.length).toBeGreaterThan(0);
		for (const read of marked) expect(owner.get(`${String(read.game)}:${read.id}`), `${read.reader} game ${String(read.game)} ${read.id}`).toBe(read.reader);
		// An own offer in the full line is never left without the mark.
		for (const read of reads) expect(read.text, read.reader).not.toMatch(new RegExp(`O\\d+ from ${read.reader} \\(you\\)`));
		// The short list of a later turn marks too.
		expect(reads.some((read) => read.text.includes(`Open offers: `) && read.text.includes(OWN_SHORT))).toBe(true);
	});
});
