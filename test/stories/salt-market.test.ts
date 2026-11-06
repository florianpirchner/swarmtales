/** The Salt Market negotiation game through the real mechanics: rules, the optimum, a scripted match, offline (docs/ideas/game-roadmap.md §2.7). */
import { describe, expect, it } from "vitest";
import type { CoreStory, EventEnvelope, TurnTaker } from "@swarmtales/contracts";
import { createHost, createRng, residentActor } from "@swarmtales/kernel";
import { createPromptLookup } from "@swarmtales/prompts";
import { checkDeterminism, checkSnapshotRoundTrip, idleAgent, playStory } from "@swarmtales/testkit";
import { bundleOf, dealOf, gini, optimumOf, scoreOf, spoilLoss } from "../../mechanics/salt-market/src/model.ts";
import { saltMarketStory, type SaltMarketOptions } from "../../stories/salt-market/story.ts";
import { findCoreStory } from "../../stories/index.ts";
import { field, ofType } from "./tictactoe-support.ts";

const as = residentActor;
const SEATS = ["A01", "A02", "A03", "A04"];
const PERISHABLE = ["cloth", "copper", "spice", "wax"];

function story(extra: SaltMarketOptions = {}): CoreStory {
	const base = saltMarketStory(extra);
	return { ...base, turns: { ...base.turns, order: (view) => view.residents } };
}

const options = (extra: SaltMarketOptions = {}) => ({ story: story(extra), prompts: createPromptLookup() });

/** The reference of the first scored game. */
function firstReference(events: readonly EventEnvelope[]): unknown {
	const scored = ofType(events, "market_game_scored")[0];
	return scored === undefined ? undefined : field(scored, "reference");
}

const next = (seat: string): string => SEATS[(SEATS.indexOf(seat) + 1) % SEATS.length] ?? "A01";

/** The counts of a trader in a book line: `A02: 6 salt, 3 cloth; A03 (you): ...`. */
function holdingIn(book: string, seat: string): Record<string, number> {
	const entry = book.split("; ").find((part) => part.startsWith(`${seat}:`) || part.startsWith(`${seat} (you):`)) ?? "";
	const out: Record<string, number> = {};
	for (const match of entry.matchAll(/(\d+) (salt|cloth|copper|spice|wax)/g)) out[match[2] ?? ""] = Number(match[1]);
	return out;
}

/**
 * Every trader accepts every offer it is told about, and at each round's start buys one unit of a
 * perishable good from the next seat for 2 salt. In round 2, A01 adds 1 salt in escrow and A02 and A04
 * add 1 salt as a plain promise, due at the end of round 3; A02 keeps it in round 3, A04 does not.
 */
const trader: TurnTaker = async (turn) => {
	const told = turn.inputs.map((note) => note.text).join("\n");
	if (told.includes("Retro after game") || told.includes("Before game 1")) {
		await turn.call("writeBrain", { text: `${turn.resident}: buy what I need for salt, keep promises.` });
		return;
	}
	for (const match of told.matchAll(/New offer (O\d+)/g)) await turn.call("accept", { offer: match[1] ?? "" });
	const round = /Round (\d+) of \d+ \(/.exec(told);
	const book = /The book: ([^\n]*?)\. Open offers:/.exec(told)?.[1];
	if (round === null || book === undefined) return;
	const number = Number(round[1]);
	const target = next(turn.resident);
	const theirs = holdingIn(book, target);
	const good = PERISHABLE.find((name) => (theirs[name] ?? 0) > 0);
	if (number === 1) await turn.call("say", { text: `${turn.resident} buys anything for salt.` });
	if (number === 3 && turn.resident === "A02") await turn.call("give", { to: target, goods: { salt: 1 }, note: "keeps my promise" });
	if (good === undefined) return;
	const later = number !== 2 ? {} : turn.resident === "A01" ? { later: { salt: 1, round: 3, escrow: true } } : turn.resident === "A02" || turn.resident === "A04" ? { later: { salt: 1, round: 3 } } : {};
	await turn.call("offer", { to: target, give: { salt: 2 }, get: { [good]: 1 }, note: "fair price", ...later });
};

describe("Salt Market rules", () => {
	it("deals values, three-good contracts and start bundles that make trade necessary", () => {
		const profiles = dealOf(SEATS, createRng(7), 6, 2);
		const again = dealOf(SEATS, createRng(7), 6, 2);
		expect(again).toEqual(profiles);
		for (const seat of SEATS) {
			const profile = profiles[seat];
			expect(profile?.values.salt).toBe(1);
			expect(profile?.start.salt).toBe(6);
			expect((["cloth", "copper", "spice", "wax"] as const).filter((good) => (profile?.contract[good] ?? 0) > 0)).toHaveLength(3);
			expect(profile?.contract.salt).toBe(0);
		}
		for (const good of ["cloth", "copper", "spice", "wax"] as const) {
			const demand = SEATS.reduce((sum, seat) => sum + (profiles[seat]?.contract[good] ?? 0), 0);
			const supply = SEATS.reduce((sum, seat) => sum + (profiles[seat]?.start[good] ?? 0), 0);
			expect(supply).toBe(Math.max(4, demand + 2));
		}
	});

	it("scores units at private values plus the contract bonus, and finds the optimum", () => {
		const a = { values: bundleOf({ salt: 1, cloth: 4, copper: 1 }), contract: bundleOf({ copper: 2 }), start: bundleOf({ cloth: 2 }) };
		const b = { values: bundleOf({ salt: 1, cloth: 1, copper: 3 }), contract: bundleOf({ cloth: 2 }), start: bundleOf({ copper: 2 }) };
		const rules = { contractBonus: 10 };
		expect(scoreOf(a, a.start, rules)).toEqual({ goods: 8, met: false, total: 8 });
		expect(scoreOf(a, bundleOf({ copper: 2 }), rules)).toEqual({ goods: 2, met: true, total: 12 });
		// Supply 2 cloth, 2 copper: both contracts (2 copper to a = 2, 2 cloth to b = 2, + 20) = 24 beats keeping (8 + 6 = 14).
		expect(optimumOf({ a, b }, bundleOf({ cloth: 2, copper: 2 }), rules)).toEqual({ total: 24, contracts: ["a", "b"] });
		// Without the bonus, every unit goes to whoever values it most: cloth to a (8), copper to b (6).
		expect(optimumOf({ a, b }, bundleOf({ cloth: 2, copper: 2 }), { contractBonus: 0 }).total).toBe(14);
		expect(gini([5, 5, 5, 5])).toBe(0);
		expect(gini([0, 0, 0, 12])).toBe(0.75);
		expect(gini([-3, 0, 0, 0])).toBe(0);
		expect(spoilLoss(bundleOf({ spice: 3 }), "spice")).toBe(0);
		expect(spoilLoss(bundleOf({ spice: 9 }), "spice")).toBe(2);
		expect(spoilLoss(bundleOf({ salt: 9 }), "salt")).toBe(0);
	});
});

describe("salt-market, scripted match", () => {
	it("plays two games with offers, trades, escrow, kept and broken promises, a reference and a brain per trader", async () => {
		const run = await playStory(options(), trader);
		expect(run.end).toMatchObject({ reason: "referee", limit: "salt-market.match" });
		expect(ofType(run.events, "market_game_ended")).toHaveLength(2);
		for (const type of ["market_game_started", "market_said", "market_game_scored"]) {
			expect(ofType(run.events, type).every((event) => JSON.stringify(event.audience) === JSON.stringify(["human"]))).toBe(true);
		}
		const trades = ofType(run.events, "market_trade");
		expect(trades.length).toBeGreaterThan(8);
		const settled = ofType(run.events, "market_promise_settled").filter((event) => field(event, "game") === 1);
		const statusOf = (from: string) => settled.filter((event) => field(event, "from") === from).map((event) => `${String(field(event, "escrow"))}:${String(field(event, "status"))}`);
		expect(statusOf("A01")).toEqual(["true:kept"]);
		expect(statusOf("A02")).toEqual(["false:kept"]);
		expect(statusOf("A04")).toEqual(["false:broken"]);
		expect(ofType(run.events, "market_spoiled")).toHaveLength(2 * 5);
		const reference = firstReference(run.events);
		expect(typeof reference === "object" && reference !== null && typeof Reflect.get(reference, "efficiency") === "number").toBe(true);
		expect(ofType(run.events, "market_match_ended")).toHaveLength(1);
		expect(ofType(run.events, "brain_written")).toHaveLength(8);
		// The next briefing names the broken promise and every contract.
		const resets = run.events.filter((event) => event.type === "turn_started").flatMap((event) => {
			const inputs: unknown = field(event, "inputs");
			return Array.isArray(inputs) ? inputs.filter((input): input is { kind: string; text: string } => typeof input === "object" && input !== null && Reflect.get(input, "kind") === "context-reset").map((input) => input.text) : [];
		});
		const second = resets.filter((text) => text.startsWith("Game 2 begins"));
		expect(second).toHaveLength(4);
		expect(second[0]).toContain("broken promises: A04 to A01");
		expect(second[0]).toContain("A01 wanted");
	});

	it("ends the match without trades when nobody acts", async () => {
		const run = await playStory(options({ brain: false }), idleAgent);
		expect(run.end).toMatchObject({ reason: "referee", limit: "salt-market.match" });
		expect(ofType(run.events, "market_trade")).toHaveLength(0);
		const reference = firstReference(run.events);
		expect(typeof reference === "object" && reference !== null ? Reflect.get(reference, "efficiency") : undefined).toBeLessThanOrEqual(0);
	});

	it("refuses bad offers, taxes big trades, holds escrow until it is due and settles it", async () => {
		const host = createHost(options({ brain: false, games: 1, rounds: 3, spoil: false }));
		host.start();
		const view = async (seat: string): Promise<string> => {
			const outcome = await host.call(as(seat), "viewMarket", {});
			return outcome.ok ? outcome.reply : "";
		};
		const book = /The book: ([^\n]*?)\. Open offers:/.exec(await view("A01"))?.[1] ?? "";
		const a02 = holdingIn(book, "A02");
		const good = PERISHABLE.find((name) => (a02[name] ?? 0) > 0) ?? "cloth";
		expect(await host.call(as("A01"), "offer", { to: "A01", give: { salt: 1 }, get: { [good]: 1 } })).toMatchObject({ ok: false, code: "SELF_OFFER" });
		expect(await host.call(as("A01"), "offer", { to: "Z9", give: { salt: 1 }, get: { [good]: 1 } })).toMatchObject({ ok: false, code: "UNKNOWN_TRADER" });
		expect(await host.call(as("A01"), "offer", { to: "A02", give: { salt: 50 }, get: { [good]: 1 } })).toMatchObject({ ok: false, code: "CANNOT_COVER" });
		expect(await host.call(as("A01"), "offer", { to: "A02", give: { salt: 1 } })).toMatchObject({ ok: false, code: "USE_GIVE" });
		expect(await host.call(as("A01"), "offer", { to: "A02", give: { salt: 1 }, get: { [good]: 1 }, later: { salt: 1, round: 1 } })).toMatchObject({ ok: false, code: "BAD_ROUND" });
		// 5 salt + 1 good moves 6 units: no tax; 1 salt in escrow until round 2 costs the fee.
		const made = await host.call(as("A01"), "offer", { to: "A02", give: { salt: 4 }, get: { [good]: 1 }, later: { salt: 1, round: 2, escrow: true } });
		expect(made).toMatchObject({ ok: true });
		expect(await host.call(as("A01"), "accept", { offer: "O1" })).toMatchObject({ ok: false, code: "OWN_OFFER" });
		expect(await host.call(as("A03"), "accept", { offer: "O1" })).toMatchObject({ ok: false, code: "NOT_FOR_YOU" });
		expect(await host.call(as("A02"), "accept", { offer: "o1" })).toMatchObject({ ok: true });
		expect(await host.call(as("A02"), "accept", { offer: "O1" })).toMatchObject({ ok: false, code: "OFFER_CLOSED" });
		// A01: 6 - 4 - 1 (escrow) - 1 (fee) = 0 salt.
		expect(holdingIn(/The book: ([^\n]*?)\. Open offers:/.exec(await view("A01"))?.[1] ?? "", "A01").salt ?? 0).toBe(0);
		expect(holdingIn(/The book: ([^\n]*?)\. Open offers:/.exec(await view("A02"))?.[1] ?? "", "A02").salt).toBe(10);
		// A big trade: 7 units moved, each side pays 1 salt of tax.
		const a03 = holdingIn(book, "A03");
		const many = PERISHABLE.find((name) => (a03[name] ?? 0) >= 1) ?? "cloth";
		expect(await host.call(as("A02"), "offer", { to: "all", give: { salt: 6 }, get: { [many]: 1 } })).toMatchObject({ ok: true });
		expect(await host.call(as("A04"), "decline", { offer: "O3", note: "too dear" })).toMatchObject({ ok: true });
		expect(await host.call(as("A03"), "accept", { offer: "O3" })).toMatchObject({ ok: true });
		expect(holdingIn(/The book: ([^\n]*?)\. Open offers:/.exec(await view("A02"))?.[1] ?? "", "A02").salt).toBe(3);
		expect(holdingIn(/The book: ([^\n]*?)\. Open offers:/.exec(await view("A03"))?.[1] ?? "", "A03").salt).toBe(11);
		expect(await host.call(as("A01"), "say", { text: "hello", to: "A03" })).toMatchObject({ ok: true });
		for (let n = 0; n < 3; n++) await host.call(as("A04"), "say", { text: `call ${String(n)}` });
		expect(await host.call(as("A04"), "say", { text: "one too many" })).toMatchObject({ ok: false, code: "TOO_MANY_MESSAGES" });
	});

	it("is registered with its arms and variants by name", () => {
		for (const name of ["salt-market", "salt-market-nobrain", "salt-market-nospoil"]) expect(findCoreStory(name)?.story.id).toBe(name);
		expect(findCoreStory("salt-market-nobrain-g3-r8")?.story.id).toBe("salt-market-nobrain");
		expect(findCoreStory("salt-market-r1")).toBeUndefined();
	});

	it("is deterministic and survives a snapshot round trip inside a game and inside a retro window", async () => {
		expect(await checkDeterminism(options(), () => trader)).toEqual([]);
		for (const cut of [0, 3, 8]) expect(await checkSnapshotRoundTrip(options(), () => trader, cut)).toEqual([]);
	});
});
