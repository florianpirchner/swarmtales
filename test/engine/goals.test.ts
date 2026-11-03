/**
 * Secret goals (v09, spec section 4): dealing (everyone, crossing, never on
 * oneself, matched to the core motive), the private notice and status line,
 * resolution with the bonus, the readout of an exiled resident and of the
 * act, and the snapshot.
 *
 * The dealing runs the goals mechanic's `dealGoals` with the old call shape (the stream
 * `rngFor(seed, "goals", act)`, which the host's `ctx.rng("goals", act)` draws, and the drives of
 * the core motive). The goal book is the goals mechanic on a bare host, with the stand-ins of
 * `test/mechanics/t3/stubs.ts` holding what the old `GoalBook` took as callbacks (exiled residents,
 * points, the board, the notices).
 */
import { describe, expect, it } from "vitest";
import { Type, type Static } from "typebox";
import { Parse } from "typebox/value";
import { legacySink } from "@swarmtales/chronicle";
import type { CoreMotivesSpec, GoalsSpec } from "@swarmtales/contracts";
import { competitorIds, createHost, defineCoreStory, rngFor, type CompetitorId } from "@swarmtales/kernel";
import { dealGoals as dealWith, goals, GoalSchema } from "@swarmtales/mechanic-goals";
import { CoreMotivesOptions, dealCoreMotives as dealCoreMotivesWith } from "@swarmtales/mechanic-motives";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import { goalsProbe } from "../mechanics/t3/probes.ts";
import { actAnnouncer, exileStub, motivesStub, newDesk, recordingChannels, settableLedger } from "../mechanics/t3/stubs.ts";

const spec = cityOfKeys.goals;
const coreMotives = cityOfKeys.coreMotives;

type Goal = Static<typeof GoalSchema>;

interface CoreMotive {
	readonly drives: readonly { readonly drive: string }[];
}

function dealCoreMotives(motives: CoreMotivesSpec, ids: readonly string[], seed: number) {
	return dealCoreMotivesWith(Parse(CoreMotivesOptions, motives), ids, (...labels) => rngFor(seed, ...labels));
}

function dealGoals(goalsSpec: GoalsSpec, ids: readonly string[], options: { readonly seed: number; readonly act: number; readonly factions: boolean; readonly coreMotive: (agent: string) => CoreMotive | undefined }) {
	return dealWith(goalsSpec, ids, {
		rng: rngFor(options.seed, "goals", options.act),
		factions: options.factions,
		drives: (agent) => options.coreMotive(agent)?.drives.map((entry) => entry.drive) ?? null,
	});
}

function targetOf(goal: Goal): CompetitorId | undefined {
	return "target" in goal ? goal.target : undefined;
}

describe("dealing goals", () => {
	it.each([6, 12, 48, 96])("gives each of %i residents a goal on someone else, and crosses protect with exile", (agents) => {
		if (spec === undefined || coreMotives === undefined) throw new Error("cityofkeys has no goals");
		const ids = competitorIds(agents);
		const dealt = dealCoreMotives(coreMotives, ids, 7);
		const goals = dealGoals(spec, ids, { seed: 7, act: 8, factions: true, coreMotive: (agent) => dealt.get(agent) });
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

	it("follows the core motive most of the time, deals lead only with factions, and is seeded", () => {
		if (spec === undefined || coreMotives === undefined) throw new Error("cityofkeys has no goals");
		const ids = competitorIds(96);
		const leaders: CoreMotive = { drives: [{ drive: "leadership" }] };
		const goals = dealGoals(spec, ids, { seed: 3, act: 8, factions: true, coreMotive: () => leaders });
		const lead = [...goals.values()].filter((goal) => goal.kind === "lead").length;
		// About three in four follow the core motive; crossing turns a few into exiles.
		expect(lead).toBeGreaterThan(96 / 2);
		expect(lead).toBeLessThan(96);
		const without = dealGoals(spec, ids, { seed: 3, act: 8, factions: false, coreMotive: () => leaders });
		expect([...without.values()].some((goal) => goal.kind === "lead")).toBe(false);
		expect([...dealGoals(spec, ids, { seed: 3, act: 8, factions: true, coreMotive: () => leaders })]).toEqual([...goals]);
	});
});

/** The story's goals spec as the mechanic's options (as `apps/cli/src/host/story.ts` builds them). */
function optionsOf(goalsSpec: GoalsSpec, factions: boolean): NonNullable<Parameters<typeof goals.with>[0]> {
	return {
		acts: [...goalsSpec.acts],
		bonus: goalsSpec.bonus,
		leadTribunals: goalsSpec.leadTribunals,
		againstCoreMotive: goalsSpec.againstCoreMotive,
		matches: Object.fromEntries(Object.entries(goalsSpec.matches).map(([kind, drives]) => [kind, [...drives]])),
		factions,
		texts: { ...goalsSpec.texts },
	};
}

const GoalLine = Type.Object({
	type: Type.Union([Type.Literal("goal_dealt"), Type.Literal("goal_resolved")]),
	act: Type.Integer(),
	agent: Type.String(),
	goal: GoalSchema,
	text: Type.Optional(Type.String()),
	fulfilled: Type.Optional(Type.Boolean()),
	void: Type.Optional(Type.Boolean()),
	bonus: Type.Optional(Type.Integer()),
});
type GoalEvent = Static<typeof GoalLine>;

const IDS = competitorIds(6);
const ACT = 8;
const HeldGoal = Type.Union([Type.Null(), Type.Object({ act: Type.Integer(), kind: Type.String(), text: Type.String() })]);

/** The goals mechanic with stand-ins; seed 7, factions, no core motives (the old harness). */
function harness(resume?: { readonly snapshot: unknown; readonly events: readonly unknown[] }) {
	if (spec === undefined) throw new Error("cityofkeys has no goals");
	const desk = newDesk();
	const exiled = new Set<string>();
	const points = new Map<string, number>();
	const story = defineCoreStory({
		id: "goals-book",
		seed: 7,
		minutes: 4,
		residents: IDS,
		mechanics: [actAnnouncer().with(), settableLedger(points).with(), recordingChannels(desk).with(), exileStub(exiled, IDS).with(), motivesStub(new Map()).with(), goals.with(optionsOf(spec, true)), goalsProbe().with()],
		grants: { script: ["startAct", "endAct", "noteLeaders", "noteHeir", "onExiled", "goalOf"] },
	});
	const host = createHost(resume === undefined ? { story } : { story, resume });
	const events: GoalEvent[] = [];
	host.subscribe(
		legacySink((event) => {
			if (event.type === "goal_dealt" || event.type === "goal_resolved") events.push(Parse(GoalLine, Object.fromEntries(Object.entries(event))));
		}),
	);
	if (resume === undefined) host.start();
	const script = async (tool: string, params: unknown): Promise<string> => {
		const outcome = await host.call("script", tool, params);
		if (!outcome.ok) throw new Error(`${tool}: ${outcome.code}`);
		return outcome.reply;
	};
	return {
		host,
		events,
		posts: () => desk.posts.map((post) => post.text),
		notices: desk.notices,
		exiled,
		points,
		/** What the mechanic paid: the stand-in ledger starts every balance at 0 and only the goals mint. */
		grants: () => [...points].filter(([, amount]) => amount > 0).map(([to, amount]) => ({ to, points: amount })),
		deal: () => script("startAct", { fromLevel: ACT, residents: IDS }),
		resolve: () => script("endAct", { fromLevel: ACT }),
		noteLeaders: (leaders: readonly string[]) => script("noteLeaders", { leaders }),
		noteHeir: (heir: string) => script("noteHeir", { heir }),
		onExiled: (resident: string) => script("onExiled", { resident }),
		goalOf: async (resident: string) => Parse(HeldGoal, JSON.parse(await script("goalOf", { resident }))),
		/** The goal's status part as the resident's next turn reads it (plays one minute). */
		statusOf: async (resident: string): Promise<string | undefined> => {
			let status: string | undefined;
			await host.playMinute(async (turn) => {
				if (turn.resident === resident) status = turn.inputs.find((note) => note.source === "goals")?.text;
				await turn.ready;
			});
			return status;
		},
	};
}

describe("the goal book", () => {
	it("tells every resident its goal privately, keeps it in the status line, and pays the bonus at the act's end", async () => {
		const h = harness();
		await h.deal();
		await h.deal();
		expect(h.events.filter((event) => event.type === "goal_dealt")).toHaveLength(6);
		expect(h.notices).toHaveLength(6);
		const first = h.notices[0];
		expect(first?.text).toMatch(/^The city deals you a secret goal for this act: .+\. If it holds when the act ends, the city pays you 15 points\./);
		const held = await h.goalOf("A01");
		expect(await h.statusOf("A01")).toBe(`your goal: ${held?.text ?? ""} (+15)`);
		// Nobody leaves and everyone ends level: protect holds, everything else misses.
		await h.resolve();
		const resolved = h.events.filter((event) => event.type === "goal_resolved");
		expect(resolved).toHaveLength(6);
		for (const event of resolved) expect(event.fulfilled).toBe(event.goal.kind === "protect");
		expect(h.grants().map((grant) => grant.points).every((points) => points === 15)).toBe(true);
		expect(h.grants()).toHaveLength(resolved.filter((event) => event.fulfilled === true).length);
		expect(h.posts().at(-1)).toMatch(/^The act is over\. The city reads out every secret goal: A01: .+ \((fulfilled|missed)\); /);
		expect(await h.goalOf("A01")).toBeNull();
		await h.resolve();
		expect(h.events.filter((event) => event.type === "goal_resolved")).toHaveLength(6);
	});

	it("resolves every kind: exile by then, more points, two leaderships, a bequest; an exiled resident's goal is void and read out", async () => {
		const h = harness();
		await h.deal();
		const dealt = h.events.filter((event) => event.type === "goal_dealt");
		const goals = new Map(dealt.map((event) => [event.agent, event.goal] as const));
		const texts = new Map(dealt.map((event) => [event.agent, event.text ?? ""] as const));
		// Make every goal hold that can: exile and protect targets, the points, the leaders and the heirs.
		for (const [agent, goal] of goals) {
			if (goal.kind === "outrank") h.points.set(agent, 100);
			if (goal.kind === "lead") {
				await h.noteLeaders([agent]);
				await h.noteLeaders([agent]);
			}
			if (goal.kind === "heir") await h.noteHeir(agent);
		}
		const exiledTargets = [...goals.values()].flatMap((goal) => (goal.kind === "exile" ? [goal.target] : []));
		const protectedTargets = new Set([...goals.values()].flatMap((goal) => (goal.kind === "protect" ? [goal.target] : [])));
		const victim = exiledTargets.find((target) => !protectedTargets.has(target)) ?? exiledTargets[0];
		if (victim !== undefined) {
			h.exiled.add(victim);
			await h.onExiled(victim);
			expect(h.posts()[0]).toBe(`${victim} leaves the city. Its secret goal was: ${texts.get(victim) ?? ""}.`);
		}
		await h.resolve();
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
		if (victim !== undefined) expect(h.posts().at(-1)).toContain(`${victim}: `);
		expect(h.posts().at(-1)).toContain("(void)");
	});

	it("round-trips through its snapshot", async () => {
		const h = harness();
		await h.deal();
		await h.noteLeaders(["A02"]);
		await h.noteHeir("A03");
		await h.onExiled("A04");
		const copy = harness({ snapshot: structuredClone(h.host.snapshot()), events: h.host.log.all() });
		expect(copy.host.snapshot().mechanics.goals).toEqual(h.host.snapshot().mechanics.goals);
		expect(copy.host.fact("goals.running")).toEqual(h.host.fact("goals.running"));
		expect(copy.host.fact("goals.running")).toHaveLength(5);
		expect(await copy.goalOf("A04")).toBeNull();
	});
});
