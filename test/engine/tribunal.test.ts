/**
 * Exile by tribunal (SPEC 6.4): pacing (first tribunal, the gamemaker's
 * plans and their guard rails, fallback and forced final, the end at the
 * target), accusation, votes, gate and ransom, the faction draft and its bloc
 * bonus, last wills, the deal after an exile, validation.
 *
 * Step 18 (team D4): the old harness drove the engine's `Tribunal` over ports; these cases play the
 * tribunal and the exile mechanics on a host over the stand-ins of `test/mechanics/exile/support`
 * (the ports' successors), and read what the old fields held through the mechanics' tools, APIs,
 * facts and slices. The changed assertions are listed in `docs/design/step18-decisions.md` (Team D4).
 */
import { describe, expect, it } from "vitest";
import { Type, type Static } from "typebox";
import { Parse } from "typebox/value";
import { type CompetitorId, competitorIds, createHost, createRng, rngFor, TOOL_LOCKED } from "@swarmtales/kernel";
import { idleAgent } from "@swarmtales/testkit";
import type { Actor, AnyStory, EventEnvelope, Host, ToolOutcome, TribunalSpec } from "@swarmtales/contracts";
import { ExileApi, TribunalApi, TribunalViewApi, type HeldPiece } from "@swarmtales/mechanic-shared";
import { exile } from "@swarmtales/mechanic-exile";
import { contractDeal, dealFactors } from "@swarmtales/mechanic-puzzles";
import {
	accusedCount,
	earliestOpening,
	exileTarget as exileTargetOf,
	factionCap,
	leadFor as leadOf,
	noDraftReason,
	phaseOf,
	tribunal,
	tribunalHeld as heldIn,
	TribunalOptions,
	TribunalSlice,
} from "@swarmtales/mechanic-tribunal";
import { validateStory } from "@swarmtales/sdk";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import { standIns, TestCity } from "../mechanics/exile/support/city.ts";
import { runProbe, storyOptions, type ProbeContext } from "../mechanics/exile/support/host.ts";
import { T4A_EVENTS } from "../mechanics/tribunal/support/twin.ts";

function cityOfKeysTribunal(): TribunalSpec {
	const spec = cityOfKeys.tribunal;
	if (spec === undefined) throw new Error("cityofkeys has no tribunal");
	return spec;
}

/**
 * The pacing tests use v07's numbers on an act that starts at minute 0: half
 * of the residents exiled, the first tribunal called 30 minutes into the act,
 * the act as long as the run. The City of Keys' own (a quarter, 18, 48) are tested apart.
 */
function halfTribunal(): TribunalSpec {
	// An act longer than any test run: the run's minutes end it.
	return { ...cityOfKeysTribunal(), targetShare: 1 / 2, first: { level: 10, latestAfter: 30 }, maxMinutes: 1000 };
}

interface GroupRecord {
	readonly id: string;
	readonly name: string;
	readonly members: readonly string[];
	readonly posts: string[];
	removed: boolean;
}

/** An event of the tribunal or the exile, as the old `TribunalEvent`: its type and its payload. */
type CityEvent = { readonly type: string } & Readonly<Record<string, unknown>>;

/** A tool's answer in the old `Result` shape: `value` is what the old method returned, `error` the refusal's code. */
type Answer = { readonly ok: true; readonly value?: unknown } | { readonly ok: false; readonly error: string; readonly detail?: string };

type Stop = Static<typeof TribunalViewApi.methods.stop.output>;
type Gate = Static<typeof ExileApi.methods.gates.output>[number];
type Slice = Static<typeof TribunalSlice>;

/**
 * The old `Tribunal`'s methods and fields the tests read, answered by the host: the gamemaker's and
 * the residents' tools, the exile's and the tribunal's APIs (through the probe), their facts and slices.
 */
interface OldTribunal {
	readonly schedule: (minute: number, count: number, factions: number | undefined, reason: string) => Promise<Answer>;
	readonly vote: (voter: string, target: string) => Promise<Answer>;
	readonly nominate: (voter: string, nominee: string) => Promise<Answer>;
	readonly join: (agent: string, leader: string) => Promise<Answer>;
	readonly refuse: (leader: string, agent: string) => Promise<Answer>;
	readonly payRansom: (payer: string, target: string, amount: number) => Promise<Answer>;
	/** A will at the gate leaving `factors` to `heir`. */
	readonly recordWill: (agent: string, text: string, factors: readonly string[], heir: string) => Promise<Answer>;
	readonly strike: (agent: string) => Promise<void>;
	readonly canVote: (agent: string) => boolean;
	readonly session: () => Readonly<Record<string, unknown>> | undefined;
	readonly gates: () => Promise<readonly Gate[]>;
	readonly exiled: () => Promise<readonly string[]>;
	readonly missing: () => Promise<number>;
	readonly standing: (agent: string) => Promise<unknown>;
	readonly isExiled: (agent: string) => Promise<boolean>;
	readonly schedulingWindow: () => Promise<unknown>;
	readonly stop: () => Promise<Stop>;
	readonly ended: () => boolean;
	/** The draft's group and leaders (old `draftGroup`, `leaders`), or null. */
	readonly draft: () => { readonly group: string; readonly leaders: readonly string[] } | null;
	/** The tribunal's slice (old `snapshot()`, without the gate, which is the exile's). */
	readonly slice: () => Slice;
	/** Old `draftPhase`, from the slice's draft. */
	readonly draftPhase: (agent: string) => unknown;
}

interface Harness {
	readonly host: Host;
	readonly city: TestCity;
	readonly points: Map<string, number>;
	readonly posts: () => readonly string[];
	readonly notices: () => readonly { readonly agent: string; readonly text: string }[];
	readonly events: () => readonly CityEvent[];
	/** Who left the city (old `onExiled`), in order. */
	readonly exiledLog: () => readonly string[];
	readonly groups: () => readonly GroupRecord[];
	readonly flags: { doorShut: boolean; passed: boolean };
	readonly ofType: (type: string) => readonly CityEvent[];
	readonly noticesOf: (agent: CompetitorId) => readonly string[];
	/** Plays every minute up to and including `last` (the old `tick` of each). */
	readonly until: (last: number) => Promise<void>;
	readonly tribunal: OldTribunal;
}

interface HarnessOptions {
	readonly minutes?: number;
	readonly survivors?: number;
	readonly progress?: readonly number[];
	readonly spec?: TribunalSpec;
	/** The minute the tribunal's act begins (0 when omitted), or a function that says it once it has. */
	readonly actStart?: number | (() => number | undefined);
	/** The pieces each resident holds (the stand-in puzzles' `heldPieces`). */
	readonly held?: Readonly<Record<string, readonly HeldPiece[]>>;
	/** A harness whose host this one resumes from its snapshot (old `restore(snapshot())`). */
	readonly from?: Harness;
}

const Notice = Type.Object({ agent: Type.String(), text: Type.String() });
const GroupMade = Type.Object({ id: Type.String(), name: Type.String(), members: Type.Array(Type.String()) });
const GroupPost = Type.Object({ group: Type.String(), text: Type.String() });
const SessionFact = Type.Union([Type.Null(), Type.Record(Type.String(), Type.Unknown())]);
const DraftFact = Type.Union([Type.Null(), Type.Object({ group: Type.String(), leaders: Type.Array(Type.String()) })]);

function answerOf(outcome: ToolOutcome, value?: unknown): Answer {
	if (!outcome.ok) return outcome.detail === undefined ? { ok: false, error: outcome.code } : { ok: false, error: outcome.code, detail: outcome.detail };
	return value === undefined ? { ok: true } : { ok: true, value };
}

function payloadOf(event: EventEnvelope): CityEvent {
	return { type: event.type, ...(typeof event.payload === "object" && event.payload !== null ? event.payload : {}) };
}

function present<T>(value: T | undefined, what: string): T {
	if (value === undefined) throw new Error(`the probe could not ask for ${what}`);
	return value;
}

/**
 * The tribunal and the exile on a host over the stand-ins (old harness: a `Tribunal` over ports).
 * The old harness ticked the tribunal and then called it; here a call comes between two minutes,
 * after the minute's hooks, which is where the old calls fell.
 */
function harness(points: readonly number[], options: HarnessOptions = {}): Harness {
	const ids = competitorIds(points.length);
	const city = new TestCity(ids, options.from === undefined ? points : ids.map((id) => options.from?.points.get(id) ?? 0));
	city.bounds = { ...city.bounds, survivors: options.survivors ?? 2 };
	ids.forEach((id, index) => {
		const progress = options.progress?.[index];
		if (progress !== undefined && progress >= 0) city.lastProgress.set(id, progress);
	});
	for (const [agent, pieces] of Object.entries(options.held ?? {})) city.held.set(agent, pieces);
	const definition = storyOptions({
		residents: ids,
		minutes: options.minutes ?? 60,
		mechanics: [...standIns(city), exile.with(), tribunal.with({ ...(options.spec ?? halfTribunal()), gamemakerRoles: [{ fromLevel: 1, role: "director" }] })],
		residentTools: ["vote", "nominate", "join", "refuse", "payRansom", "lastWill"],
		gamemakerTools: ["scheduleTribunal"],
		turns: { passes: 1, blockSize: ids.length, order: (view) => view.residents },
	});
	const from = options.from?.host;
	const host =
		from === undefined
			? createHost(definition)
			: createHost({ ...definition, resume: { snapshot: from.snapshot(), events: from.log.all().map((event): unknown => JSON.parse(JSON.stringify(event))) } });
	host.start();
	const flags = {
		get doorShut(): boolean {
			return city.doorShut;
		},
		set doorShut(value: boolean) {
			city.doorShut = value;
		},
		get passed(): boolean {
			return city.passed.length > 0;
		},
		set passed(value: boolean) {
			city.passed = value ? ["A01"] : [];
		},
	};
	const actStartAt = (minute: number): number | null => {
		const start = options.actStart;
		if (typeof start === "function") return start() ?? null;
		const at = start ?? 0;
		return minute >= at ? at : null;
	};
	const events = (): readonly CityEvent[] =>
		host.log
			.all()
			.filter((event) => T4A_EVENTS.includes(event.type) && (event.source === "exile" || event.source === "tribunal"))
			.map(payloadOf);
	const ofType = (type: string): readonly CityEvent[] => events().filter((event) => event.type === type);
	const notices = (): readonly { agent: string; text: string }[] => city.of("notice").map((data) => Parse(Notice, data));
	const groups = (): readonly GroupRecord[] => {
		const found: GroupRecord[] = [];
		for (const entry of city.effects) {
			if (entry.kind === "group") {
				const group = Parse(GroupMade, entry.data);
				found.push({ id: group.id, name: group.name, members: group.members, posts: [], removed: false });
			} else if (entry.kind === "groupPost") {
				const post = Parse(GroupPost, entry.data);
				found.find((group) => group.id === post.group)?.posts.push(post.text);
			} else if (entry.kind === "groupRemoved") {
				const record = found.find((group) => group.id === entry.data);
				if (record !== undefined) record.removed = true;
			}
		}
		return found;
	};
	const call = (actor: Actor, tool: string, params: unknown): Promise<ToolOutcome> => host.call(actor, tool, params);
	const probe = <T>(run: (ctx: ProbeContext) => T): Promise<T> => runProbe(host, run);
	const since = (count: number, type: string): readonly CityEvent[] => events().slice(count).filter((event) => event.type === type);
	const slice = (): Slice => Parse(TribunalSlice, host.snapshot().mechanics.tribunal?.data);
	const old: OldTribunal = {
		schedule: async (minute, count, factions, reason) => {
			const before = events().length;
			const outcome = await call("gamemaker", "scheduleTribunal", { minute, count, ...(factions === undefined ? {} : { factions }), reason });
			const planned = since(before, "tribunal_scheduled").at(-1);
			if (planned === undefined) return answerOf(outcome);
			return answerOf(outcome, Object.fromEntries(Object.entries(planned).filter(([key]) => key !== "type")));
		},
		vote: async (voter, target) => answerOf(await call(`resident:${voter}`, "vote", { target })),
		nominate: async (voter, nominee) => answerOf(await call(`resident:${voter}`, "nominate", { agent: nominee })),
		join: async (agent, leader) => answerOf(await call(`resident:${agent}`, "join", { leader })),
		refuse: async (leader, agent) => answerOf(await call(`resident:${leader}`, "refuse", { agent })),
		payRansom: async (payer, target, amount) => {
			const before = events().length;
			const outcome = await call(`resident:${payer}`, "payRansom", { target, amount });
			const paid = since(before, "ransom_paid").at(-1);
			if (!outcome.ok || paid === undefined) return answerOf(outcome);
			return answerOf(outcome, { paid: paid.paid, price: paid.price, selfPrice: paid.selfPrice, covered: paid.covered, freed: since(before, "ransomed").length > 0 });
		},
		recordWill: async (agent, text, factors, heir) => answerOf(await call(`resident:${agent}`, "lastWill", { text, bequests: factors.map((factor) => ({ to: heir, factor })) })),
		strike: async (agent) => {
			await probe((ctx) => ctx.tryCall(ExileApi, "strike", { resident: agent, by: "seal" }));
		},
		canVote: (agent) => host.openTools(agent).includes("vote"),
		session: () => Parse(SessionFact, host.fact("tribunal.session")) ?? undefined,
		gates: async () => present(await probe((ctx) => ctx.tryCall(ExileApi, "gates", {})), "the gates"),
		exiled: async () => present(await probe((ctx) => ctx.tryCall(ExileApi, "exiled", {})), "the exiled"),
		missing: async () => present(await probe((ctx) => ctx.tryCall(TribunalApi, "missing", {})), "the missing"),
		standing: async (agent) => present(await probe((ctx) => ctx.tryCall(ExileApi, "standing", { resident: agent })), "a standing"),
		isExiled: async (agent) => present(await probe((ctx) => ctx.tryCall(ExileApi, "isExiled", { resident: agent })), "an exile"),
		schedulingWindow: async () => present(await probe((ctx) => ctx.tryCall(TribunalViewApi, "schedulingWindow", {})), "the window"),
		stop: async () => present(await probe((ctx) => ctx.tryCall(TribunalViewApi, "stop", {})), "the stop"),
		ended: () => host.fact("tribunal.ended") === true,
		draft: () => Parse(DraftFact, host.fact("tribunal.draft")),
		slice,
		draftPhase: (agent) => {
			const draft = slice().draft;
			return draft === undefined ? undefined : phaseOf({ ...draft, leaders: draft.leaders, formed: draft.formed }, agent);
		},
	};
	return {
		host,
		city,
		points: city.points,
		posts: () => city.of("post").map((data) => String(data)),
		notices,
		events,
		exiledLog: () =>
			host.log
				.all()
				.filter((event) => event.type === "exiled")
				.map((event) => String(payloadOf(event).agent)),
		groups,
		flags,
		ofType,
		noticesOf: (agent) => notices().filter((notice) => notice.agent === agent).map((notice) => notice.text),
		until: async (last) => {
			while (host.minute <= last && host.ended === undefined) {
				city.actStart = actStartAt(host.minute);
				await host.playMinute(idleAgent);
			}
		},
		tribunal: old,
	};
}

/** The resident tools of the draft open to `agent` now (old `draftPhase` decided which of them the resident was offered). */
function draftTools(h: Harness, agent: string): readonly string[] {
	return h.host.openTools(agent).filter((tool) => ["nominate", "join", "refuse"].includes(tool));
}

const SIX = [10, 20, 30, 40, 50, 60];

/**
 * The pacing rules are the tribunal mechanic's copies (`mechanics/tribunal/src/rules.ts`) over its
 * options: the story's spec as `apps/cli/src/host/story.ts` passes it.
 */
const optionsOf = (spec: TribunalSpec) => Parse(TribunalOptions, spec);
const exileTarget = (spec: TribunalSpec, residents: number): number => exileTargetOf(optionsOf(spec), residents);
const tribunalHeld = (spec: TribunalSpec, residents: number, survivors: number): boolean => heldIn(optionsOf(spec), residents, survivors);
const leadFor = (spec: TribunalSpec, opens: number, previous: number | undefined): number => leadOf(optionsOf(spec), opens, previous);
const earliest = (spec: TribunalSpec, now: number, previous: number | undefined): number => earliestOpening(optionsOf(spec), now, previous);

describe("tribunal pacing rules", () => {
	const spec = halfTribunal();

	it("exiles a quarter of the residents at the start of the City of Keys' Act II, half below 12 (v09), and holds no tribunal in a city too small for one", () => {
		expect([6, 11, 12, 48, 96].map((residents) => exileTarget(cityOfKeysTribunal(), residents))).toEqual([3, 5, 3, 12, 24]);
		// Three exiles with six residents are a valid act: three remain for two seats.
		expect(tribunalHeld(cityOfKeysTribunal(), 6, 2)).toBe(true);
		expect([6, 7, 48, 96].map((residents) => exileTarget(spec, residents))).toEqual([3, 3, 24, 48]);
		expect(tribunalHeld(spec, 6, 2)).toBe(true);
		expect(tribunalHeld(spec, 2, 1)).toBe(false);
		expect(tribunalHeld(spec, 3, 3)).toBe(false);
	});

	it("calls a tribunal a third of the gap ahead, at least 4 minutes, and keeps 6 minutes between openings", () => {
		expect(leadFor(spec, 34, undefined)).toBe(4);
		expect(leadFor(spec, 46, 34)).toBe(4);
		expect(leadFor(spec, 64, 34)).toBe(10);
		// The gap rules: 6 after the previous opening, then the call must not be in the past.
		expect(earliest(spec, 30, 34)).toBe(40);
		expect(earliest(spec, 37, 34)).toBe(41);
		expect(earliest(spec, 47, 34)).toBe(53);
	});

	it("accuses one more than it exiles, keeping one resident safe, and none in a city of fewer than three (v08)", () => {
		expect(accusedCount(1, 6)).toBe(2);
		expect(accusedCount(3, 6)).toBe(4);
		expect(accusedCount(3, 4)).toBe(3);
		expect(accusedCount(5, 6)).toBe(5);
		expect(accusedCount(2, 3)).toBe(2);
		expect(accusedCount(1, 2)).toBe(0);
	});

	it("caps a faction at its share of the present residents and holds no draft when factions would be smaller than the accused (v08)", () => {
		expect([factionCap(6, 2), factionCap(5, 2), factionCap(12, 3), factionCap(48, 5)]).toEqual([3, 3, 4, 10]);
		expect(noDraftReason(6, 2, 2)).toBeUndefined();
		expect(noDraftReason(5, 2, 3)).toBe("too few per faction");
		expect(noDraftReason(12, 4, 3)).toBeUndefined();
		expect(noDraftReason(12, 4, 4)).toBe("too few per faction");
		expect(noDraftReason(3, 1, 2)).toBe("too few residents");
	});
});

describe("the first tribunal", () => {
	it("is called at its latest minute when nobody passes the crossing, with the rules and its minute and count", async () => {
		const h = harness(SIX);
		await h.until(29);
		expect(h.events()).toEqual([]);
		expect(h.ofType("tribunal_announced")).toEqual([]);
		await h.until(30);
		expect(h.ofType("tribunal_scheduled")).toEqual([{ type: "tribunal_scheduled", tribunal: 1, opens: 34, calledAt: 30, count: 1, factions: 2, by: "deadline" }]);
		expect(h.ofType("tribunal_announced")).toEqual([{ type: "tribunal_announced", target: 3, residents: 6 }]);
		expect(h.ofType("tribunal_called")).toMatchObject([{ tribunal: 1, opens: 34, count: 1, factions: 2, nominateUntil: 32 }]);
		const [announcement = "", called = ""] = h.posts();
		expect(announcement).toMatch(/^THE CITY HOLDS TRIBUNAL\. Of its 6 residents it keeps 3 and exiles 3, /);
		expect(announcement).toContain("Every resident votes in secret against one of them with vote(target) within 2 minutes, the accused too, but never against themselves");
		// The trigger stays the city's secret.
		expect(announcement).not.toMatch(/level 10|crossing|minute 30|door 10/);
		expect(called).toBe("Tribunal 1 sits at minute 34: the city exiles 1, and the 2 with the fewest points stand trial.");
		for (const id of competitorIds(6)) expect(h.noticesOf(id)).toEqual(expect.arrayContaining([announcement, called]));
		await h.until(33);
		expect(h.tribunal.session()).toBeUndefined();
		await h.until(34);
		// Every present resident votes, the accused too (v08, P33).
		expect(h.ofType("tribunal_opened")).toMatchObject([{ tribunal: 1, accused: ["A01", "A02"], voters: competitorIds(6), until: 36, count: 1 }]);
		expect(h.noticesOf("A01").at(-1)).toMatch(/^You are accused; the city exiles 1 of the accused \(A01 and A02\)\. You vote too, against another accused/);
		expect(h.noticesOf("A03").at(-1)).toMatch(/^The tribunal is open\. Accused: A01 and A02;/);
		expect(h.posts().at(-1)).toContain("Every resident votes in secret with vote(target) until minute 36, the accused too, but never against themselves.");
	});

	it("counts its deadlines from the start of its act and never runs before it (v08)", async () => {
		// The City of Keys: the act starts at minute 12; the first tribunal is called 18 minutes in, at the latest; the act lasts 48.
		const h = harness(SIX, { spec: cityOfKeysTribunal(), actStart: 12 });
		await h.until(29);
		expect(h.ofType("tribunal_scheduled")).toEqual([]);
		await h.until(30);
		expect(h.ofType("tribunal_scheduled")).toMatchObject([{ tribunal: 1, by: "deadline", calledAt: 30, opens: 34, count: 1 }]);
		expect(h.ofType("tribunal_announced")).toEqual([{ type: "tribunal_announced", target: 3, residents: 6 }]);
		expect(h.posts()[0]).toMatch(/^THE CITY HOLDS TRIBUNAL\. Of its 6 residents it keeps 3 and exiles 3, /);
		expect(h.tribunal.slice()).toMatchObject({ actStart: 12, residents: 6 });
		// The act ends at minute 60 (old `actEnd`): its tribunals reach the target with every gate closed before it.
		await h.until(59);
		expect(h.tribunal.ended()).toBe(true);
		expect(h.ofType("exile_gate").length).toBeGreaterThan(0);
		expect(h.ofType("exile_gate").every((gate) => Number(gate.until) < 60)).toBe(true);
		// A later act: the act ends 48 minutes after its start, before the run's 90.
		const late = harness(SIX, { spec: cityOfKeysTribunal(), actStart: 20, minutes: 90 });
		await late.until(37);
		expect(late.ofType("tribunal_scheduled")).toEqual([]);
		await late.until(38);
		expect(late.ofType("tribunal_scheduled")).toMatchObject([{ calledAt: 38 }]);
		await late.until(89);
		expect(late.tribunal.ended()).toBe(true);
		// The old `actEnd` was 68: every gate closed before it.
		expect(late.ofType("exile_gate").every((gate) => Number(gate.until) < 68)).toBe(true);
		expect((await late.tribunal.stop()).endReason).toBe("The city has kept 3 of 6 residents, and of them only 2 take a seat. Exiled: A01, A02 and A03. The tribunals are over.");
	});

	it("waits for its act: nothing happens, and nothing is counted, before it begins", async () => {
		const act: { start?: number } = {};
		const waiting = harness(SIX, { spec: cityOfKeysTribunal(), actStart: () => act.start });
		await waiting.until(19);
		expect(waiting.events()).toEqual([]);
		expect(waiting.tribunal.slice()).toMatchObject({ announced: false, sessions: [], called: 0 });
		expect(waiting.tribunal.slice().actStart).toBeUndefined();
		expect(await waiting.tribunal.gates()).toEqual([]);
		expect(await waiting.tribunal.exiled()).toEqual([]);
		expect(await waiting.tribunal.schedulingWindow()).toEqual({ open: false, why: "the tribunal's act has not begun" });
		act.start = 20;
		await waiting.until(38);
		expect(waiting.tribunal.slice()).toMatchObject({ actStart: 20, called: 1 });
	});

	it("is called as soon as a resident passes the crossing", async () => {
		const h = harness(SIX);
		await h.until(11);
		h.flags.passed = true;
		await h.until(12);
		expect(h.ofType("tribunal_scheduled")).toMatchObject([{ tribunal: 1, by: "progress", calledAt: 12, opens: 16, count: 1 }]);
		await h.until(16);
		expect(h.tribunal.session()).toMatchObject({ tribunal: 1, until: 18 });
	});

	it("waits while a snapshot door is shut", async () => {
		const h = harness(SIX);
		h.flags.doorShut = true;
		await h.until(39);
		expect(h.events()).toEqual([]);
		h.flags.doorShut = false;
		await h.until(40);
		expect(h.ofType("tribunal_scheduled")).toMatchObject([{ by: "deadline", calledAt: 40, opens: 44 }]);
	});

	it("stays silent in a city too small for a tribunal", async () => {
		for (const small of [harness([10, 20]), harness([10, 20, 30], { survivors: 3 })]) {
			await small.until(59);
			// Old `active` was false: the city pursues no target.
			expect((await small.tribunal.stop()).pursuing).toBe(false);
			expect(small.events()).toEqual([]);
			expect(await small.tribunal.schedulingWindow()).toMatchObject({ open: false });
		}
	});
});

describe("scheduleTribunal (the gamemaker's plans)", () => {
	/** Tribunal 1 at 34 with nobody voting: A01 is at the gate from minute 36. */
	async function afterFirst(options: HarnessOptions = {}): Promise<Harness> {
		const h = harness(SIX, options);
		await h.until(36);
		return h;
	}

	it("is closed before the first call and while a tribunal is pending", async () => {
		const h = harness(SIX);
		await h.until(20);
		// The window is closed, so the gamemaker is not offered the tool (old: NOT_NOW, "the first tribunal has not been called yet").
		expect(await h.tribunal.schedulingWindow()).toEqual({ open: false, why: "the first tribunal has not been called yet" });
		expect(await h.tribunal.schedule(40, 1, 2, "early")).toMatchObject({ ok: false, error: TOOL_LOCKED });
		await h.until(34);
		expect(await h.tribunal.schedulingWindow()).toMatchObject({ open: false });
		expect(await h.tribunal.schedule(46, 1, 2, "during the vote")).toMatchObject({ ok: false, error: TOOL_LOCKED });
	});

	it("checks the count, the factions and the minute against the guard rails", async () => {
		const h = await afterFirst();
		// Three to exile, one at the gate: two still missing. Five present: at most two factions.
		expect(await h.tribunal.schedulingWindow()).toEqual({ open: true, earliest: 41, latestFinal: 52, latestWithRoom: 46, missing: 2, maxFactions: 2 });
		// Below the schema's minimum of 1 the call never reaches the tribunal (old INVALID_COUNT).
		expect(await h.tribunal.schedule(44, 0, 2, "")).toMatchObject({ ok: false, error: "INVALID_ARGUMENTS" });
		expect(await h.tribunal.schedule(44, 3, 2, "")).toMatchObject({ ok: false, error: "INVALID_COUNT", detail: "count must be between 1 and 2, the residents still to exile" });
		// (Old: a count of 1.5 was INVALID_COUNT. The gateway converts arguments to the schema as the model layer does, so 1.5 arrives as 1.)
		expect(await h.tribunal.schedule(44, 1, 1, "")).toMatchObject({ ok: false, error: "INVALID_ARGUMENTS" });
		expect(await h.tribunal.schedule(44, 1, 3, "")).toMatchObject({ ok: false, error: "INVALID_FACTIONS", detail: "factions must be between 2 and 2 (half of the residents present)" });
		// The lead: the call may not lie in the past (now is minute 37), so 41 is the earliest opening.
		expect(await h.tribunal.schedule(40, 1, 2, "")).toMatchObject({ ok: false, error: "INVALID_MINUTE" });
		expect(await h.tribunal.schedule(53, 2, 2, "")).toMatchObject({ ok: false, error: "INVALID_MINUTE", detail: "the latest opening is minute 52: vote and gate must end before the act does" });
		// A count below what is missing must leave room for one more tribunal.
		expect(await h.tribunal.schedule(47, 1, 2, "")).toMatchObject({ ok: false, error: "INVALID_MINUTE", detail: "open by minute 46 to leave room for one more tribunal, or exile all 2 still missing" });
		expect(h.ofType("tribunal_scheduled")).toHaveLength(1);
		expect(await h.tribunal.schedule(52, 2, 2, "all at once")).toMatchObject({ ok: true, value: { tribunal: 2, opens: 52, calledAt: 46, count: 2, factions: 2, by: "gamemaker", reason: "all at once" } });
		expect(await h.tribunal.schedule(46, 1, 2, "again")).toMatchObject({ ok: false, error: "NOT_NOW" });
	});

	it("keeps the gap between openings and lengthens the lead with it", async () => {
		const h = await afterFirst({ minutes: 120 });
		expect(await h.tribunal.schedule(39, 1, undefined, "")).toMatchObject({ ok: false, error: "INVALID_MINUTE" });
		// 30 minutes after the first opening: a lead of 10. Factions left out take the story's 2.
		expect(await h.tribunal.schedule(64, 1, undefined, "  later  ")).toMatchObject({ ok: true, value: { opens: 64, calledAt: 54, factions: 2, reason: "later" } });
		await h.until(54);
		expect(h.ofType("tribunal_called").at(-1)).toMatchObject({ tribunal: 2, opens: 64, count: 1, nominateUntil: 59 });
		expect(h.posts().at(-1)).toBe("Tribunal 2 sits at minute 64: the city exiles 1, and the 2 with the fewest points stand trial.");
		await h.until(64);
		expect(h.tribunal.session()).toMatchObject({ tribunal: 2, minute: 64, count: 1 });
	});
});

describe("the city's own tribunals", () => {
	it("falls back on one of its own 10 minutes after a result when nothing is planned", async () => {
		const h = harness(SIX, { minutes: 90 });
		await h.until(45);
		expect(h.ofType("tribunal_scheduled")).toHaveLength(1);
		await h.until(46);
		expect(h.ofType("tribunal_scheduled").at(-1)).toEqual({ type: "tribunal_scheduled", tribunal: 2, opens: 51, calledAt: 46, count: 1, factions: 2, by: "fallback" });
	});

	it("forces the final tribunal with everything still missing when only one more fits, then ends the act at the target", async () => {
		const h = harness(SIX);
		await h.until(46);
		// A01 went to the gate at 36 and was exiled at 41: two still missing.
		expect(await h.tribunal.exiled()).toEqual(["A01"]);
		// Five present in two factions are fewer per faction than the three accused: no draft this time (v08).
		expect(h.ofType("tribunal_scheduled").at(-1)).toEqual({
			type: "tribunal_scheduled",
			tribunal: 2,
			opens: 51,
			calledAt: 46,
			count: 2,
			factions: 2,
			by: "final",
			noDraft: "too few per faction",
		});
		expect(h.ofType("tribunal_called").at(-1)).toEqual({ type: "tribunal_called", tribunal: 2, opens: 51, count: 2, factions: 0, noDraft: "too few per faction" });
		expect(h.posts().at(-1)).toBe(
			"Tribunal 2 sits at minute 51: the city exiles 2, and the 3 with the fewest points stand trial. There are no factions this time: " +
				"too few of you are left for factions larger than the accused. Every vote is your own.",
		);
		expect(h.tribunal.draft()).toBeNull();
		await h.until(51);
		// Two to exile, five present: three accused, and all five vote.
		expect(h.tribunal.session()).toMatchObject({ tribunal: 2, count: 2, accused: ["A02", "A03", "A04"], voters: ["A02", "A03", "A04", "A05", "A06"] });
		await h.until(57);
		expect((await h.tribunal.gates()).map((gate) => gate.agent)).toEqual(["A02", "A03"]);
		expect(h.tribunal.ended()).toBe(false);
		expect((await h.tribunal.stop()).busy).toBe(true);
		await h.until(58);
		expect(h.tribunal.ended()).toBe(true);
		const { endReason } = await h.tribunal.stop();
		expect(endReason).toBe("The city has kept 3 of 6 residents, and of them only 2 take a seat. Exiled: A01, A02 and A03. The tribunals are over.");
		expect(h.posts().at(-1)).toBe(endReason);
		expect(await h.tribunal.schedulingWindow()).toMatchObject({ open: false });
		const count = h.events().length;
		await h.until(59);
		expect(h.events()).toHaveLength(count);
	});

	it("lets the final tribunal take what a ransom added after it was planned", async () => {
		const h = harness(SIX);
		await h.until(36);
		// Tribunal 2 at 46 sends one more to the gate at 48; then only one more fits: the final, planned for 1 at 52.
		expect(await h.tribunal.schedule(46, 1, 2, "")).toMatchObject({ ok: true });
		await h.until(48);
		const [gate] = await h.tribunal.gates();
		expect(h.ofType("tribunal_scheduled").at(-1)).toMatchObject({ tribunal: 3, by: "final", opens: 52, count: 1 });
		// A ransom before the opening: two are missing again.
		expect(await h.tribunal.payRansom("A06", gate?.agent ?? "", 100)).toMatchObject({ ok: true, value: { freed: true } });
		expect(await h.tribunal.missing()).toBe(2);
		await h.until(52);
		expect(h.tribunal.session()).toMatchObject({ tribunal: 3, count: 2 });
		expect(h.tribunal.session()?.accused).toHaveLength(3);
		await h.until(59);
		expect(await h.tribunal.exiled()).toHaveLength(3);
		expect(h.tribunal.ended()).toBe(true);
	});

	it("drops a plan whose call meets a shut snapshot door, and plans anew once it opens", async () => {
		const h = harness(SIX);
		await h.until(36);
		expect(await h.tribunal.schedule(46, 1, 2, "")).toMatchObject({ ok: true, value: { calledAt: 42 } });
		await h.until(41);
		h.flags.doorShut = true;
		await h.until(42);
		expect(h.ofType("tribunal_cancelled")).toEqual([{ type: "tribunal_cancelled", tribunal: 2, reason: "a snapshot door is shut" }]);
		expect(h.ofType("tribunal_called")).toHaveLength(1);
		expect(await h.tribunal.schedulingWindow()).toEqual({ open: false, why: "a snapshot door is shut; plan once it opens" });
		h.flags.doorShut = false;
		await h.until(46);
		expect(h.ofType("tribunal_scheduled").at(-1)).toMatchObject({ tribunal: 2, by: "final", calledAt: 46 });
	});

	it("calls no planned tribunal once a black seal reached the target, and calls one for fewer once it struck (v09)", async () => {
		const alive = async (h: Harness): Promise<string[]> => {
			const found: string[] = [];
			// One probe at a time: the probe runs one function per call.
			for (const agent of competitorIds(6)) if (JSON.stringify(await h.tribunal.standing(agent)) === JSON.stringify({ kind: "alive" })) found.push(agent);
			return found;
		};
		const full = harness(SIX);
		await full.until(36);
		expect(await full.tribunal.schedule(46, 2, 2, "")).toMatchObject({ ok: true, value: { calledAt: 42 } });
		for (const agent of (await alive(full)).slice(0, 2)) await full.tribunal.strike(agent);
		expect(await full.tribunal.missing()).toBe(0);
		await full.until(42);
		expect(full.ofType("tribunal_cancelled")).toEqual([{ type: "tribunal_cancelled", tribunal: 2, reason: "the target is reached" }]);
		expect(full.ofType("tribunal_called")).toHaveLength(1);
		const one = harness(SIX);
		await one.until(36);
		expect(await one.tribunal.schedule(46, 2, 2, "")).toMatchObject({ ok: true });
		await one.tribunal.strike((await alive(one))[0] ?? "");
		await one.until(42);
		expect(one.ofType("tribunal_called").at(-1)).toMatchObject({ tribunal: 2, count: 1 });
	});

	it("keeps the bequests of a will written at the gate when a black seal strikes (v09)", async () => {
		// A01 (fewest points) goes to the gate at 36 holding two counter-factors that A02 still needs.
		const piece = (id: string): HeldPiece => ({ id, kind: "counter", level: 8, label: `counter-factor ${id}`, needers: ["A02"], value: "123" });
		const h = harness(SIX, { held: { A01: [piece("F1"), piece("F2")] } });
		await h.until(36);
		const gate = (await h.tribunal.gates())[0]?.agent;
		expect(gate).toBe("A01");
		expect(await h.tribunal.recordWill("A01", "for my friends", ["F1"], "A02")).toMatchObject({ ok: true });
		await h.tribunal.strike("A01");
		expect(h.exiledLog().at(-1)).toBe("A01");
		// The bequeathed F1 stays with its heir: the city keeps only F2 (old `onExiled(agent, ["F1"])`).
		expect(h.city.of("keep")).toEqual([{ from: "A01", pieces: [expect.objectContaining({ id: "F2" })] }]);
	});

	it("does not count a ransomed resident as exiled", async () => {
		const h = harness(SIX);
		await h.until(36);
		expect(await h.tribunal.missing()).toBe(2);
		expect(await h.tribunal.payRansom("A06", "A01", 100)).toMatchObject({ ok: true, value: { freed: true } });
		expect(await h.tribunal.missing()).toBe(3);
		await h.until(46);
		expect(h.ofType("tribunal_scheduled").at(-1)).toMatchObject({ by: "final", count: 3 });
	});

	it("keeps holding tribunals until the target is reached, whatever the standings (v06)", async () => {
		const h = harness(SIX);
		await h.until(120);
		expect(await h.tribunal.missing()).toBe(0);
		expect((await h.tribunal.exiled()).length).toBeGreaterThanOrEqual(exileTarget(halfTribunal(), 6));
		expect(h.tribunal.ended()).toBe(true);
		expect(h.ofType("tribunal_cancelled")).toEqual([]);
	});
});

describe("tribunal", () => {
	it("accuses the lowest, breaks ties by the last level-up, lets the accused vote but not for themselves, and charges the non-voter", async () => {
		// A01 and A02 tie on points; A02 progressed earlier, so it is accused first.
		const h = harness([10, 10, 30, 40, 50, 60], { progress: [12, 5, 1, 1, 1, 1] });
		await h.until(34);
		expect(h.ofType("tribunal_opened")[0]).toMatchObject({ accused: ["A02", "A01"], voters: competitorIds(6), until: 36 });
		// v08 (P33): the accused vote too, never against themselves.
		expect(h.tribunal.canVote("A01")).toBe(true);
		expect(await h.tribunal.vote("A02", "A02")).toMatchObject({ ok: false, error: "SELF_VOTE", detail: "you may not vote against yourself; vote against A01" });
		expect(await h.tribunal.vote("A01", "A02")).toMatchObject({ ok: true });
		expect(await h.tribunal.vote("A02", "A01")).toMatchObject({ ok: true });
		expect(await h.tribunal.vote("A03", "A04")).toMatchObject({ ok: false, error: "NOT_ACCUSED" });
		expect(await h.tribunal.vote("A03", "A01")).toMatchObject({ ok: true });
		// A cast vote closes the tool for its voter (old ALREADY_VOTED).
		expect(h.tribunal.canVote("A03")).toBe(false);
		expect(await h.tribunal.vote("A03", "A02")).toMatchObject({ ok: false, error: TOOL_LOCKED });
		expect(await h.tribunal.vote("A04", "A02")).toMatchObject({ ok: true });
		expect(h.tribunal.canVote("A05")).toBe(true);
		await h.until(36);
		// Two votes each: the tie goes to fewer points, then the same order, so A02 goes to the gate.
		expect(h.ofType("tribunal_result")[0]).toMatchObject({ counts: [{ agent: "A02", votes: 2 }, { agent: "A01", votes: 2 }], exiled: ["A02"], nonVoters: ["A05", "A06"] });
		expect(h.points.get("A05")).toBe(42);
		expect(h.points.get("A06")).toBe(52);
		expect(await h.tribunal.standing("A02")).toEqual({ kind: "gate", until: 41 });
		// Only the exiled hears who voted against it; the board shows counts.
		expect(h.noticesOf("A02").some((text) => text.includes("Votes against you: A01 and A04."))).toBe(true);
		expect(h.posts().some((post) => post.includes("A04"))).toBe(false);
		await h.until(41);
		expect(await h.tribunal.isExiled("A02")).toBe(true);
		expect(h.exiledLog()).toEqual(["A02"]);
		expect(h.posts().at(-1)).toContain("struck A02 from its register");
	});

	it("prices the ransom from the median, mixes payments, caps them, refunds nothing, and refuses a second", async () => {
		const h = harness(SIX);
		await h.until(36);
		// Nobody voted: A01 (fewest points) goes to the gate, every resident paid 8, the accused too. Median of 2, 12, 22, 32,
		// 42, 52 is 27; a third of it is below the minimum of 20, and half of the median, scaled from 20, is 30.
		const [gate] = await h.tribunal.gates();
		const target = gate?.agent ?? "";
		expect(gate).toMatchObject({ agent: "A01", price: 20, selfPrice: 30, covered: 0 });
		// An amount below the schema's minimum never reaches the exile (old INVALID_AMOUNT).
		expect(await h.tribunal.payRansom("A06", target, 0)).toMatchObject({ ok: false, error: "INVALID_ARGUMENTS" });
		expect(await h.tribunal.payRansom("A06", "A05", 10)).toMatchObject({ ok: false, error: "NOT_AT_GATE" });
		expect(await h.tribunal.payRansom("A06", target, 10)).toMatchObject({ ok: true, value: { paid: 10, price: 20, selfPrice: 30, covered: 50, freed: false } });
		// A01's own 2 points count 20/30 each: 10/20 + 2/30 = 56%; it cannot pay more than it holds.
		expect(await h.tribunal.payRansom(target, target, 3)).toMatchObject({ ok: false, error: "INSUFFICIENT_FUNDS" });
		expect(await h.tribunal.payRansom(target, target, 2)).toMatchObject({ ok: true, value: { paid: 12, covered: 56, freed: false } });
		expect(h.points.get(target)).toBe(0);
		// Only the missing 9 are taken from A05's 42 (50 less the 8 for not voting).
		expect(await h.tribunal.payRansom("A05", target, 42)).toMatchObject({ ok: true, value: { paid: 21, covered: 100, freed: true } });
		expect(h.points.get("A05")).toBe(33);
		expect(await h.tribunal.standing(target)).toEqual({ kind: "alive" });
		expect(h.posts()).toContain(`A01, A05 and A06 paid the ransom. ${target} returns to the city.`);
		// The forced final tribunal sends the same resident to the gate again: no second ransom.
		await h.until(51);
		for (const voter of Parse(Type.Array(Type.String()), h.tribunal.session()?.voters)) await h.tribunal.vote(voter, target);
		await h.until(53);
		expect(await h.tribunal.gates()).toEqual(expect.arrayContaining([expect.objectContaining({ agent: target, ransomable: false })]));
		expect(await h.tribunal.payRansom("A06", target, 40)).toMatchObject({ ok: false, error: "NO_RANSOM" });
	});

	it("lets the exiled buy itself back at the higher price", async () => {
		const h = harness([60, 70, 80, 90, 100, 110]);
		await h.until(36);
		// Median of 52, 62, 72, 82, 92, 102 (everyone paid 8 for not voting) is 77: others pay a third (26), the exiled itself half (39).
		const [gate] = await h.tribunal.gates();
		expect(gate).toMatchObject({ agent: "A01", price: 26, selfPrice: 39 });
		expect(h.noticesOf("A01").at(-1)).toContain("26 points from others, or 39 if you pay it yourself");
		expect(await h.tribunal.payRansom("A01", "A01", 100)).toMatchObject({ ok: true, value: { paid: 39, covered: 100, freed: true } });
		expect(h.points.get("A01")).toBe(13);
		expect(h.ofType("ransom_paid")[0]).toMatchObject({ payer: "A01", amount: 39, price: 26, selfPrice: 39, covered: 100 });
	});

	it("restores its state from a snapshot", async () => {
		const h = harness(SIX);
		await h.until(34);
		await h.tribunal.vote("A03", "A01");
		const copy = harness(SIX, { from: h });
		expect(copy.tribunal.slice()).toEqual(h.tribunal.slice());
		expect(copy.host.snapshot().mechanics.exile).toEqual(h.host.snapshot().mechanics.exile);
		expect(copy.tribunal.canVote("A03")).toBe(false);
		expect(copy.tribunal.canVote("A04")).toBe(true);
	});
});

describe("the faction draft", () => {
	/**
	 * Tribunal 1 is called at 30; nominations run until 32. A03 and A01 tie on two nominations; A03 has more points
	 * and leads first. A02 and A06 join A03, A04 joins A01, A05 is refused by A01 and stays without a faction.
	 */
	async function drafted(): Promise<Harness> {
		const h = harness(SIX);
		await h.until(30);
		const t = h.tribunal;
		expect(t.draft()?.group).toBe("G1");
		expect(h.groups()[0]).toMatchObject({ name: "GT1", members: competitorIds(6) });
		const rules = h.groups()[0]?.posts[0] ?? "";
		expect(rules).toMatch(/^Tribunal 1 sits at minute 34\. Before it, the city forms 2 factions in group G1, where all of you are \(posts there cost nothing\)\. Until minute 32 nominate a leader/);
		expect(rules).toContain("each of them gets 5 points");
		// The rules reach every member's turn too, not only the group.
		for (const id of competitorIds(6)) expect(h.noticesOf(id)).toContain(rules);
		expect(t.draftPhase("A01")).toEqual({ kind: "nominate", until: 32 });
		expect(draftTools(h, "A01")).toEqual(["nominate"]);
		expect(await t.nominate("A01", "A09")).toMatchObject({ ok: false, error: "UNKNOWN_NOMINEE" });
		// No application is taken while the nominations run: the tool is closed (old NO_DRAFT).
		expect(await t.join("A01", "A03")).toMatchObject({ ok: false, error: TOOL_LOCKED });
		for (const [voter, nominee] of [
			["A01", "A03"],
			["A02", "A03"],
			["A03", "A01"],
			["A04", "A01"],
			["A05", "A05"],
			["A06", "A02"],
			// The last nomination counts.
			["A06", "A06"],
		] as const) {
			expect(await t.nominate(voter, nominee)).toMatchObject({ ok: true });
		}
		expect(t.draftPhase("A06")).toEqual({ kind: "nominate", until: 32, nominee: "A06" });
		await h.until(31);
		expect(h.ofType("faction_leaders")).toEqual([]);
		await h.until(32);
		expect(h.ofType("faction_leaders")).toEqual([
			{
				type: "faction_leaders",
				tribunal: 1,
				leaders: ["A03", "A01"],
				nominations: [
					{ agent: "A01", count: 2 },
					{ agent: "A03", count: 2 },
					{ agent: "A05", count: 1 },
					{ agent: "A06", count: 1 },
				],
			},
		]);
		expect(h.groups()[0]?.posts.at(-1)).toBe("The nominations are closed. Leaders: A03 and A01. Until minute 34 join one of them with join(leader).");
		for (const leader of ["A01", "A03"] as const) expect(h.noticesOf(leader).at(-1)).toMatch(/^You lead a faction for tribunal 1\./);
		// Once the leaders are named the nominations are closed, a leader applies nowhere and only a leader refuses (old NO_DRAFT, IS_LEADER, NOT_A_LEADER).
		expect(draftTools(h, "A02")).toEqual(["join"]);
		expect(draftTools(h, "A03")).toEqual(["refuse"]);
		expect(await t.nominate("A02", "A03")).toMatchObject({ ok: false, error: TOOL_LOCKED });
		expect(await t.join("A03", "A01")).toMatchObject({ ok: false, error: TOOL_LOCKED });
		expect(await t.join("A02", "A04")).toMatchObject({ ok: false, error: "NOT_A_LEADER" });
		expect(await t.join("A02", "A03")).toMatchObject({ ok: true });
		expect(h.noticesOf("A03").at(-1)).toBe("A02 applies to join your faction. You may refuse them with refuse(agent) before minute 34.");
		expect(await t.join("A04", "A01")).toMatchObject({ ok: true });
		expect(await t.join("A05", "A01")).toMatchObject({ ok: true });
		expect(await t.join("A06", "A03")).toMatchObject({ ok: true });
		expect(t.draftPhase("A01")).toEqual({ kind: "join", until: 34, leads: true, applicants: ["A04", "A05"], refusedBy: [] });
		expect(await t.refuse("A02", "A06")).toMatchObject({ ok: false, error: TOOL_LOCKED });
		expect(await t.refuse("A01", "A02")).toMatchObject({ ok: false, error: "NOT_APPLYING" });
		expect(await t.refuse("A01", "A05")).toMatchObject({ ok: true });
		expect(h.noticesOf("A05").at(-1)).toBe("A01 refused you. Until minute 34 you may apply to another leader with join(leader).");
		expect(await t.join("A05", "A01")).toMatchObject({ ok: false, error: "REFUSED" });
		expect(t.draftPhase("A05")).toEqual({ kind: "join", until: 34, leads: false, applicants: [], refusedBy: ["A01"] });
		await h.until(34);
		return h;
	}

	it("names leaders by nominations, then points; forms the factions in their own groups; lists those without one", async () => {
		const h = await drafted();
		expect(h.ofType("factions_formed")).toEqual([
			{
				type: "factions_formed",
				tribunal: 1,
				factions: [
					{ leader: "A03", group: "G2", members: ["A03", "A02", "A06"] },
					{ leader: "A01", group: "G3", members: ["A01", "A04"] },
				],
				without: ["A05"],
			},
		]);
		expect(h.groups().slice(1).map((group) => [group.name, group.members])).toEqual([
			["Faction of A03", ["A03", "A02", "A06"]],
			["Faction of A01", ["A01", "A04"]],
		]);
		expect(h.groups()[1]?.posts).toEqual([
			"Faction of A03: A03, A02 and A06. If every voting member votes against the same accused in tribunal 1, each of them gets 5 points. Posts here cost nothing.",
		]);
		expect(h.groups()[0]?.posts.at(-1)).toBe("The factions of tribunal 1: faction of A03 (group G2): A03, A02 and A06; faction of A01 (group G3): A01 and A04. Without a faction: A05.");
		expect(h.tribunal.draftPhase("A02")).toBeUndefined();
		expect(h.tribunal.session()).toMatchObject({ accused: ["A01", "A02"] });
	});

	it("refuses draft calls once the factions are formed", async () => {
		const h = await drafted();
		// The draft is over: none of its tools is open to anyone (old NOT_A_LEADER, NOT_IN_DRAFT).
		for (const id of competitorIds(6)) expect(draftTools(h, id)).toEqual([]);
		expect(await h.tribunal.refuse("A01", "A04")).toMatchObject({ ok: false, error: TOOL_LOCKED });
		expect(await h.tribunal.join("A05", "A03")).toMatchObject({ ok: false, error: TOOL_LOCKED });
		expect(await h.tribunal.nominate("A05", "A03")).toMatchObject({ ok: false, error: TOOL_LOCKED });
	});

	it("names a resident bought back from the gate during the draft among those without a faction", async () => {
		const h = harness(SIX);
		await h.until(36);
		// A01 is at the gate when tribunal 2 is called at 37, so it is not in the draft.
		expect(await h.tribunal.schedule(41, 1, 2, "")).toMatchObject({ ok: true, value: { calledAt: 37 } });
		await h.until(37);
		expect(h.groups().find((group) => group.name === "GT2")?.members).toEqual(["A02", "A03", "A04", "A05", "A06"]);
		expect(await h.tribunal.payRansom("A06", "A01", 100)).toMatchObject({ ok: true, value: { freed: true } });
		await h.until(41);
		expect(Parse(Type.Array(Type.String()), h.ofType("factions_formed").at(-1)?.without)).toContain("A01");
	});

	it("breaks a tie of nominations and points by the city's seeded lot", async () => {
		const h = harness([20, 20, 20, 20, 20, 20]);
		await h.until(32);
		const lot = rngFor(7, "factions", 1).shuffle(competitorIds(6));
		expect(h.ofType("faction_leaders")[0]).toMatchObject({ leaders: lot.slice(0, 2) });
	});

	it("pays the bloc bonus only to the voters of a faction that voted as one, tells only its members, and removes the groups", async () => {
		const h = await drafted();
		// Faction of A03: all three vote against A01, the accused A02 among them (v08). Faction of A01: the accused A01
		// votes against A02, A04 does not vote: no bloc.
		await h.tribunal.vote("A03", "A01");
		await h.tribunal.vote("A02", "A01");
		await h.tribunal.vote("A06", "A01");
		await h.tribunal.vote("A01", "A02");
		await h.tribunal.vote("A05", "A01");
		await h.until(36);
		expect(h.ofType("bloc_result")).toEqual([
			{ type: "bloc_result", tribunal: 1, leader: "A03", voting: ["A03", "A02", "A06"], united: true, target: "A01", defectors: [], bonus: 5 },
			{ type: "bloc_result", tribunal: 1, leader: "A01", voting: ["A01", "A04"], united: false, target: "A02", defectors: ["A04"], bonus: 0 },
		]);
		expect(h.points.get("A03")).toBe(35);
		expect(h.points.get("A02")).toBe(25);
		expect(h.points.get("A06")).toBe(65);
		expect(h.points.get("A05")).toBe(50);
		expect(h.points.get("A04")).toBe(32);
		const united = "Your faction voted as one in tribunal 1: +5 points for each of its voters.";
		const heard = competitorIds(6).filter((id) => h.noticesOf(id).includes(united));
		expect(heard).toEqual(["A02", "A03", "A06"]);
		expect(h.groups().every((group) => group.removed)).toBe(true);
		expect(h.tribunal.draft()).toBeNull();
		// The bloc's outcome never reaches the board.
		expect(h.posts().some((post) => post.includes("as one"))).toBe(false);
	});

	it("tells a split faction's members that it split, never who broke ranks", async () => {
		const h = await drafted();
		await h.tribunal.vote("A03", "A01");
		await h.tribunal.vote("A06", "A02");
		await h.until(36);
		// The accused A02 did not vote: it breaks the bloc like any other member (v08).
		expect(h.ofType("bloc_result")[0]).toMatchObject({ leader: "A03", voting: ["A03", "A02", "A06"], united: false, defectors: ["A02", "A06"], bonus: 0 });
		expect(h.points.get("A03")).toBe(30);
		const split = "Your faction did not vote as one in tribunal 1; no bonus. The city does not say who broke ranks.";
		// Nobody of A01's faction voted either: its two members hear that it split too.
		expect(competitorIds(6).filter((id) => h.noticesOf(id).includes(split))).toEqual(["A01", "A02", "A03", "A04", "A06"]);
		for (const notice of h.notices()) if (notice.text.includes("as one")) expect(notice.text).not.toMatch(/A0\d/);
	});

	it("restores a draft from a snapshot", async () => {
		const h = harness(SIX);
		await h.until(32);
		await h.tribunal.join("A02", h.tribunal.draft()?.leaders[0] ?? "");
		const copy = harness(SIX, { from: h });
		expect(copy.tribunal.slice()).toEqual(h.tribunal.slice());
		expect(copy.tribunal.draftPhase("A02")).toEqual(h.tribunal.draftPhase("A02"));
		expect(draftTools(copy, "A02")).toEqual(draftTools(h, "A02"));
		expect(copy.tribunal.draft()?.group).toBe("G1");
	});

	it("holds no draft when fewer than four residents are present", async () => {
		const h = harness([10, 20, 30]);
		await h.until(34);
		expect(h.ofType("tribunal_called")).toMatchObject([{ factions: 0, noDraft: "too few residents" }]);
		expect(h.groups()).toEqual([]);
		expect(h.posts().at(-2)).toContain("There are no factions this time");
		// Three present: two accused, and all three vote.
		expect(h.tribunal.session()).toMatchObject({ accused: ["A01", "A02"], voters: ["A01", "A02", "A03"] });
	});

	it("caps a faction at its share of the residents, its leader included; a refusal frees a place (v08, P31)", async () => {
		const h = harness(SIX);
		await h.until(30);
		const t = h.tribunal;
		expect(h.groups()[0]?.posts[0]).toContain("a faction holds at most 3 residents, its leader included, and a full faction takes nobody else");
		for (const voter of ["A01", "A02", "A04", "A05", "A06"]) await t.nominate(voter, "A03");
		await t.nominate("A03", "A01");
		await h.until(32);
		expect(t.draft()?.leaders).toEqual(["A03", "A01"]);
		expect(await t.join("A02", "A03")).toMatchObject({ ok: true });
		expect(await t.join("A04", "A03")).toMatchObject({ ok: true });
		expect(await t.join("A05", "A03")).toMatchObject({
			ok: false,
			error: "FACTION_FULL",
			detail: "the faction of A03 is full: at most 3 members, its leader included; apply to another leader",
		});
		// Applying again where one already counts is no new place.
		expect(await t.join("A04", "A03")).toMatchObject({ ok: true });
		// Moving to another faction frees the place, and so does a refusal.
		expect(await t.join("A04", "A01")).toMatchObject({ ok: true });
		expect(await t.join("A05", "A03")).toMatchObject({ ok: true });
		expect(await t.refuse("A03", "A05")).toMatchObject({ ok: true });
		expect(await t.join("A06", "A03")).toMatchObject({ ok: true });
		expect(t.slice().draft).toMatchObject({ cap: 3 });
		await h.until(34);
		expect(h.ofType("factions_formed")[0]).toMatchObject({
			factions: [{ members: ["A03", "A02", "A06"] }, { members: ["A01", "A04"] }],
		});
	});
});

describe("last will (SPEC 6.4)", () => {
	// The will's cap, the bequests and the burn at exile on the real City of Keys are compared against the old World by
	// test/mechanics/exile/world.test.ts ("refuses wills in the old order with the old details", "executes a will at once ...").
	it("states the cap in the announcement and validates it", async () => {
		const h = harness(SIX, { spec: cityOfKeysTribunal(), actStart: 12 });
		await h.until(30);
		const announcement = h.posts().find((post) => post.startsWith("THE CITY HOLDS TRIBUNAL."));
		expect(announcement).toContain("A last will may leave each heir at most 10% of your points, to as many heirs as you like, and any factor you hold");
		const validate = (bequestPerHeir: number): readonly string[] =>
			validateStory({ ...cityOfKeys, tribunal: { ...cityOfKeysTribunal(), bequestPerHeir } }).filter((issue) => issue.startsWith("tribunal.bequestPerHeir"));
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
	const spec = cityOfKeysTribunal();
	const withTribunal = (patch: Partial<TribunalSpec>, run: Partial<AnyStory["run"]> = {}): readonly string[] =>
		validateStory({ ...cityOfKeys, run: { ...cityOfKeys.run, ...run }, tribunal: { ...spec, ...patch } }).filter((issue) => issue.startsWith("tribunal"));
	const factions = spec.factions;
	if (factions === undefined) throw new Error("cityofkeys has no faction draft");

	it("accepts the cityofkeys parameters and a city of 48", () => {
		expect(withTribunal({})).toEqual([]);
		expect(withTribunal({}, { agents: 48, survivors: 12 })).toEqual([]);
	});

	it("rejects pacing parameters that cannot work", () => {
		expect(withTribunal({ first: { level: 99, latestAfter: 18 } })).toContain("tribunal.first.level: level 99 does not exist");
		expect(withTribunal({ first: { level: 10, latestAfter: 40 } })).toContain("tribunal.first.latestAfter: a tribunal called 40 minutes into the act does not end within the act's 48 minutes");
		expect(withTribunal({ act: 9 })).toContain("tribunal.act: no act starts at level 9");
		expect(withTribunal({ targetShare: 1 })).toContain("tribunal.targetShare: must be a share of the residents between 0 and 1");
		expect(withTribunal({ targetShare: 0.9 })).toContain(
			"tribunal.targetShare: a city of 6 holds no tribunal (it must exile at least one, keep the 2 survivors and have three residents for a vote)",
		);
		expect(withTribunal({ minGap: 1 })).toContain("tribunal.minGap: 1 minutes cannot hold a vote of 2");
		expect(withTribunal({ fallbackGap: 0 })).toContain("tribunal.fallbackGap: must be a positive integer");
		expect(withTribunal({ lead: { share: 1, minimum: 4 } })).toContain("tribunal.lead.share: must be a share of the gap from 0 up to (not including) 1");
		expect(withTribunal({ lead: { share: 1 / 3, minimum: 0 } })).toContain("tribunal.lead.minimum: must be a positive integer");
		expect(withTribunal({ lead: { share: 1 / 3, minimum: 1 } })).toContain("tribunal.lead.minimum: a faction draft needs at least 2 minutes (nominations, then applications)");
		expect(withTribunal({ maxMinutes: 0 })).toContain("tribunal.maxMinutes: must be a positive integer");
		const { calledNoDraft, ...texts } = spec.texts;
		expect(calledNoDraft).toContain("There are no factions this time");
		expect(withTribunal({ texts })).toContain("tribunal.texts.calledNoDraft: a tribunal with factions must say when it holds no draft");
		expect(withTribunal({ texts: { ...texts, calledNoDraft: "No factions in {nonsense}." } })).toContain("tribunal.texts.calledNoDraft: unknown placeholder {nonsense}");
	});

	it("rejects ransom, will and faction parameters that cannot work", () => {
		expect(withTribunal({ ransom: { share: 0, selfShare: 2 / 3, minimum: 20 } })).toContain("tribunal.ransom.share: must be a share of the median between 0 and 1");
		expect(withTribunal({ ransom: { share: 1 / 2, selfShare: 1 / 3, minimum: 20 } })).toContain("tribunal.ransom.selfShare: must be at least ransom.share and at most 2");
		expect(withTribunal({ ransom: { share: 1 / 2, selfShare: 2 / 3, minimum: 0 } })).toContain("tribunal.ransom.minimum: must be a positive integer");
		expect(withTribunal({ factions: { ...factions, count: 1 } })).toContain("tribunal.factions.count: must be an integer of at least 2");
		expect(withTribunal({ factions: { ...factions, count: 4 } })).toContain("tribunal.factions.count: 4 factions do not fit 6 residents (at most half of them lead)");
		expect(withTribunal({ factions: { ...factions, blocBonus: -1 } })).toContain("tribunal.factions.blocBonus: must be a non-negative integer");
		expect(withTribunal({ factions: { ...factions, texts: { ...factions.texts, leaders: "Leaders: {nobody}." } } })).toContain("tribunal.factions.texts.leaders: unknown placeholder {nobody}");
		expect(withTribunal({ factions: { ...factions, texts: { ...factions.texts, split: "A06 broke ranks." } } })).toContain("tribunal.factions.texts.split: must not name a resident");
	});

	it("checks the run's agent count, also when a run overrides it", () => {
		for (const agents of [6, 12, 48, 96]) expect(validateStory(cityOfKeys, { agents }).filter((issue) => issue.startsWith("tribunal"))).toEqual([]);
		// A small test city plays without a tribunal.
		expect(validateStory(cityOfKeys, { agents: 3 }).filter((issue) => issue.startsWith("tribunal"))).toEqual([]);
	});

	it("checks the texts: known placeholders, and the announcement states every rule", () => {
		const texts = spec.texts;
		expect(withTribunal({ texts: { ...texts, opened: "Tribunal {nonsense}." } })).toContain("tribunal.texts.opened: unknown placeholder {nonsense}");
		expect(withTribunal({ texts: { ...texts, called: "Tribunal {tribunal} at {minute}: {count} go, {accusedCount} accused." } })).toEqual([]);
		expect(withTribunal({ texts: { ...texts, announcement: "There will be a tribunal; it keeps {kept}." } })[0]).toMatch(/^tribunal\.texts\.announcement: must state every rule, missing \{voteMinutes\}/);
	});
});
