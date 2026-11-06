/** The Quarry drafting game through the real mechanics: a scripted match, offline (docs/ideas/game-roadmap.md §2.4). */
import { describe, expect, it } from "vitest";
import type { CoreStory, TurnTaker } from "@swarmtales/contracts";
import { createHost, residentActor } from "@swarmtales/kernel";
import { createPromptLookup } from "@swarmtales/prompts";
import { checkDeterminism, checkSnapshotRoundTrip, idleAgent, playStory } from "@swarmtales/testkit";
import { createRng } from "@swarmtales/kernel";
import { deckOf, gainOf, greedyTable, laneOf, packsOf, receiverOf, scoreTable, setScore, type Card } from "../../mechanics/draft-rounds/src/model.ts";
import { quarryStory, type QuarryOptions } from "../../stories/quarry/story.ts";
import { findCoreStory } from "../../stories/index.ts";
import { field, ofType } from "./tictactoe-support.ts";

const as = residentActor;

function story(extra: QuarryOptions = {}): CoreStory {
	const base = quarryStory(extra);
	return { ...base, turns: { ...base.turns, order: (view) => view.residents } };
}

const options = (extra: QuarryOptions = {}) => ({ story: story(extra), prompts: createPromptLookup() });

const LANE: Readonly<Record<string, string>> = { A01: "amber", A02: "basalt", A03: "cobalt", A04: "jade" };

/** Each seat drafts its own lane (A01 amber, A02 basalt, ...), then lodestones, then the first card; A01 burns a lodestone once per game. */
const player: TurnTaker = async (turn) => {
	const told = turn.inputs.map((note) => note.text).join("\n");
	if (told.includes("Retro after game") || told.includes("Before game 1")) {
		await turn.call("writeBrain", { text: `${turn.resident}: draft ${LANE[turn.resident] ?? "amber"} and take lodestones.` });
		return;
	}
	const pack = /Your pack: ([^.]+)\./.exec(told)?.[1];
	if (pack === undefined) return;
	const cards = pack.split(", ").map((entry) => {
		const [id = "", kind = ""] = entry.split(" ");
		return { id, kind };
	});
	const choice = cards.find((card) => card.kind === LANE[turn.resident]) ?? cards.find((card) => card.kind === "lodestone") ?? cards[0];
	if (choice === undefined) return;
	const wild = cards.find((card) => card.kind === "lodestone" && card.id !== choice.id);
	const burn = turn.resident === "A01" && wild !== undefined && !told.includes("Burns left: 1") && !told.includes("Burns left: 0") ? { burn: wild.id } : {};
	await turn.call("pick", { card: choice.id, reason: "script", ...burn });
};

describe("Quarry rules", () => {
	it("builds a deck of the four resources and the lodestones", () => {
		const deck = deckOf(48, 4);
		expect(deck).toHaveLength(48);
		expect(deck.filter((card) => card.kind === "lodestone")).toHaveLength(4);
		expect(deck.filter((card) => card.kind === "amber")).toHaveLength(11);
		expect(new Set(deck.map((card) => card.id)).size).toBe(48);
		// 50 cards, 2 wilds: 48 split as 12 each; 51 cards, 2 wilds: the first resource gets the extra card.
		expect(deckOf(51, 2).filter((card) => card.kind === "amber")).toHaveLength(13);
	});

	it("scores squares, one lodestone per set on the biggest sets, majorities and burns", () => {
		const c = (id: string, kind: "amber" | "basalt" | "cobalt" | "jade" | "lodestone") => ({ id, kind });
		// 3 amber + 1 basalt + 2 lodestones: amber 4^2 + basalt 2^2 = 20.
		expect(setScore([c("A1", "amber"), c("A2", "amber"), c("A3", "amber"), c("B1", "basalt"), c("L1", "lodestone"), c("L2", "lodestone")])).toBe(20);
		// Five lodestones alone: four sets of one, the fifth is worth nothing.
		expect(setScore([1, 2, 3, 4, 5].map((n) => c(`L${String(n)}`, "lodestone")))).toBe(4);
		const table = scoreTable(
			{ A01: [c("A1", "amber"), c("A2", "amber")], A02: [c("A3", "amber"), c("B1", "basalt")], A03: [c("B2", "basalt")] },
			{ A01: 1 },
			{ majorityBonus: 5, burnCost: 2, placeBonus: [] },
		);
		// A01: 4 + amber majority 5 - burn 2; A02 and A03 tie on basalt: nobody gets it.
		expect(table.A01).toMatchObject({ sets: 4, majorities: ["amber"], total: 7 });
		expect(table.A02).toMatchObject({ sets: 2, majorities: [], total: 2 });
		expect(table.A03).toMatchObject({ total: 1 });
		// A tie for the top resource names both lanes, never the first in the list (P124).
		expect(laneOf([c("C1", "cobalt"), c("J1", "jade"), c("A1", "amber"), c("J2", "jade"), c("C2", "cobalt")])).toEqual({ lanes: ["cobalt", "jade"], focus: 0.4 });
	});

	it("plays a greedy table on a fixed deal", () => {
		const scores = greedyTable(deckOf(48, 4), ["A01", "A02", "A03", "A04"], 2, 6, { majorityBonus: 5, burnCost: 2, placeBonus: [] });
		expect(Object.keys(scores)).toEqual(["A01", "A02", "A03", "A04"]);
		expect(Object.values(scores).every((score) => score > 0)).toBe(true);
	});
});

/**
 * The bot test behind P123: four seats draft four different lanes on many deals; A01 may also burn the
 * receiver's best card once the pack cannot come back to it. Returns A01's mean score with and without burns.
 */
function burnTest(rules: { majorityBonus: number; burnCost: number; placeBonus: readonly number[] }, deals: number): { readonly without: number; readonly with: number } {
	const seats = ["A01", "A02", "A03", "A04"];
	const lanes: Readonly<Record<string, string>> = { A01: "amber", A02: "basalt", A03: "cobalt", A04: "jade" };
	const play = (seed: number, burner: boolean): number => {
		const hands: Record<string, Card[]> = Object.fromEntries(seats.map((seat) => [seat, []]));
		const burns: Record<string, number> = { A01: 0 };
		for (const [index, row] of packsOf(createRng(seed).shuffle(deckOf(48, 4)), 4, 2, 6).entries()) {
			let held: Record<string, Card[]> = Object.fromEntries(seats.map((seat, k) => [seat, row[k] ?? []]));
			while (Object.values(held).some((pack) => pack.length > 0)) {
				const next: Record<string, Card[]> = {};
				for (const seat of seats) {
					const pack = held[seat] ?? [];
					const hand = hands[seat] ?? [];
					const card = pack.find((other) => other.kind === lanes[seat]) ?? pack.find((other) => other.kind === "lodestone") ?? pack[0];
					let rest = card === undefined ? pack : pack.filter((other) => other.id !== card.id);
					if (card !== undefined) hand.push(card);
					const receiver = receiverOf(seats, seat, index + 1);
					if (burner && seat === "A01" && (burns.A01 ?? 0) < 2 && rest.length > 0 && rest.length < seats.length) {
						const target = [...rest].sort((a, b) => gainOf(hands[receiver] ?? [], b) - gainOf(hands[receiver] ?? [], a))[0];
						if (target !== undefined && gainOf(hands[receiver] ?? [], target) >= 5) {
							rest = rest.filter((other) => other.id !== target.id);
							burns.A01 = (burns.A01 ?? 0) + 1;
						}
					}
					next[receiver] = rest;
				}
				held = next;
			}
		}
		return scoreTable(hands, burns, rules).A01?.total ?? 0;
	};
	let without = 0;
	let withBurns = 0;
	for (let seed = 0; seed < deals; seed++) {
		without += play(seed, false);
		withBurns += play(seed, true);
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
		const run = await playStory(options({ burns: true }), player);
		expect(run.end).toMatchObject({ reason: "referee", limit: "draft-rounds.match" });
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
		const second = run.events.filter((event) => event.type === "turn_started").map((event) => JSON.stringify(field(event, "inputs"))).find((text) => text.includes("Game 2 begins")) ?? "";
		expect(second).toMatch(/burns A01 L\d lodestone/);
		expect(second).toContain("A02 none");
	});

	it("plays without burns by default and keeps the burn arm and the old name", async () => {
		const run = await playStory(options(), player);
		expect(ofType(run.events, "draft_card_picked").some((event) => field(event, "burned") !== undefined)).toBe(false);
		expect(findCoreStory("quarry-noburn")?.story.id).toBe("quarry");
		const rules = (createHost(options()).toolSpecs("resident").find((spec) => spec.name === "pick")?.description ?? "");
		expect(rules).toContain("burn");
	});

	it("starts every game from a fresh context with the results so far and the seat's own brain", async () => {
		const run = await playStory(options(), player);
		const resets = run.events.filter((event) => event.type === "turn_started").flatMap((event) => {
			const inputs: unknown = field(event, "inputs");
			return Array.isArray(inputs) ? inputs.filter((input): input is { kind: string; text: string } => typeof input === "object" && input !== null && Reflect.get(input, "kind") === "context-reset").map((input) => ({ resident: event.actor, text: input.text })) : [];
		});
		const third = resets.filter((reset) => reset.text.startsWith("Game 3 begins"));
		expect(third).toHaveLength(4);
		for (const reset of third) {
			expect(reset.text).toContain("game 2: points A01");
			expect(reset.text).toContain("quarries A01 amber");
			expect(reset.text).toContain("Your strategy brain (version 3)");
		}
	});

	it("takes the first card of the pack for a missed pick and still ends the match", async () => {
		const run = await playStory(options({ brain: false }), idleAgent);
		expect(run.end).toMatchObject({ reason: "referee", limit: "draft-rounds.match" });
		const picks = ofType(run.events, "draft_card_picked");
		expect(picks).toHaveLength(3 * 48);
		expect(picks.every((event) => field(event, "missed") === true)).toBe(true);
	});

	it("passes left in the first pack round and right in the second, and refuses bad picks", async () => {
		const host = createHost(options({ brain: false, burns: true, games: 1, packs: 2, packSize: 2 }));
		host.start();
		const packOf = async (seat: string): Promise<string[]> => {
			const view = await host.call(as(seat), "viewTable", {});
			const text = view.ok ? view.reply : "";
			return (/Your pack: ([^.]+)\./.exec(text)?.[1] ?? "").split(", ").map((entry) => entry.split(" ")[0] ?? "");
		};
		const a01 = await packOf("A01");
		const a04 = await packOf("A04");
		expect(await host.call(as("A01"), "pick", { card: "Z9" })).toMatchObject({ ok: false, code: "NOT_IN_PACK" });
		expect(await host.call(as("A01"), "pick", { card: a01[0] ?? "", burn: a01[0] ?? "" })).toMatchObject({ ok: false, code: "BURN_IS_PICK" });
		expect(await host.call(as("A01"), "pick", { card: (a01[0] ?? "").toLowerCase() })).toMatchObject({ ok: true });
		expect(await host.call(as("A01"), "pick", { card: a01[1] ?? "" })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		for (const seat of ["A02", "A03", "A04"]) {
			const pack = await packOf(seat);
			expect(await host.call(as(seat), "pick", { card: pack[0] ?? "" })).toMatchObject({ ok: true });
		}
		// Pack round 1 passes to the next seat: A02 now holds what was left of A01's pack, A01 what was left of A04's.
		expect(await packOf("A02")).toEqual([a01[1]]);
		expect(await packOf("A01")).toEqual([a04[1]]);
		const view = await host.call(as("A02"), "viewTable", {});
		expect(view.ok && view.reply).toContain("passed to you by A01");
	});

	it("refuses every burn in the no-burn arm and says so in the rules", async () => {
		const host = createHost(options({ brain: false, games: 1, packs: 1, packSize: 3 }));
		host.start();
		const view = await host.call(as("A01"), "viewTable", {});
		const text = view.ok ? view.reply : "";
		expect(text).toContain("There are no burns in this game.");
		expect(text).not.toContain("Burns left");
		const pack = (/Your pack: ([^.]+)\./.exec(text)?.[1] ?? "").split(", ").map((entry) => entry.split(" ")[0] ?? "");
		expect(await host.call(as("A01"), "pick", { card: pack[0] ?? "", burn: pack[1] ?? "" })).toMatchObject({ ok: false, code: "NO_BURNS_LEFT" });
	});

	it("is registered with its arms", () => {
		for (const name of ["quarry", "quarry-nobrain", "quarry-open", "quarry-burn"]) expect(findCoreStory(name)?.story.id).toBe(name);
	});

	it("is deterministic and survives a snapshot round trip inside a game and inside a retro window", async () => {
		expect(await checkDeterminism(options(), () => player)).toEqual([]);
		for (const cut of [0, 3, 9]) expect(await checkSnapshotRoundTrip(options(), () => player, cut)).toEqual([]);
	});
});
