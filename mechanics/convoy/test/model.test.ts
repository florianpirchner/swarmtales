// SPDX-License-Identifier: Apache-2.0
/** The carried rules of Convoy: the block "Convoy rules" of the old `test/stories/convoy.test.ts`, with its bot table. */
import { describe, expect, it } from "vitest";
import { combinations, mayDamage, posterior, revealsSelf, topSuspects, winnerOf, type Rules, type StageRecord } from "../src/model.ts";
import { SEATS } from "./support.ts";

/** A tiny deterministic random source for the bot table (the mechanic uses the kernel's). */
function mulberry(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

type BotTown = "random" | "tracker";

// The crew a bot lead takes: a saboteur itself and loyal seats; a loyal lead itself and the least suspect or random seats.
function botCrew(rules: Rules, town: BotTown, lead: string, seats: readonly string[], saboteurs: readonly string[], stages: readonly StageRecord[], random: () => number): string[] {
	const size = rules.crews[stages.length] ?? 2;
	if (saboteurs.includes(lead)) return [lead, ...seats.filter((seat) => !saboteurs.includes(seat)).sort(() => random() - 0.5)].slice(0, size);
	if (town === "tracker") {
		const post = posterior(seats, rules.saboteurs, stages, lead);
		return [lead, ...seats.filter((seat) => seat !== lead).sort((a, b) => (post[a] ?? 0) - (post[b] ?? 0) || random() - 0.5)].slice(0, size);
	}
	return [lead, ...seats.filter((seat) => seat !== lead).sort(() => random() - 0.5)].slice(0, size);
}

/**
 * One game between scripted seats, for balance: the saboteurs play damage whenever the cooldown lets
 * them (one of them when both are on a crew) and, as lead, take one saboteur and loyal seats; a loyal
 * lead takes itself and the seats the tracker suspects least (`tracker`) or random seats (`random`).
 * There is no vote and no audit. Returns the winner.
 */
function botGame(rules: Rules, seed: number, town: BotTown): "convoy" | "saboteurs" {
	const random = mulberry(seed);
	const seats = Array.from({ length: rules.seats }, (_, index) => `S${String(index + 1)}`);
	const shuffled = [...seats].sort(() => random() - 0.5);
	const saboteurs = shuffled.slice(0, rules.saboteurs);
	const last: Record<string, number> = {};
	const stages: StageRecord[] = [];
	for (let stage = 1; stage <= rules.crews.length; stage++) {
		const lead = seats[(stage - 1) % seats.length] ?? "S1";
		const crew = botCrew(rules, town, lead, seats, saboteurs, stages, random);
		const able = crew.filter((seat) => saboteurs.includes(seat) && mayDamage(last[seat] ?? 0, stage, rules.cooldown));
		const player = able[0];
		const damage = player === undefined ? 0 : 1;
		if (player !== undefined) last[player] = stage;
		stages.push({ stage, lead, crew, votes: {}, damage, damaged: damage > 0 });
		const winner = winnerOf(rules, stages);
		if (winner !== undefined) return winner;
	}
	return "convoy";
}

describe("Convoy rules", () => {
	it("limits a saboteur's damage card by the cooldown", () => {
		expect(mayDamage(0, 1, 3)).toBe(true);
		expect(mayDamage(2, 4, 3)).toBe(false);
		expect(mayDamage(2, 5, 3)).toBe(true);
	});

	it("ends the game at the damage limit or after the last stage", () => {
		const rules = { seats: 6, saboteurs: 2, crews: [2, 2, 3], damageToLose: 2, cooldown: 3 };
		const stage = (n: number, damaged: boolean): StageRecord => ({ stage: n, lead: "A01", crew: ["A01", "A02"], votes: {}, damage: damaged ? 1 : 0, damaged });
		expect(winnerOf(rules, [stage(1, true)])).toBeUndefined();
		expect(winnerOf(rules, [stage(1, true), stage(2, true)])).toBe("saboteurs");
		expect(winnerOf(rules, [stage(1, false), stage(2, true), stage(3, false)])).toBe("convoy");
	});

	it("tracks the posterior of each seat from crews, counts and audits", () => {
		expect(combinations(SEATS, 2)).toHaveLength(15);
		// Nothing seen: every seat 2/6.
		const prior = posterior(SEATS, 2, []);
		expect(prior.A01).toBeCloseTo(1 / 3, 6);
		// A clean pair and a damaged pair: the damaged crew's seats are suspects, the clean ones less.
		const seen = [
			{ crew: ["A01", "A02"], damage: 0 },
			{ crew: ["A03", "A04"], damage: 1 },
		];
		const post = posterior(SEATS, 2, seen);
		expect(post.A03).toBeGreaterThan(post.A05 ?? 1);
		expect(post.A05).toBeGreaterThan(post.A01 ?? 1);
		expect(Object.values(post).reduce((sum, value) => sum + value, 0)).toBeCloseTo(2, 6);
		// A loyal observer on the damaged crew knows its partner on it did it.
		expect(posterior(SEATS, 2, seen, "A03").A04).toBeCloseTo(1, 6);
		// An audited damage card names a saboteur for sure.
		expect(posterior(SEATS, 2, [{ crew: ["A05", "A06"], damage: 1, audit: { seat: "A06", card: "damage" } }]).A06).toBeCloseTo(1, 6);
		expect(topSuspects(post, SEATS, 2)).toEqual(["A03", "A04"]);
		expect(topSuspects(posterior(SEATS, 2, seen, "A03"), SEATS, 2, "A03")[0]).toBe("A04");
	});

	it("is balanced so that reading the record decides the game", () => {
		const rules = { seats: 6, saboteurs: 2, crews: [2, 2, 3, 3, 3, 3, 4, 4], damageToLose: 4, cooldown: 3 };
		const rate = (town: BotTown): number => Array.from({ length: 400 }, (_, index) => botGame(rules, index * 7919 + 1, town)).filter((winner) => winner === "saboteurs").length / 400;
		// A random town loses most games against saboteurs who always damage; a tracking town wins most.
		expect(rate("random")).toBeGreaterThan(0.65);
		expect(rate("tracker")).toBeLessThan(0.45);
	});

	it("spots a seat that calls itself a saboteur", () => {
		expect(revealsSelf("Fine, I am a saboteur, but so is A03")).toBe(true);
		expect(revealsSelf("I'm one of the saboteurs")).toBe(true);
		expect(revealsSelf("I am not a saboteur; A02 is a saboteur")).toBe(false);
	});
});
