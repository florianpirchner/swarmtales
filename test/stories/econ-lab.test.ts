/** The econ lab story through the real mechanics: a scripted match of the three games, offline (docs/ideas/game-roadmap.md §2.2). */
import { describe, expect, it } from "vitest";
import type { CoreStory, EventEnvelope, TurnTaker } from "@swarmtales/contracts";
import { createHost, residentActor } from "@swarmtales/kernel";
import { pairsOf, referenceOf } from "../../mechanics/econ-games/src/model.ts";
import { createPromptLookup } from "@swarmtales/prompts";
import { checkDeterminism, checkSnapshotRoundTrip, idleAgent, playStory } from "@swarmtales/testkit";
import { econLabStory, type EconLabOptions } from "../../stories/econ-lab/story.ts";
import { findCoreStory } from "../../stories/index.ts";
import { field, ofType } from "./tictactoe-support.ts";

const as = residentActor;

function story(extra: EconLabOptions = {}): CoreStory {
	const base = econLabStory(extra);
	return { ...base, turns: { ...base.turns, order: (view) => view.residents } };
}

const options = (extra: EconLabOptions = {}) => ({ story: story(extra), prompts: createPromptLookup() });

/** A1 and A2 cooperate (put in 8, choose A), A3 and A4 do not (put in 2, choose B); everyone offers 4 and accepts 3 or more. */
const player: TurnTaker = async (turn) => {
	const told = turn.inputs.map((note) => note.text).join("\n");
	const kind = ["A01", "A02"].includes(turn.resident);
	if (told.includes("Retro after game") || told.includes("Before game 1")) {
		await turn.call("writeBrain", { text: `${turn.resident}: ${kind ? "share fairly and reward those who share" : "keep what I can"}.` });
		return;
	}
	if (told.includes("how many of your")) await turn.call("contribute", { amount: kind ? 8 : 2, reason: "script" });
	else if (told.includes("you are the proposer")) await turn.call("offer", { amount: 4, reason: "script" });
	else {
		const offer = /offers you (\d+) points/.exec(told)?.[1];
		if (offer !== undefined) await turn.call("respond", { accept: Number(offer) >= 3, reason: "script" });
		else if (told.includes("Choose A or B")) await turn.call("choose", { option: kind ? "A" : "B", reason: "script" });
	}
};

const payloads = (events: readonly EventEnvelope[], type: string): readonly unknown[] => ofType(events, type).map((event) => event.payload);

describe("econ-games rules", () => {
	it("pairs every seat with every other once in n-1 rounds and swaps the roles in the next cycle", () => {
		const seats = ["A01", "A02", "A03", "A04"];
		const met = new Set([1, 2, 3].flatMap((round) => pairsOf(seats, round).map((pair) => [...pair].sort().join("-"))));
		expect(met.size).toBe(6);
		expect(pairsOf(seats, 4)).toEqual(pairsOf(seats, 1).map(([first, second]) => [second, first]));
		// Six rounds: every seat proposes three times.
		const proposals = [1, 2, 3, 4, 5, 6].flatMap((round) => pairsOf(seats, round).map(([first]) => first));
		for (const seat of seats) expect(proposals.filter((first) => first === seat)).toHaveLength(3);
		// An odd table gives one seat a bye each round.
		expect(pairsOf(["A01", "A02", "A03"], 1).filter((pair) => pair.includes(null))).toHaveLength(1);
	});

	it("measures the distance from Nash play (0) and the social optimum (1)", () => {
		const rules = { endowment: 10, multiplier: 1.6, pie: 10, dilemma: { bothA: 3, bothB: 1, temptation: 5, sucker: 0 } };
		const seats = ["A01", "A02"];
		const all = referenceOf("public-goods", [{ round: 1, game: "public-goods", pool: 20, outcomes: seats.map((resident) => ({ resident, action: "contribute" as const, value: 10, payoff: 16, missed: false })) }], seats, rules);
		expect(all).toMatchObject({ cooperation: 1, efficiency: 1 });
		const defect = referenceOf("dilemma", [{ round: 1, game: "dilemma", outcomes: [
			{ resident: "A01", partner: "A02", action: "choose" as const, value: 0, partnerOption: "B" as const, payoff: 1, missed: false },
			{ resident: "A02", partner: "A01", action: "choose" as const, value: 0, partnerOption: "B" as const, payoff: 1, missed: false },
		] }], seats, rules);
		expect(defect).toMatchObject({ cooperation: 0, mutualCooperation: 0 });
		expect(defect.efficiency).toBeCloseTo(2 / 6, 3);
	});
});

describe("econ-lab, scripted match", () => {
	it("plays the three games in order with sealed decisions, payoffs and a brain per seat", async () => {
		const run = await playStory(options(), player);
		expect(run.end).toMatchObject({ reason: "referee", limit: "econ-games.match" });
		expect(ofType(run.events, "block_ended").map((event) => field(event, "game"))).toEqual(["ultimatum", "public-goods", "dilemma"]);
		expect(ofType(run.events, "round_resolved")).toHaveLength(18);
		expect(ofType(run.events, "decision_made").every((event) => JSON.stringify(event.audience) === JSON.stringify(["human"]))).toBe(true);
		expect(ofType(run.events, "block_scored").every((event) => JSON.stringify(event.audience) === JSON.stringify(["human"]))).toBe(true);

		// Ultimatum: every offer is 4 of 10 and accepted, so each pair earns the whole sum.
		const [ultimatum, fund, choice] = ofType(run.events, "block_scored").map((event) => field(event, "reference"));
		expect(ultimatum).toMatchObject({ meanOffer: 0.4, rejectionRate: 0, efficiency: 1, missed: 0 });
		// Public goods: two seats put in 8, two put in 2, so the mean share is a half.
		expect(fund).toMatchObject({ cooperation: 0.5, missed: 0 });
		// The A-or-B game: two A seats, two B seats, so half the choices are A.
		expect(choice).toMatchObject({ cooperation: 0.5, missed: 0 });

		const resolved = payloads(run.events, "round_resolved");
		const firstFund = ofType(run.events, "round_resolved").find((event) => field(event, "game") === "public-goods");
		expect(firstFund === undefined ? undefined : field(firstFund, "pool")).toBe(20);
		expect(resolved.length).toBe(18);

		// A free rider earns more in the fund than a contributor: 10 - 2 + 8 = 16 against 10 - 8 + 8 = 10.
		const [, fundScores] = ofType(run.events, "block_ended").map((event) => field(event, "scores"));
		expect(fundScores).toEqual({ A01: 70, A02: 70, A03: 112, A04: 112 });

		const totals = ofType(run.events, "match_ended").map((event) => field(event, "scores"));
		expect(totals).toHaveLength(1);

		// A first brain before game 1 and a new one after games 1 and 2, for each of the four seats.
		const written = ofType(run.events, "brain_written");
		expect(written).toHaveLength(12);
		expect(new Set(written.map((event) => field(event, "author")))).toEqual(new Set(["A01", "A02", "A03", "A04"]));
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
			expect(reset.text).toContain("game 1: the split offer, points");
			expect(reset.text).toContain("game 2: the shared fund, points A01 70, A02 70, A03 112, A04 112");
			expect(reset.text).toContain("Your strategy brain (version 3)");
			expect(reset.text).not.toContain("team");
		}
	});

	it("takes the defaults for missed decisions and still ends the match", async () => {
		const run = await playStory(options({ brain: false }), idleAgent);
		expect(run.end).toMatchObject({ reason: "referee", limit: "econ-games.match" });
		const references = ofType(run.events, "block_scored").map((event) => field(event, "reference"));
		expect(references).toHaveLength(3);
		// Ultimatum: 6 rounds x 2 proposers miss; the fund: 7 x 4 seats; the A-or-B game: 5 x 4 seats.
		// Points: nothing from the split offers, 10 kept per fund round, 1 per round of B against B.
		const missed = references.map((reference): unknown => {
			if (typeof reference !== "object" || reference === null) return undefined;
			const value: unknown = Reflect.get(reference, "missed");
			return value;
		});
		expect(missed).toEqual([12, 28, 20]);
		expect(ofType(run.events, "match_ended").map((event) => field(event, "scores"))).toEqual([{ A01: 75, A02: 75, A03: 75, A04: 75 }]);
	});

	it("gives the control arm no brain and no retro", async () => {
		const run = await playStory(options({ brain: false }), player);
		expect(ofType(run.events, "brain_written")).toHaveLength(0);
		expect(ofType(run.events, "retro_started")).toHaveLength(0);
		expect(ofType(run.events, "block_ended")).toHaveLength(3);
		const host = createHost(options({ brain: false }));
		expect(host.toolSpecs("resident").map((spec) => spec.name)).not.toContain("readBrain");
	});

	it("opens a decision only for the seat that owes it and refuses everything else", async () => {
		const host = createHost(options({ brain: false, blocks: [{ game: "ultimatum", rounds: 2 }] }));
		host.start();
		// Round 1: A01 proposes to A04, A02 to A03 (circle pairing); responders have nothing open yet.
		expect(host.openTools("A01")).toContain("offer");
		expect(host.openTools("A04")).not.toContain("respond");
		expect(await host.call(as("A04"), "offer", { amount: 5 })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(await host.call(as("A01"), "offer", { amount: 11 })).toMatchObject({ ok: false, code: "OUT_OF_RANGE" });
		expect(await host.call(as("A01"), "offer", { amount: 3 })).toMatchObject({ ok: true });
		expect(await host.call(as("A01"), "offer", { amount: 4 })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(await host.call(as("A02"), "offer", { amount: 5 })).toMatchObject({ ok: true });
		expect(host.openTools("A04")).toContain("respond");
		expect(await host.call(as("A04"), "respond", { accept: false })).toMatchObject({ ok: true });
		expect(await host.call(as("A03"), "respond", { accept: true })).toMatchObject({ ok: true });
		const round = ofType(host.log.all(), "round_resolved")[0];
		const outcomes = round === undefined ? [] : field(round, "outcomes");
		expect(outcomes).toEqual(expect.arrayContaining([expect.objectContaining({ resident: "A01", offer: 3, accepted: false, payoff: 0 }), expect.objectContaining({ resident: "A03", offer: 5, accepted: true, payoff: 5 })]));
		const view = await host.call(as("A04"), "viewTable", {});
		expect(view.ok && view.reply).toContain("you rejected");
	});

	it("is registered with its arms and single games", () => {
		for (const name of ["econ-lab", "econ-lab-nobrain", "econ-lab-ultimatum", "econ-lab-public-goods", "econ-lab-dilemma"]) expect(findCoreStory(name)?.story.id).toBe(name);
	});

	it("is deterministic and survives a snapshot round trip inside a game and inside a retro window", async () => {
		expect(await checkDeterminism(options(), () => player)).toEqual([]);
		for (const cut of [0, 3, 9]) expect(await checkSnapshotRoundTrip(options(), () => player, cut)).toEqual([]);
	});
});
