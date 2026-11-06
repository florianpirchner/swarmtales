/** The hint-towers mechanic: the rules as functions, the reference bot, a scripted match, refusals, the move timer and conformance (offline). */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CoreStory, EventEnvelope } from "@swarmtales/contracts";
import { towerPlayer } from "./support.ts";
import { createHost } from "@swarmtales/kernel";
import { cardTable } from "@swarmtales/mechanic-card-table";
import { hintTowers } from "@swarmtales/mechanic-hint-towers";
import { createPromptLookup } from "@swarmtales/prompts";
import { checkDeterminism, checkOptionsDocumented, checkSnapshotRoundTrip, checkSourceRules, idleAgent, playStory } from "@swarmtales/testkit";
import { botAction, botScore, candidates, type Core, deckOf, discard, isPlayable, newGame, nextRank, parseAbout, play, type Rules, signal, signalProblem, surePlayable } from "../../../mechanics/hint-towers/src/model.ts";

const SEATS = ["A01", "A02", "A03", "A04"];
const SUITS = ["Amber", "Cobalt", "Moss"].map((name) => ({ name, ranks: 4 }));
const RULES: Rules = { handSize: 2, maxSignals: 3, maxStrikes: 2, refillOnTower: true };

/** A game on a fixed deck order, first card first. */
function gameOn(deck: readonly string[], rules: Rules = RULES): { core: Core; draw: (seat: string) => string | undefined } {
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

	it("lets the bot play a sure card, point at a playable card as the newest touched, and score a deal", () => {
		const { core } = gameOn(DECK);
		// A01 knows nothing; A02's Cobalt 1 is playable and the newest card of a "Cobalt" signal.
		expect(botAction(core, RULES)).toEqual({ kind: "signal", to: "A02", about: { rank: 1 } });
		const full = deckOf(SUITS);
		expect(botScore(SEATS, SUITS, RULES, "A01", full)).toBe(botScore(SEATS, SUITS, RULES, "A01", full));
		expect(botScore(SEATS, SUITS, RULES, "A01", full)).toBeGreaterThan(0);
	});
});

function towerStory(options: Partial<Parameters<typeof hintTowers.with>[0]> = {}): CoreStory {
	return {
		id: "hint-towers-test",
		seed: 5,
		minutes: 200,
		residents: [...SEATS],
		mechanics: [cardTable.with({ suits: SUITS, seats: [...SEATS] }), hintTowers.with({ games: 2, handSize: 2, signals: 3, strikes: 2, ...options })],
		grants: "auto",
		turns: { passes: 8, activation: "onNews", order: (view) => view.residents },
	};
}

const ofType = (events: readonly EventEnvelope[], type: string): readonly EventEnvelope[] => events.filter((event) => event.type === type);
function field(event: EventEnvelope, key: string): unknown {
	const payload = event.payload;
	return typeof payload === "object" && payload !== null ? Reflect.get(payload, key) : undefined;
}

describe("a match", () => {
	it("plays two games, keeps the deal and the draws secret and scores every deal against the bot crew", async () => {
		const run = await playStory({ story: towerStory() }, towerPlayer());
		expect(run.end).toMatchObject({ reason: "referee", limit: "hint-towers.match" });
		expect(ofType(run.events, "game_started").map((event) => field(event, "first"))).toEqual(["A01", "A02"]);
		const ended = ofType(run.events, "game_ended");
		expect(ended).toHaveLength(2);
		for (const event of ended) expect(Number(field(event, "score")) + Number(field(event, "lost"))).toBeLessThanOrEqual(12);
		for (const type of ["deal_revealed", "card_drawn", "game_scored"]) expect(ofType(run.events, type).every((event) => event.audience?.join() === "human")).toBe(true);
		expect(ofType(run.events, "card_drawn").length).toBeGreaterThan(0);
		expect([...ofType(run.events, "card_played"), ...ofType(run.events, "signal_given"), ...ofType(run.events, "card_discarded")].every((event) => field(event, "forfeit") === false)).toBe(true);
		expect(ofType(run.events, "match_ended")).toHaveLength(1);
		expect(run.host.facts()["hint-towers.scores"]).toHaveLength(2);
	});

	it("never shows a seat its own cards, only the others'", async () => {
		const host = createHost({ story: towerStory() });
		host.start();
		const status = await host.call("resident:A01", "viewTowers", {});
		if (!status.ok) throw new Error("no status");
		const view = status.reply;
		const hands = ofType(host.log.all(), "deal_revealed")[0];
		const dealt = hands === undefined ? undefined : field(hands, "hands");
		if (typeof dealt !== "object" || dealt === null) throw new Error("no deal");
		const theirs: unknown = Reflect.get(dealt, "A02");
		for (const card of Array.isArray(theirs) ? theirs.map(String) : []) expect(view).toContain(card);
		const own = view.split("The others' hands")[0] ?? "";
		const mine: unknown = Reflect.get(dealt, "A01");
		for (const card of Array.isArray(mine) ? mine.map(String) : []) expect(own.includes(`could be ${card}.`)).toBe(false);
	});

	it("refuses out-of-turn actions, bad slots, bad signals and a discard at the cap", async () => {
		const host = createHost({ story: towerStory() });
		host.start();
		expect(await host.call("resident:A02", "playSlot", { slot: 1 })).toMatchObject({ ok: false, code: "NOT_YOUR_TURN" });
		expect(await host.call("resident:A01", "playSlot", { slot: 3 })).toMatchObject({ ok: false, code: "NO_SUCH_SLOT" });
		expect(await host.call("resident:A01", "discardSlot", { slot: 1 })).toMatchObject({ ok: false, code: "SIGNALS_FULL" });
		expect(await host.call("resident:A01", "giveSignal", { to: "A01", about: "Amber" })).toMatchObject({ ok: false, code: "SELF_SIGNAL" });
		expect(await host.call("resident:A01", "giveSignal", { to: "A02", about: "Ember" })).toMatchObject({ ok: false, code: "UNKNOWN_SIGNAL" });
	});

	it("acts for an idle seat with the bot's action, and ends the match as invalid after too many in a row", async () => {
		const run = await playStory({ story: towerStory({ maxIdleMinutes: 1, maxConsecutiveForfeits: 5 }) }, idleAgent);
		const forfeits = [...ofType(run.events, "card_played"), ...ofType(run.events, "signal_given"), ...ofType(run.events, "card_discarded")].filter((event) => field(event, "forfeit") === true);
		expect(forfeits).toHaveLength(5);
		expect(ofType(run.events, "match_ended").map((event) => field(event, "invalid"))).toEqual([true]);
	});

	it("locks the quiet tools while a game runs", async () => {
		const host = createHost({ story: { ...towerStory({ quietTools: ["viewTowers"] }) } });
		host.start();
		expect(await host.call("resident:A01", "viewTowers", {})).toMatchObject({ ok: false });
	});
});

describe("module conformance", () => {
	it("documents every option and takes randomness and time only from the host", () => {
		expect(checkOptionsDocumented(hintTowers)).toEqual([]);
		const files = ["index", "model", "events"].map((name) => ({ path: `mechanics/hint-towers/src/${name}.ts`, text: readFileSync(`mechanics/hint-towers/src/${name}.ts`, "utf8") }));
		expect(checkSourceRules(files)).toEqual([]);
	});

	it("has prompt files for its tool descriptions", () => {
		const host = createHost({ story: towerStory(), prompts: createPromptLookup() });
		const specs = host.toolSpecs("resident").filter((spec) => spec.name !== "viewHand");
		expect(specs.map((spec) => spec.name).sort()).toEqual(["discardSlot", "giveSignal", "playSlot", "viewTowers"]);
		for (const spec of specs) expect(spec.description).not.toMatch(/^hint-towers\//);
	});

	it("gives the same events for the same seed", async () => {
		expect(await checkDeterminism({ story: towerStory() }, () => towerPlayer())).toEqual([]);
	});

	it("survives a snapshot round trip in the middle of a game and between games", async () => {
		expect(await checkSnapshotRoundTrip({ story: towerStory() }, () => towerPlayer(), 1)).toEqual([]);
		expect(await checkSnapshotRoundTrip({ story: towerStory() }, () => towerPlayer(), 6)).toEqual([]);
	});
});
