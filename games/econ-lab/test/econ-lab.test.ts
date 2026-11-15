// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Econ Lab through the real mechanics: a scripted match of the three games, offline. Carried from
 * `test/stories/econ-lab.test.ts`; the assertions on the old `turn_started` read `activation_opened`, and the end of
 * the match is a limit of the mechanic (`reason: "limit"`, the old `"referee"`). The part of the old test that
 * belongs to the mechanic alone is in `mechanics/econ-games/test/` (the rule block, the locks of a decision). Not
 * carried: the assertion on the old name registry ("is registered with its arms and single games");
 * `carried.test.ts` holds what replaces it.
 */
import { checkDeterminism, checkSnapshotRoundTrip, idleDriver, play } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { field, ofType, player, rosterGame, shown } from "./support.ts";

const players = { drivers: { resident: player } };
const SEATS = ["A01", "A02", "A03", "A04"];
const HUMAN = JSON.stringify(["human"]);
const STEPS = ["retro_closed", "block_started", "block_ended", "match_ended"];

// The steps of the match in log order, runs of one type folded into `type x count`.
function stepsOf(events: Parameters<typeof ofType>[0]): string[] {
	const steps: { type: string; count: number }[] = [];
	for (const event of events.filter((other) => STEPS.includes(other.type))) {
		const last = steps.at(-1);
		if (last?.type === event.type) last.count += 1;
		else steps.push({ type: event.type, count: 1 });
	}
	return steps.map((step) => `${step.type} x${String(step.count)}`);
}

describe("econ-lab, scripted match", () => {
	it("plays the three games in order with sealed decisions, payoffs and a brain per seat", async () => {
		const run = await play(rosterGame(), players);
		expect(run.end).toMatchObject({ reason: "limit", limit: "econ-games.match" });
		expect(ofType(run.events, "block_ended").map((event) => field(event, "game"))).toEqual(["ultimatum", "public-goods", "dilemma"]);
		expect(ofType(run.events, "round_resolved")).toHaveLength(18);
		expect(ofType(run.events, "decision_made").every((event) => JSON.stringify(event.audience) === HUMAN)).toBe(true);
		expect(ofType(run.events, "block_scored").every((event) => JSON.stringify(event.audience) === HUMAN)).toBe(true);

		// Ultimatum: every offer is 4 of 10 and accepted, so each pair earns the whole sum.
		const [ultimatum, fund, choice] = ofType(run.events, "block_scored").map((event) => field(event, "reference"));
		expect(ultimatum).toMatchObject({ meanOffer: 0.4, rejectionRate: 0, efficiency: 1, missed: 0 });
		// Public goods: two seats put in 8, two put in 2, so the mean share is a half.
		expect(fund).toMatchObject({ cooperation: 0.5, missed: 0 });
		// The A-or-B game: two A seats, two B seats, so half the choices are A.
		expect(choice).toMatchObject({ cooperation: 0.5, missed: 0 });
		const firstFund = ofType(run.events, "round_resolved").find((event) => field(event, "game") === "public-goods");
		expect(firstFund === undefined ? undefined : field(firstFund, "pool")).toBe(20);

		// A free rider earns more in the fund than a contributor: 10 - 2 + 8 = 16 against 10 - 8 + 8 = 10.
		const [, fundScores] = ofType(run.events, "block_ended").map((event) => field(event, "scores"));
		expect(fundScores).toEqual({ A01: 70, A02: 70, A03: 112, A04: 112 });
		const totals = ofType(run.events, "match_ended").map((event) => field(event, "scores"));
		expect(totals).toHaveLength(1);
		expect(run.kernel.fact("econ-games.scores")).toEqual(totals[0]);

		// A first brain before game 1 and a new one after games 1 and 2, for each of the four seats.
		const written = ofType(run.events, "brain_written");
		expect(written).toHaveLength(12);
		expect(new Set(written.map((event) => field(event, "author")))).toEqual(new Set(SEATS));
	});

	it("holds every game until the brains are written and releases it then (the brain-source service)", async () => {
		const run = await play(rosterGame(), players);
		// Before game 1 and after games 1 and 2 the four windows close first, then the game starts; no window after the last game.
		const window = ["retro_closed x4", "block_started x1", "block_ended x1"];
		expect(stepsOf(run.events)).toEqual([...window, ...window, ...window, "match_ended x1"]);
		expect(ofType(run.events, "retro_closed").every((event) => field(event, "reason") === "written")).toBe(true);
		// Seats that never write: every window runs to its timeout, and the game starts all the same.
		const silent = await play(rosterGame(), { drivers: { resident: idleDriver } });
		expect(stepsOf(silent.events)).toEqual([...window, ...window, ...window, "match_ended x1"]);
		expect(ofType(silent.events, "brain_written")).toHaveLength(0);
		expect(ofType(silent.events, "retro_closed").every((event) => field(event, "reason") === "timeout")).toBe(true);
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
			expect(reset.text).toContain("game 1: the split offer, points");
			expect(reset.text).toContain("game 2: the shared fund, points A01 70, A02 70, A03 112, A04 112");
			expect(reset.text).toContain("Your strategy brain (version 3)");
			expect(reset.text).not.toContain("team");
		}
	});

	it("takes the defaults for missed decisions and still ends the match", async () => {
		const run = await play(rosterGame({ brain: false }), { drivers: { resident: idleDriver } });
		expect(run.end).toMatchObject({ reason: "limit", limit: "econ-games.match" });
		// Ultimatum: 6 rounds x 2 proposers miss; the fund: 7 x 4 seats; the A-or-B game: 5 x 4 seats.
		// Points: nothing from the split offers, 10 kept per fund round, 1 per round of B against B.
		const missed = ofType(run.events, "block_scored").map((event): unknown => {
			const reference = field(event, "reference");
			return typeof reference === "object" && reference !== null ? Reflect.get(reference, "missed") : undefined;
		});
		expect(missed).toEqual([12, 28, 20]);
		expect(ofType(run.events, "match_ended").map((event) => field(event, "scores"))).toEqual([{ A01: 75, A02: 75, A03: 75, A04: 75 }]);
	});

	it("gives the control arm no brain and no retro", async () => {
		const run = await play(rosterGame({ brain: false }), players);
		expect(ofType(run.events, "brain_written")).toHaveLength(0);
		expect(ofType(run.events, "retro_started")).toHaveLength(0);
		expect(ofType(run.events, "block_ended")).toHaveLength(3);
		expect(run.kernel.toolSpecs("resident").map((spec) => spec.name)).toEqual(["viewTable", "contribute", "offer", "respond", "choose"]);
	});

	it("plays one game alone and tells the horizon only when asked", async () => {
		const single = await play(rosterGame({ brain: false, blocks: [{ game: "dilemma", rounds: 12 }] }), players);
		expect(single.end).toMatchObject({ reason: "limit", limit: "econ-games.match" });
		expect(ofType(single.events, "round_resolved")).toHaveLength(12);
		const told = async (showHorizon: boolean): Promise<string> => JSON.stringify(shown((await play(rosterGame({ showHorizon }), players)).events));
		expect(await told(true)).toContain("6 rounds");
		expect(await told(false)).not.toContain("6 rounds");
	});

	it("is deterministic and survives a snapshot round trip before the first brain, inside a game and before the last game", async () => {
		expect(await checkDeterminism(rosterGame(), () => player)).toEqual([]);
		// The old cuts were 0, 3 and 9; this match ends in tick 8, and the new check refuses a cut after the end, so the last cut is 6.
		for (const cut of [0, 3, 6]) expect(await checkSnapshotRoundTrip(rosterGame(), () => player, cut)).toEqual([]);
	});
});
