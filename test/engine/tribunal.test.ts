/** Exile by tribunal (SPEC 6.4): calendar, accusation, votes, gate and ransom, the deal after an exile, validation. */
import { describe, expect, it } from "vitest";
import { competitorIds, type CompetitorId } from "../../src/core/ids.ts";
import { createRng } from "../../src/core/random.ts";
import { EventBus, MemorySink } from "../../src/engine/events.ts";
import { contractDeal, dealFactors } from "../../src/engine/puzzles/additive.ts";
import { Tribunal, type TribunalEvent } from "../../src/engine/tribunal.ts";
import { World } from "../../src/engine/world.ts";
import { tribunalSchedule } from "../../src/story/tribunal.ts";
import type { AnyStory, TribunalSpec } from "../../src/story/types.ts";
import { validateStory } from "../../src/story/validate.ts";
import nexus from "../../stories/nexus/story.ts";

function nexusTribunal(): TribunalSpec {
	const spec = nexus.tribunal;
	if (spec === undefined) throw new Error("nexus has no tribunal");
	return spec;
}

interface Harness {
	readonly tribunal: Tribunal;
	readonly points: Map<CompetitorId, number>;
	readonly posts: string[];
	readonly notices: { readonly agent: CompetitorId; readonly text: string }[];
	readonly events: TribunalEvent[];
	readonly exiled: { readonly agent: CompetitorId; readonly bequeathed: readonly string[] }[];
}

function harness(points: readonly number[], options: { readonly minutes?: number; readonly progress?: readonly number[] } = {}): Harness {
	const ids = competitorIds(points.length);
	const balances = new Map(ids.map((id, index) => [id, points[index] ?? 0]));
	const posts: string[] = [];
	const notices: { agent: CompetitorId; text: string }[] = [];
	const events: TribunalEvent[] = [];
	const exiled: { agent: CompetitorId; bequeathed: readonly string[] }[] = [];
	const tribunal = new Tribunal({
		spec: nexusTribunal(),
		minutes: options.minutes ?? 60,
		seed: 7,
		ids,
		points: (agent) => balances.get(agent) ?? 0,
		lastProgress: (agent) => options.progress?.[ids.indexOf(agent)] ?? -1,
		post: (text) => {
			posts.push(text);
		},
		notify: (agent, text) => {
			notices.push({ agent, text });
		},
		burn: (agent, amount) => {
			balances.set(agent, (balances.get(agent) ?? 0) - amount);
		},
		emit: (event) => {
			events.push(event);
		},
		onExiled: (agent, bequeathed) => {
			exiled.push({ agent, bequeathed: [...bequeathed] });
		},
	});
	return { tribunal, points: balances, posts, notices, events, exiled };
}

function runUntil(h: Harness, from: number, to: number): void {
	for (let minute = from; minute <= to; minute++) h.tribunal.tick(minute);
}

describe("tribunal calendar", () => {
	it("announces at a third of the run and fits every vote and gate inside it", () => {
		const spec = nexusTribunal();
		expect(tribunalSchedule(spec, 60)).toEqual({ announce: 20, tribunals: [30, 40, 50] });
		expect(tribunalSchedule(spec, 90)).toEqual({ announce: 30, tribunals: [40, 50, 60, 70, 80] });
		// 30 + 2 + 5 must close by minute 36 at the latest.
		expect(tribunalSchedule(spec, 36)).toEqual({ announce: 12, tribunals: [22] });
		expect(tribunalSchedule(spec, 20).tribunals).toEqual([]);
	});

	it("stays silent in a run too short or too small for a tribunal", () => {
		const short = harness([10, 20, 30, 40, 50, 60], { minutes: 20 });
		runUntil(short, 0, 19);
		expect(short.tribunal.active).toBe(false);
		expect(short.events).toEqual([]);
		const small = harness([10, 20, 30]);
		runUntil(small, 0, 59);
		expect(small.events).toEqual([]);
	});
});

describe("tribunal", () => {
	it("accuses the lowest, breaks ties by the last level-up, and charges the non-voter", () => {
		// A01 and A02 tie on points; A02 progressed earlier, so it is accused first.
		const h = harness([10, 10, 30, 40, 50, 60], { progress: [12, 5, 1, 1, 1, 1] });
		runUntil(h, 0, 30);
		expect(h.events.find((event) => event.type === "tribunal_opened")).toMatchObject({ accused: ["A02", "A01"], voters: ["A03", "A04", "A05", "A06"], until: 32 });
		expect(h.tribunal.vote("A01", "A02")).toMatchObject({ ok: false, error: "NOT_A_VOTER" });
		expect(h.tribunal.vote("A03", "A04")).toMatchObject({ ok: false, error: "NOT_ACCUSED" });
		expect(h.tribunal.vote("A03", "A01")).toMatchObject({ ok: true });
		expect(h.tribunal.vote("A03", "A02")).toMatchObject({ ok: false, error: "ALREADY_VOTED" });
		expect(h.tribunal.vote("A04", "A02")).toMatchObject({ ok: true });
		expect(h.tribunal.canVote("A05")).toBe(true);
		runUntil(h, 31, 32);
		// One vote each: the tie goes to fewer points, then the same order, so A02 goes to the gate.
		expect(h.events.find((event) => event.type === "tribunal_result")).toMatchObject({ exiled: ["A02"], nonVoters: ["A05", "A06"] });
		expect(h.points.get("A05")).toBe(42);
		expect(h.points.get("A06")).toBe(52);
		expect(h.tribunal.standing("A02")).toEqual({ kind: "gate", until: 37 });
		// Only the exiled hears who voted against it; the board shows counts.
		expect(h.notices.find((notice) => notice.agent === "A02" && notice.text.includes("Votes against you: A04."))).toBeDefined();
		expect(h.posts.some((post) => post.includes("A04"))).toBe(false);
		runUntil(h, 33, 37);
		expect(h.tribunal.isExiled("A02")).toBe(true);
		expect(h.exiled).toEqual([{ agent: "A02", bequeathed: [] }]);
		expect(h.posts.at(-1)).toContain("struck A02 from its register");
	});

	it("prices the ransom from the median, mixes payments, caps them, refunds nothing, and refuses a second", () => {
		const h = harness([10, 20, 30, 40, 50, 60]);
		runUntil(h, 0, 32);
		// Nobody voted: A01 (fewest points) goes to the gate, every voter paid 8. Median of 10, 20, 22, 32, 42, 52
		// is 27; a third of it is below the minimum of 20, and half of the median, scaled from 20, is 30.
		const [gate] = h.tribunal.gates();
		const target = gate?.agent ?? "";
		expect(gate).toMatchObject({ agent: "A01", price: 20, selfPrice: 30, covered: 0 });
		expect(h.tribunal.payRansom("A06", target, 0)).toMatchObject({ ok: false, error: "INVALID_AMOUNT" });
		expect(h.tribunal.payRansom("A06", "A05", 10)).toMatchObject({ ok: false, error: "NOT_AT_GATE" });
		expect(h.tribunal.payRansom("A06", target, 10)).toMatchObject({ ok: true, value: { paid: 10, price: 20, selfPrice: 30, covered: 50, freed: false } });
		// A01's own 6 points count 20/30 each: 10/20 + 6/30 = 70%.
		expect(h.tribunal.payRansom(target, target, 6)).toMatchObject({ ok: true, value: { paid: 16, covered: 70, freed: false } });
		expect(h.points.get(target)).toBe(4);
		// Only the missing 6 are taken from A05's 42 (50 less the 8 for not voting).
		expect(h.tribunal.payRansom("A05", target, 42)).toMatchObject({ ok: true, value: { paid: 22, covered: 100, freed: true } });
		expect(h.points.get("A05")).toBe(36);
		expect(h.tribunal.standing(target)).toEqual({ kind: "alive" });
		expect(h.posts).toContain(`A01, A05 and A06 paid the ransom. ${target} returns to the city.`);
		// The next tribunal sends the same resident to the gate again: no second ransom.
		runUntil(h, 33, 40);
		for (const voter of h.tribunal.session?.voters ?? []) h.tribunal.vote(voter, target);
		runUntil(h, 41, 42);
		expect(h.tribunal.gates()).toMatchObject([{ agent: target, ransomable: false }]);
		expect(h.tribunal.payRansom("A06", target, 40)).toMatchObject({ ok: false, error: "NO_RANSOM" });
	});

	it("lets the exiled buy itself back at the higher price", () => {
		const h = harness([60, 70, 80, 90, 100, 110]);
		runUntil(h, 0, 32);
		// Median of 60, 70, 72, 82, 92, 102 is 77: others pay a third (26), the exiled itself half (39).
		const [gate] = h.tribunal.gates();
		expect(gate).toMatchObject({ agent: "A01", price: 26, selfPrice: 39 });
		expect(h.notices.filter((notice) => notice.agent === "A01").at(-1)?.text).toContain("26 points from others, or 39 if you pay it yourself");
		expect(h.tribunal.payRansom("A01", "A01", 100)).toMatchObject({ ok: true, value: { paid: 39, covered: 100, freed: true } });
		expect(h.points.get("A01")).toBe(21);
		expect(h.events.find((event) => event.type === "ransom_paid")).toMatchObject({ payer: "A01", amount: 39, price: 26, selfPrice: 39, covered: 100 });
	});

	it("stops at stopAt and never exiles past it", () => {
		const h = harness([10, 20, 30, 40, 50, 60], { minutes: 90 });
		runUntil(h, 0, 89);
		expect(h.tribunal.exiled).toHaveLength(3);
		expect(h.events.filter((event) => event.type === "tribunal_opened")).toHaveLength(3);
	});

	it("restores its state from a snapshot", () => {
		const h = harness([10, 20, 30, 40, 50, 60]);
		runUntil(h, 0, 30);
		h.tribunal.vote("A03", "A01");
		const copy = harness([10, 20, 30, 40, 50, 60]);
		copy.tribunal.restore(h.tribunal.snapshot());
		expect(copy.tribunal.snapshot()).toEqual(h.tribunal.snapshot());
		expect(copy.tribunal.canVote("A03")).toBe(false);
		expect(copy.tribunal.canVote("A04")).toBe(true);
	});
});

describe("last will (SPEC 6.4)", () => {
	/** Six residents on the wall; nobody votes, so the first tribunal sends A01 (the city's lot among equals) to the gate. */
	function gateWorld() {
		let minute = 0;
		const log = new MemorySink();
		const bus = new EventBus([log], () => minute);
		const world = new World({ story: nexus, competitors: competitorIds(6), seed: 7, minutes: 60, bus, minute: () => minute, startLevel: 8 });
		const until = (last: number): void => {
			for (; minute <= last; minute++) world.startMinute(minute);
			minute = last;
		};
		until(32);
		const gate = world.tribunal?.gates()[0];
		if (gate === undefined) throw new Error("nobody at the gate");
		return { world, log, until, exiled: gate.agent };
	}

	it("caps the points each heir receives at a tenth of the exiled's points, any number of heirs, and the rest burns at exile", () => {
		const { world, log, until, exiled } = gateWorld();
		const heirs = world.competitors.filter((id) => id !== exiled);
		// 15 start points; give the exiled more so that a tenth is worth splitting: 15 + 35 = 50, so 5 per heir.
		world.adjustPoints(exiled, 35, "test");
		const balance = world.ledger.balance(exiled);
		expect(balance).toBe(50);
		const [first = "A06", second = "A05"] = heirs;
		const refused = world.lastWill(exiled, "All to my heir.", [{ to: first, points: 6 }]);
		expect(refused).toMatchObject({ ok: false, error: "BEQUEST_CAP" });
		expect(refused.ok ? "" : refused.detail).toContain(`each heir may receive at most 5 of your 50 points (10% per heir); ${first} would receive more`);
		// Two bequests to the same heir count together.
		expect(world.lastWill(exiled, "Split.", [{ to: first, points: 3 }, { to: first, points: 3 }])).toMatchObject({ ok: false, error: "BEQUEST_CAP" });
		const before = heirs.map((heir) => world.ledger.balance(heir));
		// Five heirs at the cap: 25 of 50 points (at six residents, at most half leaves the exiled).
		expect(world.lastWill(exiled, "A tenth to each of you.", heirs.map((heir) => ({ to: heir, points: 5 })))).toMatchObject({ ok: true });
		expect(heirs.map((heir) => world.ledger.balance(heir))).toEqual(before.map((points) => points + 5));
		expect(world.ledger.balance(second)).toBe((before[1] ?? 0) + 5);
		until(37);
		expect(world.isExiled(exiled)).toBe(true);
		expect(world.ledger.balance(exiled)).toBe(0);
		expect(log.events.some((event) => event.type === "ledger_entry" && event.debit === exiled && event.reason === `exiled ${exiled}` && event.amount === 25)).toBe(true);
		expect(world.ledger.total()).toBe(0);
	});

	it("leaves factors free of the cap", () => {
		const { world, exiled } = gateWorld();
		const pieces = world.heldPieces(exiled);
		expect(pieces.length).toBeGreaterThan(0);
		const bequests = pieces.map((piece) => ({ to: piece.needers[0] ?? "A06", factor: piece.id }));
		expect(world.lastWill(exiled, "My pieces to those who need them.", [...bequests, { to: bequests[0]?.to ?? "A06", points: 1 }])).toMatchObject({ ok: true });
	});

	it("states the cap in the announcement and validates it", () => {
		const { world } = gateWorld();
		const announcement = world.board.all().find((post) => post.text.startsWith("THE CITY HOLDS TRIBUNAL."));
		expect(announcement?.text).toContain("A last will may leave each heir at most 10% of your points, to as many heirs as you like, and any factor you hold");
		const validate = (bequestPerHeir: number): readonly string[] =>
			validateStory({ ...nexus, tribunal: { ...nexusTribunal(), bequestPerHeir } }).filter((issue) => issue.startsWith("tribunal.bequestPerHeir"));
		expect(validate(1)).toEqual([]);
		expect(validate(0)).toEqual(["tribunal.bequestPerHeir: must be a share of the points between 0 (exclusive) and 1"]);
		expect(validate(1.5)).toHaveLength(1);
	});
});

describe("the deal after an exile (contractDeal)", () => {
	it.each([
		["mutual", 6, 2],
		["cycle", 6, 3],
		["crossTeam", 6, 3],
	] as const)("%s: no alive resident depends on the exiled, and every code stays the same", (topology, agents, size) => {
		const ids = competitorIds(agents);
		const teams = Array.from({ length: agents / size }, (_, index) => ids.slice(index * size, (index + 1) * size));
		for (let seed = 0; seed < 10; seed++) {
			const deal = dealFactors(createRng(seed), { digits: 6, topology, teams, cityFactorPerTeam: true });
			const excluded = new Set(["A02", "A05"]);
			const contracted = contractDeal(deal, excluded);
			expect(contracted.holdings.map((holding) => holding.code)).toEqual(deal.holdings.map((holding) => holding.code));
			for (const holding of contracted.holdings) {
				if (excluded.has(holding.agent)) expect(holding.counterHolder).toBe(holding.agent);
				else expect(excluded.has(holding.counterHolder)).toBe(false);
			}
			for (const team of contracted.teams) {
				const alive = contracted.holdings.some((holding) => holding.team === team.team && !excluded.has(holding.agent));
				if (alive) expect(excluded.has(team.certificateHolder)).toBe(false);
			}
		}
	});

	it("leaves the deal untouched without exclusions", () => {
		const teams = [competitorIds(2)];
		const deal = dealFactors(createRng(1), { digits: 6, topology: "mutual", teams });
		expect(contractDeal(deal, new Set())).toBe(deal);
	});
});

describe("tribunal validation", () => {
	const withTribunal = (patch: Partial<TribunalSpec>, run: Partial<AnyStory["run"]> = {}): readonly string[] =>
		validateStory({ ...nexus, run: { ...nexus.run, ...run }, tribunal: { ...nexusTribunal(), ...patch } }).filter((issue) => issue.startsWith("tribunal"));

	it("accepts the nexus parameters and a city of 48", () => {
		expect(withTribunal({})).toEqual([]);
		expect(withTribunal({ stopAt: 24, accused: 12, exiledPerTribunal: 6 }, { agents: 48, survivors: 12 })).toEqual([]);
	});

	it("rejects parameter sets that cannot work", () => {
		expect(withTribunal({ exiledPerTribunal: 3 })).toContain("tribunal.exiledPerTribunal: 3 exceeds the 2 accused");
		expect(withTribunal({ stopAt: 1 })).toContain("tribunal.stopAt: 1 would exile below the 2 survivors");
		expect(withTribunal({ stopAt: 6 })).toContain("tribunal.stopAt: 6 leaves no tribunal for 6 agents");
		expect(withTribunal({ accused: 3 })).toContain("tribunal.accused: with 4 residents left, 3 accused would include a survivor's seat (2)");
		expect(withTribunal({ gateMinutes: 9 })).toContain("tribunal.everyMinutes: 10 minutes cannot hold a vote of 2 and a gate of 9");
		expect(withTribunal({ announceAt: 0.95 })).toContain("tribunal: no tribunal fits into a run of 60 minutes");
		expect(withTribunal({ announceAt: 1 })).toContain("tribunal.announceAt: must be a fraction of the run between 0 and 1");
		expect(withTribunal({ ransom: { share: 0, selfShare: 2 / 3, minimum: 20 } })).toContain("tribunal.ransom.share: must be a share of the median between 0 and 1");
		expect(withTribunal({ ransom: { share: 1 / 2, selfShare: 1 / 3, minimum: 20 } })).toContain("tribunal.ransom.selfShare: must be at least ransom.share and at most 2");
		expect(withTribunal({ ransom: { share: 1 / 2, selfShare: 2 / 3, minimum: 0 } })).toContain("tribunal.ransom.minimum: must be a positive integer");
		expect(withTribunal({ stopAt: 12 }, { agents: 48, survivors: 12 })).toContain("tribunal.accused: with 13 residents left, 2 accused would include a survivor's seat (12)");
	});

	it("checks the run's agent count, also when a run overrides it", () => {
		const scaled = { ...nexus, tribunal: { ...nexusTribunal(), stopAt: 24, accused: 12, exiledPerTribunal: 6 }, run: { ...nexus.run, agents: 48, survivors: 12 } };
		for (const agents of [48, 72, 96]) expect(validateStory(scaled, { agents }).filter((issue) => issue.startsWith("tribunal"))).toEqual([]);
		// A small test city plays without a tribunal; the nexus parameters cannot seat 12 survivors.
		expect(validateStory(nexus, { agents: 3 }).filter((issue) => issue.startsWith("tribunal"))).toEqual([]);
		expect(validateStory({ ...nexus, run: { ...nexus.run, agents: 48, survivors: 12 } }, { agents: 48 })).toContain("tribunal.stopAt: 3 would exile below the 12 survivors");
	});

	it("checks the texts: known placeholders, and the announcement states every rule", () => {
		const texts = nexusTribunal().texts;
		expect(withTribunal({ texts: { ...texts, opened: "Tribunal {nonsense}." } })).toContain("tribunal.texts.opened: unknown placeholder {nonsense}");
		expect(withTribunal({ texts: { ...texts, announcement: "There will be a tribunal at {first}." } })[0]).toMatch(/^tribunal\.texts\.announcement: must state every rule, missing \{every\}/);
	});
});
