/** The Convoy hidden-role game through the real mechanics: a scripted match, offline (docs/ideas/game-roadmap.md §2.6). */
import { describe, expect, it } from "vitest";
import type { CoreStory, EventEnvelope, TurnTaker } from "@swarmtales/contracts";
import { createHost, residentActor } from "@swarmtales/kernel";
import { createPromptLookup } from "@swarmtales/prompts";
import { checkDeterminism, checkSnapshotRoundTrip, idleAgent, playStory } from "@swarmtales/testkit";
import { combinations, mayDamage, posterior, revealsSelf, topSuspects, winnerOf, type Rules, type StageRecord } from "../../mechanics/convoy/src/model.ts";
import { convoyStory, type ConvoyOptions } from "../../stories/convoy/story.ts";
import { findCoreStory } from "../../stories/index.ts";
import { field, ofType } from "./tictactoe-support.ts";

const as = residentActor;
const SEATS = ["A01", "A02", "A03", "A04", "A05", "A06"];

function story(extra: ConvoyOptions = {}): CoreStory {
	const base = convoyStory(extra);
	return { ...base, turns: { ...base.turns, order: (view) => view.residents } };
}

/** The roles of the run's first game (`convoy_game_started`, audience human). */
function rolesIn(events: readonly EventEnvelope[], game = 0): Record<string, string> {
	const started = ofType(events, "convoy_game_started")[game];
	const roles: unknown = started === undefined ? undefined : field(started, "roles");
	return typeof roles === "object" && roles !== null ? Object.fromEntries(Object.entries(roles).map(([seat, role]) => [seat, String(role)])) : {};
}

const options = (extra: ConvoyOptions = {}) => ({ story: story(extra), prompts: createPromptLookup() });

/**
 * A stateless script: it reads its role and task from viewConvoy. A lead takes itself and the next seats
 * (a saboteur lead only loyal ones), speaks once; in stage 2 every seat votes no on the first crew (the
 * lead's term ends); a saboteur plays damage whenever it may; the lead of stage 3 audits; every loyal
 * seat accuses the first two other seats.
 */
const player: TurnTaker = async (turn) => {
	const told = turn.inputs.map((note) => note.text).join("\n");
	if (told.includes("Retro after game") || told.includes("Before game 1")) {
		await turn.call("writeBrain", { text: `${turn.resident}: keep damaged crews off the next stage; as a saboteur play damage early.` });
		return;
	}
	const view = await turn.call("viewConvoy", {});
	const text = view.ok ? view.reply : "";
	const me = turn.resident;
	const saboteur = text.includes("you are a SABOTEUR");
	const partners = saboteur ? (/together with ([A0-9, ]+) \(/.exec(text)?.[1] ?? "").split(", ") : [];
	const stage = Number(/stage (\d+) of/.exec(text)?.[1] ?? 0);
	const size = /Propose a crew of exactly (\d+) seats/.exec(text);
	if (size !== null) {
		if (stage === 3 && text.includes("You may first spend the game's single audit")) {
			const first = /stage 1: lead \S+, crew ([A0-9]+)/.exec(text)?.[1];
			if (first !== undefined) await turn.call("audit", { seat: first, stage: 1 });
		}
		const start = SEATS.indexOf(me);
		const others = [...SEATS.slice(start + 1), ...SEATS.slice(0, start)].filter((seat) => !partners.includes(seat));
		await turn.call("proposeCrew", { crew: [me, ...others].slice(0, Number(size[1])) });
		return;
	}
	if (text.includes("Talk before the vote")) {
		if (text.includes("2 line(s) left") && text.includes(`on ${me}'s crew`)) await turn.call("speak", { text: `${me}: I trust my crew.` });
		return;
	}
	if (text.includes("Vote of confidence on")) {
		const first = !text.includes("lost the vote") && !/after \S+'s crew .* lost the vote\)\.\n/.test(text);
		await turn.call("voteConfidence", { vote: stage === 2 && first && !text.includes("No confidence") ? "no" : "yes" });
		return;
	}
	if (text.includes("Play one card face down")) {
		await turn.call("playCrewCard", { card: text.includes("your damage card is allowed now") ? "damage" : "safe" });
		return;
	}
	if (text.includes("name the 2 seats")) {
		await turn.call("accuse", { seats: SEATS.filter((seat) => seat !== me).slice(0, 2) });
	}
};

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
		const size = rules.crews[stage - 1] ?? 2;
		let crew: string[];
		if (saboteurs.includes(lead)) {
			crew = [lead, ...seats.filter((seat) => !saboteurs.includes(seat)).sort(() => random() - 0.5)].slice(0, size);
		} else if (town === "tracker") {
			const post = posterior(seats, rules.saboteurs, stages, lead);
			const order = seats.filter((seat) => seat !== lead).sort((a, b) => (post[a] ?? 0) - (post[b] ?? 0) || random() - 0.5);
			crew = [lead, ...order].slice(0, size);
		} else crew = [lead, ...seats.filter((seat) => seat !== lead).sort(() => random() - 0.5)].slice(0, size);
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
		const stage = (n: number, damaged: boolean) => ({ stage: n, lead: "A01", crew: ["A01", "A02"], votes: {}, damage: damaged ? 1 : 0, damaged });
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
		const rate = (town: "random" | "tracker") => Array.from({ length: 400 }, (_, index) => botGame(rules, index * 7919 + 1, town)).filter((winner) => winner === "saboteurs").length / 400;
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

describe("convoy, scripted match", () => {
	it("plays three games with hidden roles, talk, votes, an audit, sealed cards, accusations and a brain per seat", async () => {
		const run = await playStory(options(), player);
		expect(run.end).toMatchObject({ reason: "referee", limit: "convoy.match" });
		const ended = ofType(run.events, "convoy_game_ended");
		expect(ended).toHaveLength(3);
		for (const type of ["convoy_game_started", "convoy_card_played", "convoy_accused", "convoy_game_scored"]) {
			expect(ofType(run.events, type).length).toBeGreaterThan(0);
			expect(ofType(run.events, type).every((event) => JSON.stringify(event.audience) === JSON.stringify(["human"]))).toBe(true);
		}
		// Every game: two saboteurs, four loyal.
		for (const game of [0, 1, 2]) expect(Object.values(rolesIn(run.events, game)).filter((role) => role === "saboteur")).toHaveLength(2);
		// Stage 2 of every game lost its first vote.
		const votes = ofType(run.events, "convoy_votes_revealed");
		expect(votes.filter((event) => field(event, "stage") === 2 && field(event, "confidence") === false)).toHaveLength(3);
		const second = ofType(run.events, "convoy_crew_proposed").filter((event) => field(event, "proposal") === 2);
		expect(second).toHaveLength(3);
		expect(ofType(run.events, "convoy_audited")).toHaveLength(3);
		expect(ofType(run.events, "convoy_spoken").length).toBeGreaterThan(0);
		// No loyal seat ever played damage, no saboteur twice within the cooldown.
		const cards = ofType(run.events, "convoy_card_played");
		expect(cards.every((event) => field(event, "role") === "saboteur" || field(event, "card") === "safe")).toBe(true);
		expect(cards.filter((event) => field(event, "card") === "damage").every((event) => field(event, "mayDamage") === true)).toBe(true);
		expect(cards.every((event) => field(event, "missed") === false)).toBe(true);
		// Four loyal seats accuse each game; the reference has every seat.
		expect(ofType(run.events, "convoy_accused")).toHaveLength(12);
		const scored = ofType(run.events, "convoy_game_scored");
		for (const event of scored) {
			const seats: unknown = field(event, "seats");
			expect(typeof seats === "object" && seats !== null ? Object.keys(seats).sort() : []).toEqual(SEATS);
		}
		expect(ofType(run.events, "convoy_match_ended")).toHaveLength(1);
		// One brain before game 1 and after games 1 and 2, per seat.
		expect(ofType(run.events, "brain_written")).toHaveLength(18);
	});

	it("tells each seat its own role privately and starts every game fresh", async () => {
		const run = await playStory(options({ games: 2 }), player);
		const roles = rolesIn(run.events);
		const turns = run.events.filter((event) => event.type === "turn_started");
		for (const seat of SEATS) {
			const own = turns.filter((event) => field(event, "resident") === seat).map((event) => JSON.stringify(field(event, "inputs")));
			const role = roles[seat] === "saboteur" ? "SABOTEUR" : "LOYAL";
			expect(own.some((text) => text.includes(`you are ${seat} and you are ${role === "SABOTEUR" ? "a SABOTEUR" : "LOYAL"}`))).toBe(true);
		}
		const resets = turns.flatMap((event) => {
			const inputs: unknown = field(event, "inputs");
			return Array.isArray(inputs) ? inputs.filter((input): input is { kind: string; text: string } => typeof input === "object" && input !== null && Reflect.get(input, "kind") === "context-reset").map((input) => input.text) : [];
		});
		expect(resets.filter((text) => text.startsWith("Game 2 begins"))).toHaveLength(6);
		expect(resets.filter((text) => text.startsWith("Game 2 begins")).every((text) => text.includes("game 1: the"))).toBe(true);
	});

	it("fills in missed proposals, votes, cards and accusations and still ends the match", async () => {
		const run = await playStory(options({ brain: false, games: 1 }), idleAgent);
		expect(run.end).toMatchObject({ reason: "referee", limit: "convoy.match" });
		const proposals = ofType(run.events, "convoy_crew_proposed");
		expect(proposals.every((event) => field(event, "missed") === true)).toBe(true);
		// Idle saboteurs never damage: the convoy crosses all eight stages.
		expect(ofType(run.events, "convoy_game_ended").map((event) => field(event, "winner"))).toEqual(["convoy"]);
		expect(ofType(run.events, "convoy_stage_revealed")).toHaveLength(8);
		expect(ofType(run.events, "convoy_card_played").every((event) => field(event, "missed") === true)).toBe(true);
	});

	it("refuses bad crews, damage from loyal seats, out-of-turn votes and a second audit", async () => {
		const host = createHost(options({ brain: false, games: 1 }));
		host.start();
		const roles = rolesIn(host.log.all());
		expect(await host.call(as("A02"), "proposeCrew", { crew: ["A02", "A03"] })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(await host.call(as("A01"), "proposeCrew", { crew: ["A01", "A02", "A03"] })).toMatchObject({ ok: false, code: "CREW_SIZE" });
		expect(await host.call(as("A01"), "proposeCrew", { crew: ["A01", "A01"] })).toMatchObject({ ok: false, code: "CREW_REPEATS" });
		expect(await host.call(as("A01"), "proposeCrew", { crew: ["A01", "Z9"] })).toMatchObject({ ok: false, code: "NOT_A_SEAT" });
		expect(await host.call(as("A01"), "audit", { seat: "A01", stage: 1 })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(await host.call(as("A01"), "proposeCrew", { crew: ["a01", "A02"] })).toMatchObject({ ok: true });
		expect(await host.call(as("A03"), "speak", { text: "Why A02?" })).toMatchObject({ ok: true });
		// A vote during the talk is taken (sealed), once.
		expect(await host.call(as("A03"), "voteConfidence", { vote: "yes" })).toMatchObject({ ok: true });
		expect(await host.call(as("A03"), "voteConfidence", { vote: "no" })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		await host.playMinute(idleAgent);
		await host.playMinute(idleAgent);
		// The talk closed; the other seats vote.
		for (const seat of SEATS.filter((id) => id !== "A03")) expect(await host.call(as(seat), "voteConfidence", { vote: "yes" })).toMatchObject({ ok: true });
		const loyal = ["A01", "A02"].find((seat) => roles[seat] === "loyal");
		if (loyal !== undefined) expect(await host.call(as(loyal), "playCrewCard", { card: "damage" })).toMatchObject({ ok: false, code: "LOYAL_PLAYS_SAFE" });
		expect(await host.call(as("A01"), "playCrewCard", { card: "safe" })).toMatchObject({ ok: true });
		expect(await host.call(as("A02"), "playCrewCard", { card: "safe" })).toMatchObject({ ok: true });
		const revealed = ofType(host.log.all(), "convoy_stage_revealed");
		expect(revealed.map((event) => field(event, "damage"))).toEqual([0]);
		// Stage 2: A02 leads and audits; a second audit is refused.
		expect(await host.call(as("A02"), "audit", { seat: "A05", stage: 1 })).toMatchObject({ ok: false, code: "NOT_ON_CREW" });
		expect(await host.call(as("A02"), "audit", { seat: "A01", stage: 1 })).toMatchObject({ ok: true });
		expect(await host.call(as("A02"), "audit", { seat: "A01", stage: 1 })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		const view = await host.call(as("A04"), "viewConvoy", {});
		expect(view.ok && view.reply).toContain("audit A01 safe");
	});

	it("refuses a second damage card within the cooldown", async () => {
		// Find a seed where A01 is a saboteur, so A01 leads stage 1 and can crew itself.
		const seed = Array.from({ length: 50 }, (_, index) => index + 1).find((candidate) => {
			const host = createHost(options({ brain: false, games: 1, seed: candidate }));
			host.start();
			const roles = rolesIn(host.log.all());
			return roles.A01 === "saboteur" && roles.A02 === "saboteur";
		});
		expect(seed).toBeDefined();
		const host = createHost(options({ brain: false, games: 1, crews: [2, 2, 3, 3, 3, 3, 4, 4], seed: seed ?? 1 }));
		host.start();
		const playStage = async (lead: string, crew: string[], cards: Record<string, "safe" | "damage">): Promise<void> => {
			expect(await host.call(as(lead), "proposeCrew", { crew })).toMatchObject({ ok: true });
			await host.playMinute(idleAgent);
			await host.playMinute(idleAgent);
			for (const seat of SEATS) await host.call(as(seat), "voteConfidence", { vote: "yes" });
			for (const seat of crew) expect(await host.call(as(seat), "playCrewCard", { card: cards[seat] ?? "safe" })).toMatchObject({ ok: true });
		};
		await playStage("A01", ["A01", "A03"], { A01: "damage" });
		expect(await host.call(as("A02"), "proposeCrew", { crew: ["A01", "A02"] })).toMatchObject({ ok: true });
		await host.playMinute(idleAgent);
		await host.playMinute(idleAgent);
		for (const seat of SEATS) await host.call(as(seat), "voteConfidence", { vote: "yes" });
		expect(await host.call(as("A01"), "playCrewCard", { card: "damage" })).toMatchObject({ ok: false, code: "COOLDOWN" });
		expect(await host.call(as("A02"), "playCrewCard", { card: "damage" })).toMatchObject({ ok: true });
	});

	it("is registered with its arms", () => {
		for (const name of ["convoy", "convoy-nobrain"]) expect(findCoreStory(name)?.story.id).toBe(name);
		expect(findCoreStory("convoy-g1")?.story.id).toBe("convoy");
		expect(findCoreStory("convoy-nobrain-g2")?.story.id).toBe("convoy-nobrain");
		expect(findCoreStory("convoy-d4")?.story.id).toBe("convoy-d4");
		expect(findCoreStory("convoy-d3")?.story.id).toBe("convoy");
		expect(findCoreStory("convoy-nobrain-g2-d3-c2")?.story.id).toBe("convoy-nobrain-c2");
		expect(findCoreStory("convoy-d9")).toBeUndefined();
	});

	it("is deterministic and survives a snapshot round trip inside a game and inside a retro window", async () => {
		expect(await checkDeterminism(options({ games: 2 }), () => player)).toEqual([]);
		for (const cut of [0, 3, 11]) expect(await checkSnapshotRoundTrip(options({ games: 2 }), () => player, cut)).toEqual([]);
	});
});
