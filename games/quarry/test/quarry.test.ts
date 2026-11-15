// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Quarry through the real mechanics: a scripted match, offline. Carried from `test/stories/quarry.test.ts` (its rule
 * block is in `mechanics/draft-rounds/test/model.test.ts`); the assertions on the old `turn_started` read
 * `activation_opened`. The bot test of the burn keeps its rules and numbers; its one function is split in three for the
 * complexity limit. Not carried: the two assertions on the old name registry (`findCoreStory("quarry-noburn")`
 * and "is registered with its arms"); `carried.test.ts` holds what replaces them.
 */
import { deckOf, gainOf, packsOf, receiverOf, scoreTable, type Card, type Rules } from "@swarmtales/mechanic-draft-rounds/rules";
import { checkDeterminism, checkSnapshotRoundTrip, idleDriver, play, testKernel } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { field, ofType, packOf, player, rosterGame, shown } from "./support.ts";

const players = { drivers: { resident: player } };

// The shuffle of the platform's seeded random source (Mulberry32, Fisher-Yates from the end), which a game test cannot import.
function shuffled<T>(items: readonly T[], seed: number): T[] {
	let state = seed >>> 0;
	const next = (): number => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	const copy = [...items];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(next() * (i + 1));
		const [a, b] = [copy[i], copy[j]];
		if (a === undefined || b === undefined) continue;
		copy[i] = b;
		copy[j] = a;
	}
	return copy;
}

const SEATS = ["A01", "A02", "A03", "A04"];
const LANES: Readonly<Record<string, string>> = { A01: "amber", A02: "basalt", A03: "cobalt", A04: "jade" };

interface Table {
	readonly hands: Record<string, Card[]>;
	readonly burner: boolean;
	burns: number;
}

// What A01 burns from the cards it passes on: the receiver's best card, at most twice, once the pack cannot come back to A01 and the card is worth 5 or more to the receiver.
function burnOf(table: Table, seat: string, rest: readonly Card[], receiverHand: readonly Card[]): Card | undefined {
	if (!table.burner || seat !== "A01" || table.burns >= 2 || rest.length === 0 || rest.length >= SEATS.length) return undefined;
	const target = [...rest].sort((a, b) => gainOf(receiverHand, b) - gainOf(receiverHand, a))[0];
	return target !== undefined && gainOf(receiverHand, target) >= 5 ? target : undefined;
}

// One pick of every seat: its lane, then a lodestone, then the first card; the rest goes to the receiver.
function pickRound(table: Table, held: Readonly<Record<string, Card[]>>, round: number): Record<string, Card[]> {
	const next: Record<string, Card[]> = {};
	for (const seat of SEATS) {
		const pack = held[seat] ?? [];
		const card = pack.find((other) => other.kind === LANES[seat]) ?? pack.find((other) => other.kind === "lodestone") ?? pack[0];
		const rest = pack.filter((other) => other !== card);
		if (card !== undefined) table.hands[seat]?.push(card);
		const receiver = receiverOf(SEATS, seat, round);
		const burned = burnOf(table, seat, rest, table.hands[receiver] ?? []);
		if (burned !== undefined) table.burns += 1;
		next[receiver] = rest.filter((other) => other !== burned);
	}
	return next;
}

// One deal of the bot test: A01's score when it may burn or may not.
function botDeal(rules: Rules, seed: number, burner: boolean): number {
	const table: Table = { hands: Object.fromEntries(SEATS.map((seat) => [seat, []])), burner, burns: 0 };
	for (const [index, row] of packsOf(shuffled(deckOf(48, 4), seed), 4, 2, 6).entries()) {
		let held: Record<string, Card[]> = Object.fromEntries(SEATS.map((seat, k) => [seat, row[k] ?? []]));
		while (Object.values(held).some((pack) => pack.length > 0)) held = pickRound(table, held, index + 1);
	}
	return scoreTable(table.hands, { A01: table.burns }, rules).A01?.total ?? 0;
}

/**
 * The bot test behind P123: four seats draft four different lanes on many deals; A01 may also burn the
 * receiver's best card once the pack cannot come back to it. Returns A01's mean score with and without burns.
 */
function burnTest(rules: Rules, deals: number): { readonly without: number; readonly with: number } {
	let without = 0;
	let withBurns = 0;
	for (let seed = 0; seed < deals; seed++) {
		without += botDeal(rules, seed, false);
		withBurns += botDeal(rules, seed, true);
	}
	return { without: without / deals, with: withBurns / deals };
}

describe("quarry, the burn (P123)", () => {
	it("pays a late burner only when burns are free and places score", () => {
		// The old rules: a burn costs 2 and only points count, so burning loses.
		const old = burnTest({ majorityBonus: 5, burnCost: 2, placeBonus: [] }, 300);
		expect(old.with).toBeLessThan(old.without);
		// Free burns without a place bonus change nothing for the burner: denial does not pay in points.
		const free = burnTest({ majorityBonus: 5, burnCost: 0, placeBonus: [] }, 300);
		expect(Math.abs(free.with - free.without)).toBeLessThan(1);
		// The new defaults: free burns and 10/5 for the first two places; a late burn now pays.
		const now = burnTest({ majorityBonus: 5, burnCost: 0, placeBonus: [10, 5] }, 300);
		expect(now.with).toBeGreaterThan(now.without + 1);
	});
});

describe("quarry, scripted match", () => {
	it("plays three games with sealed picks, passing, burns, a reference score and a brain per seat", async () => {
		const run = await play(rosterGame({ burns: true }), players);
		expect(run.end).toMatchObject({ reason: "limit", limit: "draft-rounds.match" });
		const ended = ofType(run.events, "draft_game_ended");
		expect(ended).toHaveLength(3);
		for (const type of ["draft_game_started", "draft_card_picked", "draft_game_scored"]) {
			expect(ofType(run.events, type).every((event) => JSON.stringify(event.audience) === JSON.stringify(["human"]))).toBe(true);
		}
		const picks = ofType(run.events, "draft_card_picked");
		const burned = picks.filter((event) => field(event, "burned") !== undefined);
		// 48 cards a game; every burn takes one card out of the picks.
		expect(picks.length + burned.length).toBe(3 * 48);
		expect(burned.length).toBeGreaterThan(0);
		expect(picks.every((event) => field(event, "missed") === false)).toBe(true);
		// Four lanes: no seat shares its top resource.
		const references = ofType(run.events, "draft_game_scored").map((event) => field(event, "reference"));
		expect(references.every((reference) => typeof reference === "object" && reference !== null && Reflect.get(reference, "sharedLanes") === 0)).toBe(true);
		expect(ofType(run.events, "draft_match_ended")).toHaveLength(1);
		const written = ofType(run.events, "brain_written");
		expect(written).toHaveLength(12);
		// P126: the next game's briefing names every burn and whether its pack came back to the burner.
		const second = shown(run.events).map((turn) => JSON.stringify(turn.inputs)).find((text) => text.includes("Game 2 begins")) ?? "";
		expect(second).toMatch(/burns A01 L\d lodestone/);
		expect(second).toContain("A02 none");
	});

	it("plays without burns by default and keeps the burn parameter in the tool", async () => {
		const run = await play(rosterGame(), players);
		expect(ofType(run.events, "draft_card_picked").some((event) => field(event, "burned") !== undefined)).toBe(false);
		const rules = run.kernel.toolSpecs("resident").find((spec) => spec.name === "pick")?.description ?? "";
		expect(rules).toContain("burn");
	});

	it("starts every game from a fresh context with the results so far and the seat's own brain", async () => {
		const run = await play(rosterGame(), players);
		const resets = shown(run.events).flatMap((turn) => {
			const inputs = turn.inputs;
			return Array.isArray(inputs) ? inputs.filter((input): input is { kind: string; text: string } => typeof input === "object" && input !== null && Reflect.get(input, "kind") === "context-reset").map((input) => ({ resident: turn.resident, text: input.text })) : [];
		});
		const third = resets.filter((reset) => reset.text.startsWith("Game 3 begins"));
		expect(third.map((reset) => reset.resident).sort()).toEqual(SEATS);
		for (const reset of third) {
			expect(reset.text).toContain("game 2: points A01");
			expect(reset.text).toContain("quarries A01 amber");
			expect(reset.text).toContain("Your strategy brain (version 3)");
		}
	});

	it("takes the first card of the pack for a missed pick and still ends the match", async () => {
		const run = await play(rosterGame({ brain: false }), { drivers: { resident: idleDriver } });
		expect(run.end).toMatchObject({ reason: "limit", limit: "draft-rounds.match" });
		const picks = ofType(run.events, "draft_card_picked");
		expect(picks).toHaveLength(3 * 48);
		expect(picks.every((event) => field(event, "missed") === true)).toBe(true);
	});

	it("passes left in the first pack round and right in the second, and refuses bad picks", async () => {
		const test = testKernel(rosterGame({ brain: false, burns: true, games: 1, packs: 2, packSize: 2 }));
		const packFor = async (seat: string): Promise<string[]> => {
			const view = await test.call(seat, "viewTable", {});
			return packOf(view.ok ? view.reply : "");
		};
		const a01 = await packFor("A01");
		const a04 = await packFor("A04");
		expect(await test.call("A01", "pick", { card: "Z9" })).toMatchObject({ ok: false, code: "NOT_IN_PACK" });
		expect(await test.call("A01", "pick", { card: a01[0] ?? "", burn: a01[0] ?? "" })).toMatchObject({ ok: false, code: "BURN_IS_PICK" });
		expect(await test.call("A01", "pick", { card: (a01[0] ?? "").toLowerCase() })).toMatchObject({ ok: true });
		expect(await test.call("A01", "pick", { card: a01[1] ?? "" })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		for (const seat of ["A02", "A03", "A04"]) {
			const pack = await packFor(seat);
			expect(await test.call(seat, "pick", { card: pack[0] ?? "" })).toMatchObject({ ok: true });
		}
		// Pack round 1 passes to the next seat: A02 now holds what was left of A01's pack, A01 what was left of A04's.
		expect(await packFor("A02")).toEqual([a01[1]]);
		expect(await packFor("A01")).toEqual([a04[1]]);
		const view = await test.call("A02", "viewTable", {});
		expect(view.ok && view.reply).toContain("passed to you by A01");
	});

	it("refuses every burn in the no-burn arm and says so in the rules", async () => {
		const test = testKernel(rosterGame({ brain: false, games: 1, packs: 1, packSize: 3 }));
		const view = await test.call("A01", "viewTable", {});
		const text = view.ok ? view.reply : "";
		expect(text).toContain("There are no burns in this game.");
		expect(text).not.toContain("Burns left");
		const pack = packOf(text);
		expect(await test.call("A01", "pick", { card: pack[0] ?? "", burn: pack[1] ?? "" })).toMatchObject({ ok: false, code: "NO_BURNS_LEFT" });
	});

	it("is deterministic and survives a snapshot round trip inside a game and inside a retro window", async () => {
		expect(await checkDeterminism(rosterGame(), () => player)).toEqual([]);
		for (const cut of [0, 3, 9]) expect(await checkSnapshotRoundTrip(rosterGame(), () => player, cut)).toEqual([]);
	});
});
