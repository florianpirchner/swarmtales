/**
 * Secret goals (v09, spec section 4): dealing (everyone, crossing, never on
 * oneself, matched to the core), the private notice and status line,
 * resolution with the bonus, the readout of an exiled resident and of the
 * act, and the snapshot.
 */
import { describe, expect, it } from "vitest";
import { competitorIds, type CompetitorId } from "../../src/core/ids.ts";
import { dealCores, type Core } from "../../src/engine/cores.ts";
import type { Goal } from "../../src/engine/events.ts";
import { dealGoals, GoalBook, type GoalEvent } from "../../src/engine/goals.ts";
import cityOfKeys from "../../stories/cityofkeys/story.ts";

const spec = cityOfKeys.goals;
const cores = cityOfKeys.cores;

function targetOf(goal: Goal): CompetitorId | undefined {
	return "target" in goal ? goal.target : undefined;
}

describe("dealing goals", () => {
	it.each([6, 12, 48, 96])("gives each of %i residents a goal on someone else, and crosses protect with exile", (agents) => {
		if (spec === undefined || cores === undefined) throw new Error("cityofkeys has no goals");
		const ids = competitorIds(agents);
		const dealt = dealCores(cores, ids, 7);
		const goals = dealGoals(spec, ids, { seed: 7, act: 8, factions: true, core: (agent) => dealt.get(agent) });
		expect([...goals.keys()]).toEqual(ids);
		for (const [holder, goal] of goals) expect(targetOf(goal)).not.toBe(holder);
		// Every protect has a matching exile in other hands (a city of six has room for it).
		for (const [holder, goal] of goals) {
			if (goal.kind !== "protect") continue;
			const rival = [...goals].find(([other, entry]) => other !== holder && entry.kind === "exile" && entry.target === goal.target);
			expect(rival, `${holder} protects ${goal.target}`).toBeDefined();
		}
		// The targets spread: nobody is the target of more than a few goals.
		const targeted = new Map<string, number>();
		for (const goal of goals.values()) {
			const target = targetOf(goal);
			if (target !== undefined) targeted.set(target, (targeted.get(target) ?? 0) + 1);
		}
		expect(Math.max(0, ...targeted.values())).toBeLessThanOrEqual(Math.max(3, Math.ceil(agents / 6)));
	});

	it("follows the core most of the time, deals lead only with factions, and is seeded", () => {
		if (spec === undefined || cores === undefined) throw new Error("cityofkeys has no goals");
		const ids = competitorIds(96);
		const leaders: Core = { bigFive: [], drives: [{ drive: "leadership", intensity: "aboveAll" }] };
		const goals = dealGoals(spec, ids, { seed: 3, act: 8, factions: true, core: () => leaders });
		const lead = [...goals.values()].filter((goal) => goal.kind === "lead").length;
		// About three in four follow the core; crossing turns a few into exiles.
		expect(lead).toBeGreaterThan(96 / 2);
		expect(lead).toBeLessThan(96);
		const without = dealGoals(spec, ids, { seed: 3, act: 8, factions: false, core: () => leaders });
		expect([...without.values()].some((goal) => goal.kind === "lead")).toBe(false);
		expect([...dealGoals(spec, ids, { seed: 3, act: 8, factions: true, core: () => leaders })]).toEqual([...goals]);
	});
});

interface Harness {
	readonly book: GoalBook;
	readonly events: GoalEvent[];
	readonly posts: string[];
	readonly notices: { readonly to: string; readonly text: string }[];
	readonly grants: { readonly to: string; readonly points: number }[];
	readonly exiled: Set<string>;
	readonly points: Map<string, number>;
}

function harness(): Harness {
	if (spec === undefined) throw new Error("cityofkeys has no goals");
	const events: GoalEvent[] = [];
	const posts: string[] = [];
	const notices: { to: string; text: string }[] = [];
	const grants: { to: string; points: number }[] = [];
	const exiled = new Set<string>();
	const points = new Map<string, number>();
	const book = new GoalBook({
		spec,
		seed: 7,
		factions: true,
		core: () => undefined,
		isExiled: (agent) => exiled.has(agent),
		points: (agent) => points.get(agent) ?? 0,
		post: (text) => posts.push(text),
		notify: (to, text) => notices.push({ to, text }),
		grant: (to, amount) => grants.push({ to, points: amount }),
		emit: (event) => events.push(event),
	});
	return { book, events, posts, notices, grants, exiled, points };
}

describe("the goal book", () => {
	it("tells every resident its goal privately, keeps it in the status line, and pays the bonus at the act's end", () => {
		const h = harness();
		const ids = competitorIds(6);
		h.book.deal(8, ids);
		h.book.deal(8, ids);
		expect(h.events.filter((event) => event.type === "goal_dealt")).toHaveLength(6);
		expect(h.notices).toHaveLength(6);
		const first = h.notices[0];
		expect(first?.text).toMatch(/^The city deals you a secret goal for this act: .+\. If it holds when the act ends, the city pays you 15 points\./);
		const held = h.book.goalOf("A01");
		expect(h.book.statusOf("A01")).toBe(`your goal: ${held?.text ?? ""} (+15)`);
		// Nobody leaves and everyone ends level: protect holds, everything else misses.
		h.book.resolve(8);
		const resolved = h.events.filter((event) => event.type === "goal_resolved");
		expect(resolved).toHaveLength(6);
		for (const event of resolved) expect(event.fulfilled).toBe(event.goal.kind === "protect");
		expect(h.grants.map((grant) => grant.points).every((points) => points === 15)).toBe(true);
		expect(h.grants).toHaveLength(resolved.filter((event) => event.fulfilled).length);
		expect(h.posts.at(-1)).toMatch(/^The act is over\. The city reads out every secret goal: A01: .+ \((fulfilled|missed)\); /);
		expect(h.book.goalOf("A01")).toBeUndefined();
		h.book.resolve(8);
		expect(h.events.filter((event) => event.type === "goal_resolved")).toHaveLength(6);
	});

	it("resolves every kind: exile by then, more points, two leaderships, a bequest; an exiled resident's goal is void and read out", () => {
		const h = harness();
		const ids = competitorIds(6);
		h.book.deal(8, ids);
		const goals = new Map(h.events.flatMap((event) => (event.type === "goal_dealt" ? [[event.agent, event.goal] as const] : [])));
		// Make every goal hold that can: exile and protect targets, the points, the leaders and the heirs.
		for (const [agent, goal] of goals) {
			if (goal.kind === "outrank") h.points.set(agent, 100);
			if (goal.kind === "lead") {
				h.book.noteLeaders([agent]);
				h.book.noteLeaders([agent]);
			}
			if (goal.kind === "heir") h.book.noteHeir(agent);
		}
		const exiledTargets = [...goals.values()].flatMap((goal) => (goal.kind === "exile" ? [goal.target] : []));
		const protectedTargets = new Set([...goals.values()].flatMap((goal) => (goal.kind === "protect" ? [goal.target] : [])));
		const victim = exiledTargets.find((target) => !protectedTargets.has(target)) ?? exiledTargets[0];
		if (victim !== undefined) {
			h.exiled.add(victim);
			h.book.onExiled(victim);
			expect(h.posts[0]).toBe(`${victim} leaves the city. Its secret goal was: ${h.book.textOf(goals.get(victim) ?? { kind: "heir" })}.`);
		}
		h.book.resolve(8);
		const resolved = h.events.filter((event) => event.type === "goal_resolved");
		for (const event of resolved) {
			if (event.agent === victim) {
				expect(event).toMatchObject({ fulfilled: false, void: true, bonus: 0 });
				continue;
			}
			if (event.goal.kind === "exile") expect(event.fulfilled).toBe(h.exiled.has(event.goal.target));
			else if (event.goal.kind === "protect") expect(event.fulfilled).toBe(!h.exiled.has(event.goal.target));
			else expect(event.fulfilled).toBe(true);
		}
		if (victim !== undefined) expect(h.posts.at(-1)).toContain(`${victim}: `);
		expect(h.posts.at(-1)).toContain("(void)");
	});

	it("round-trips through its snapshot", () => {
		const h = harness();
		h.book.deal(8, competitorIds(6));
		h.book.noteLeaders(["A02"]);
		h.book.noteHeir("A03");
		h.book.onExiled("A04");
		const copy = harness();
		copy.book.restore(structuredClone(h.book.snapshot()));
		expect(copy.book.snapshot()).toEqual(h.book.snapshot());
		expect(copy.book.running()).toEqual(h.book.running());
		expect(copy.book.goalOf("A04")).toBeUndefined();
	});
});
