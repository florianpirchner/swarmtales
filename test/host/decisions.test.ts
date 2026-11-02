/**
 * The decision gate (docs/design/overseer-api.md §3, step 18 step 3) on the proof mechanics `pot`
 * and `gatekeeper`: no event when nobody holds the right (or the window is 0, or no holder is
 * reachable), the window path with its events, deadline job and settlement, every refusal code of
 * `amendDecision`, the human's priority, a `lock` handler on the core tool, the story's narrowing,
 * and a snapshot cut with an open decision that resumes to the log of the uninterrupted run.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { createPromptLookup } from "@swarmtales/prompts";
import { createHost, defineMechanic, DECISION_CLOSED, DECISION_HUMAN, DECISION_NOT_HELD, PROPOSAL_INVALID, type HostOptions } from "@swarmtales/kernel";
import type { CoreStory, EventEnvelope, Host, MechanicUse, OverseerUse, Turn } from "@swarmtales/contracts";
import { stubOverseer, terminator } from "./proof/overseers.ts";
import { PROOF_PROMPTS } from "./proof/story.ts";
import { gatekeeper, Pick, pot } from "./proof/pot.ts";

interface Setup {
	readonly window?: number;
	readonly max?: number;
	readonly at?: number;
	readonly grants?: CoreStory["grants"];
	readonly overseers?: readonly OverseerUse[];
	readonly decisions?: CoreStory["decisions"];
	readonly extra?: readonly MechanicUse[];
	readonly minutes?: number;
}

const HOLDERS = { resident: ["propose"], human: ["amendDecision"], "t-1": ["amendDecision"], "t-2": ["amendDecision"] } as const;

function storyOf(setup: Setup): CoreStory {
	return {
		id: "gate",
		seed: 11,
		minutes: setup.minutes ?? 5,
		residents: 2,
		mechanics: [pot.with({ window: setup.window ?? 2, ...(setup.max === undefined ? {} : { max: setup.max }), ...(setup.at === undefined ? {} : { at: setup.at }) }), ...(setup.extra ?? [])],
		overseers: setup.overseers ?? [terminator.as("t-1"), terminator.as("t-2")],
		grants: setup.grants ?? HOLDERS,
		...(setup.decisions === undefined ? {} : { decisions: setup.decisions }),
	};
}

function hostOf(setup: Setup, options: Partial<HostOptions> = {}): Host {
	const host = createHost({ story: storyOf(setup), human: true, ...options });
	host.start();
	return host;
}

/** A01 proposes `plan[minute]` in its turn of that minute. */
function proposer(plan: Readonly<Record<number, number>>) {
	return async (turn: Turn): Promise<void> => {
		const value = plan[turn.minute];
		if (turn.resident === "A01" && value !== undefined) await turn.call("propose", { value });
	};
}

const idle = (): Promise<void> => Promise.resolve();

function core(host: Host, type: string): readonly EventEnvelope[] {
	return host.log.ofType("core", type);
}

function picked(host: Host): readonly unknown[] {
	return host.log.ofType("pot", "picked").map((event) => event.payload);
}

function amend(host: Host, actor: Parameters<Host["call"]>[0], decision: number, value: unknown, reason = "because") {
	return host.call(actor, "amendDecision", { decision, proposal: { value }, reason });
}

function openId(host: Host): number {
	const id = core(host, "decision_proposed").at(-1)?.seq;
	if (id === undefined) throw new Error("no decision is open");
	return id;
}

const GATE_EVENTS = ["decision_proposed", "decision_settled", "human_amend"];

describe("the decision gate: nobody holds the right", () => {
	it("commits at once inside decide, in the caller's frame, and writes no event and no job", async () => {
		const host = hostOf({ grants: { resident: ["propose"] }, overseers: [] });
		await host.playMinute(proposer({ 0: 7 }));
		const called = host.log.all().find((event) => event.type === "tool_called" && event.actor === "resident:A01");
		const pick = host.log.ofType("pot", "picked")[0];
		expect(pick?.payload).toEqual({ value: 7, minute: 0, changed: false });
		expect(pick?.causedBy).toBe(called?.seq);
		expect(pick?.seq).toBe((called?.seq ?? 0) + 1);
		expect(host.log.all().filter((event) => GATE_EVENTS.includes(event.type))).toEqual([]);
		const snapshot = host.snapshot();
		expect(snapshot.jobs).toEqual([]);
		expect("decisions" in snapshot).toBe(false);
	});

	it("writes the very log of a story without holders when the window is 0, or when no holder is reachable", async () => {
		const run = async (setup: Setup, options: Partial<HostOptions> = {}) => {
			const host = hostOf(setup, options);
			for (let minute = 0; minute < 3; minute++) await host.playMinute(proposer({ 0: 7, 1: 8 }));
			return JSON.stringify(host.log.all());
		};
		const plain = await run({ grants: { resident: ["propose"] }, overseers: [] });
		expect(await run({ window: 0 })).toBe(plain);
		expect(await run({ grants: { resident: ["propose"], human: ["amendDecision"] }, overseers: [] }, { human: false })).toBe(plain);
		expect(await run({ grants: { resident: ["propose"], gamemaker: ["amendDecision"] }, overseers: [] })).toBe(plain);
		expect(await run({ decisions: { "pot.pick": { window: 0 } } })).toBe(plain);
	});

	it("counts the gamemaker as a holder only when the app drives one", async () => {
		const grants = { resident: ["propose"], gamemaker: ["amendDecision"] } as const;
		const driven = hostOf({ grants, overseers: [] }, { between: idle });
		await driven.playMinute(proposer({ 0: 7 }));
		expect(core(driven, "decision_proposed").map((event) => event.payload)).toEqual([{ decision: openId(driven), kind: "pot.pick", owner: "pot", proposal: { value: 7 }, deadline: 2, holders: ["gamemaker"] }]);
	});
});

describe("the decision gate: a window", () => {
	it("opens with decision_proposed (its seq is the id), stays pending, and settles at the deadline before the mechanics' jobs", async () => {
		const host = hostOf({ at: 2, window: 2 });
		await host.playMinute(proposer({ 0: 7 }));
		const proposed = core(host, "decision_proposed")[0];
		expect(proposed?.payload).toEqual({ decision: proposed?.seq, kind: "pot.pick", owner: "pot", proposal: { value: 7 }, deadline: 2, holders: ["human", "t-1", "t-2"] });
		expect(proposed?.causedBy).toBe(host.log.all().find((event) => event.type === "tool_called")?.seq);
		expect(picked(host)).toEqual([]);
		expect(host.facts()["pot.pending"]).toBe(1);
		await host.playMinute(idle);
		expect(picked(host)).toEqual([]);
		await host.playMinute(idle);
		const minute2 = host.log.all().filter((event) => event.minute === 2).map((event) => `${event.source}.${event.type}`);
		expect(minute2.slice(0, 5)).toEqual(["core.minute_started", "core.decision_settled", "pot.picked", "core.job_ran", "pot.ticked"]);
		const settled = core(host, "decision_settled")[0];
		expect(settled?.payload).toEqual({ decision: proposed?.seq, kind: "pot.pick", changed: false, proposal: { value: 7 }, amendments: [] });
		expect(settled?.actor).toBe("host");
		expect(host.log.ofType("pot", "picked")[0]?.causedBy).toBe(settled?.seq);
		expect(picked(host)[0]).toEqual({ value: 7, minute: 2, changed: false, decision: proposed?.seq });
		expect(host.facts()["pot.pending"]).toBe(1);
	});

	it("settles the decisions due in one minute in the order they were opened", async () => {
		const host = hostOf({ window: 1 });
		await host.playMinute(async (turn) => {
			await turn.call("propose", { value: turn.resident === "A01" ? 1 : 2 });
		});
		const opened = core(host, "decision_proposed").map((event) => event.seq);
		await host.playMinute(idle);
		expect(core(host, "decision_settled").map((event) => (typeof event.payload === "object" && event.payload !== null && "decision" in event.payload ? event.payload.decision : undefined))).toEqual(opened);
	});

	it("takes the story's window and narrows the holders", async () => {
		const host = hostOf({ window: 0, decisions: { "pot.pick": { holders: ["t-2"], window: 3 } } });
		await host.playMinute(proposer({ 0: 7 }));
		expect(core(host, "decision_proposed")[0]?.payload).toMatchObject({ deadline: 3, holders: ["t-2"] });
		expect(await amend(host, "overseer:t-1", openId(host), 9)).toMatchObject({ ok: false, code: DECISION_NOT_HELD });
		expect(await amend(host, "human", openId(host), 9)).toMatchObject({ ok: false, code: DECISION_NOT_HELD });
		expect((await amend(host, "overseer:t-2", openId(host), 9)).ok).toBe(true);
	});

	it("commits the last amendment of any holder; the commit learns who and why", async () => {
		const host = hostOf({ window: 1 });
		await host.playMinute(proposer({ 0: 7 }));
		const id = openId(host);
		expect(await amend(host, "overseer:t-1", id, 8, "first")).toEqual({ ok: true, reply: `amended decision ${String(id)}: {"value":8}` });
		expect((await amend(host, "overseer:t-2", id, 9, "second")).ok).toBe(true);
		expect(host.facts()["pot.pending"]).toBe(1);
		await host.playMinute(idle);
		const amendments = host.log.all().filter((event) => event.type === "tool_called" && event.minute === 1 && event.actor !== "resident:A01" && event.actor !== "resident:A02");
		expect(core(host, "decision_settled")[0]?.payload).toEqual({
			decision: id,
			kind: "pot.pick",
			changed: true,
			by: "t-2",
			reason: "second",
			proposal: { value: 9 },
			amendments: [
				{ by: "t-1", seq: amendments[0]?.seq },
				{ by: "t-2", seq: amendments[1]?.seq },
			],
		});
		expect(picked(host)).toEqual([{ value: 9, minute: 1, changed: true, by: "t-2", decision: id }]);
	});

	it("says unchanged when the standing amendment repeats the original", async () => {
		const host = hostOf({ window: 1 });
		await host.playMinute(proposer({ 0: 7 }));
		expect((await amend(host, "overseer:t-1", openId(host), 7, "same")).ok).toBe(true);
		await host.playMinute(idle);
		expect(core(host, "decision_settled")[0]?.payload).toMatchObject({ changed: false, by: "t-1", proposal: { value: 7 } });
	});
});

describe("amendDecision refusals", () => {
	it("refuses a decision that is not open, before and after its deadline", async () => {
		const host = hostOf({ window: 1 });
		expect(await amend(host, "human", 99, 1)).toEqual({ ok: false, code: DECISION_CLOSED });
		await host.playMinute(proposer({ 0: 7 }));
		const id = openId(host);
		await host.playMinute(idle);
		expect(await amend(host, "overseer:t-1", id, 1)).toEqual({ ok: false, code: DECISION_CLOSED });
		const refused = core(host, "tool_refused").at(-1);
		expect(refused?.payload).toEqual({ tool: "amendDecision", stage: "rule", code: DECISION_CLOSED });
	});

	it("refuses a caller that is not a holder: residents never are, and a name without the grant is not even let in", async () => {
		const host = hostOf({ window: 1, grants: { resident: ["propose"], human: ["amendDecision"], "t-1": ["amendDecision"], "t-2": [] }, overseers: [terminator.as("t-1"), player.as("t-2")] });
		await host.playMinute(proposer({ 0: 7 }));
		expect(await amend(host, "overseer:t-2", openId(host), 1)).toMatchObject({ ok: false, code: "TOOL_NOT_GRANTED" });
		expect(await amend(host, "resident:A02", openId(host), 1)).toMatchObject({ ok: false, code: "TOOL_NOT_GRANTED" });
		expect(await amend(host, "script", openId(host), 1)).toMatchObject({ ok: false, code: "TOOL_NOT_GRANTED" });
	});

	it("refuses a proposal off the kind's schema and off the decision's own, with the first Typebox error", async () => {
		const host = hostOf({ window: 1, max: 10 });
		await host.playMinute(proposer({ 0: 7 }));
		expect(await amend(host, "overseer:t-1", openId(host), "nine")).toEqual({ ok: false, code: PROPOSAL_INVALID, detail: "/value must be integer" });
		expect(await amend(host, "overseer:t-1", openId(host), 11)).toEqual({ ok: false, code: PROPOSAL_INVALID, detail: "/value must be <= 10" });
		expect(await host.call("overseer:t-1", "amendDecision", { decision: openId(host), proposal: 3, reason: "x" })).toEqual({ ok: false, code: PROPOSAL_INVALID, detail: "/ must be object" });
		expect((await amend(host, "overseer:t-1", openId(host), 10)).ok).toBe(true);
		expect(core(host, "decision_proposed")[0]?.payload).toMatchObject({ schema: { type: "object", properties: { value: { type: "integer", maximum: 10 } } } });
	});

	it("refuses arguments off the tool's parameters at stage parse", async () => {
		const host = hostOf({ window: 1 });
		expect(await host.call("human", "amendDecision", { decision: "one", proposal: {}, reason: "x" })).toEqual({ ok: false, code: "INVALID_ARGUMENTS" });
	});

	it("gives the human priority: its last amendment stands and only it may change it again", async () => {
		const host = hostOf({ window: 1 });
		await host.playMinute(proposer({ 0: 7 }));
		const id = openId(host);
		expect((await amend(host, "overseer:t-1", id, 8)).ok).toBe(true);
		expect((await amend(host, "human", id, 20, "the human")).ok).toBe(true);
		expect(await amend(host, "overseer:t-2", id, 9)).toEqual({ ok: false, code: DECISION_HUMAN });
		expect(host.facts()["pot.pending"]).toBe(1);
		expect((await amend(host, "human", id, 21, "the human again")).ok).toBe(true);
		const human = core(host, "human_amend");
		expect(human.map((event) => event.payload)).toEqual([
			{ decision: id, proposal: { value: 20 }, reason: "the human" },
			{ decision: id, proposal: { value: 21 }, reason: "the human again" },
		]);
		expect(human[0]?.actor).toBe("human");
		await host.playMinute(idle);
		expect(core(host, "decision_settled")[0]?.payload).toMatchObject({ by: "human", reason: "the human again", proposal: { value: 21 }, changed: true });
		expect(picked(host)).toEqual([{ value: 21, minute: 1, changed: true, by: "human", decision: id }]);
	});

	it("puts the human above an earlier holder even when another amends later (rule 5 by priority, not by time)", async () => {
		const host = hostOf({ window: 1, extra: [gatekeeper.with({ allowed: "t-1" })] });
		await host.playMinute(proposer({ 0: 7 }));
		const id = openId(host);
		expect((await amend(host, "human", id, 30)).ok).toBe(true);
		expect(await amend(host, "overseer:t-1", id, 31)).toEqual({ ok: false, code: DECISION_HUMAN });
		await host.playMinute(idle);
		expect(picked(host)).toEqual([{ value: 30, minute: 1, changed: true, by: "human", decision: id }]);
	});

	it("runs a mechanic's lock handler on the core tool: only the winner may amend, the human is let through", async () => {
		const host = hostOf({ window: 1, extra: [gatekeeper.with({ allowed: "t-2" })] });
		await host.playMinute(proposer({ 0: 7 }));
		const id = openId(host);
		expect(await amend(host, "overseer:t-1", id, 8)).toEqual({ ok: false, code: "NOT_THE_WINNER", detail: "only the winner may amend" });
		expect(core(host, "tool_refused").at(-1)?.payload).toEqual({ tool: "amendDecision", stage: "lock", code: "NOT_THE_WINNER", detail: "only the winner may amend" });
		expect((await amend(host, "overseer:t-2", id, 9)).ok).toBe(true);
		await host.playMinute(idle);
		expect(picked(host)).toEqual([{ value: 9, minute: 1, changed: true, by: "t-2", decision: id }]);
	});

	it("renders the replies from library/prompts when the host has a lookup", async () => {
		const host = hostOf({ window: 1 }, { prompts: createPromptLookup({ mechanics: { "acme/terminator": PROOF_PROMPTS, pot: PROOF_PROMPTS } }) });
		await host.playMinute(proposer({ 0: 7 }));
		const id = openId(host);
		expect(await amend(host, "overseer:t-1", id, 8)).toEqual({ ok: true, reply: `amended decision ${String(id)}; the proposal standing now: {"value":8}` });
		expect(await amend(host, "human", 99, 8)).toEqual({ ok: false, code: DECISION_CLOSED, detail: "this decision is not open (it settled already or never opened)" });
		expect((await amend(host, "human", id, 8)).ok).toBe(true);
		expect(await amend(host, "overseer:t-1", id, 8)).toMatchObject({ code: DECISION_HUMAN, detail: "the human amended this decision; only the human may change it again" });
		expect(host.toolSpecs("human").find((spec) => spec.name === "amendDecision")?.description).toMatch(/^Change an open decision before its deadline/);
	});
});

describe("decisions in the snapshot", () => {
	const setup: Setup = { window: 2, at: 3, minutes: 5 };
	const plan = proposer({ 0: 7, 1: 5 });

	async function prefix(): Promise<Host> {
		const host = hostOf(setup);
		await host.playMinute(plan);
		expect((await amend(host, "overseer:t-1", openId(host), 8, "early")).ok).toBe(true);
		await host.playMinute(plan);
		expect((await amend(host, "human", openId(host), 6, "late")).ok).toBe(true);
		return host;
	}

	it("resumes a cut with open decisions to the very log of the uninterrupted run", async () => {
		const whole = await prefix();
		const cut = whole.snapshot();
		expect(cut.decisions?.map((decision) => [decision.kind, decision.deadline, decision.amendments.map((amendment) => amendment.by)])).toEqual([
			["pot.pick", 2, ["t-1"]],
			["pot.pick", 3, ["human"]],
		]);
		expect(cut.jobs.filter((job) => job.owner === "core").map((job) => job.next)).toEqual([2, 3]);
		const events = whole.log.all().map((event): unknown => JSON.parse(JSON.stringify(event)));
		const resumed = createHost({ story: storyOf(setup), human: true, resume: { snapshot: JSON.parse(JSON.stringify(cut)), events } });
		expect(resumed.snapshot()).toEqual(cut);
		while ((await whole.playMinute(plan)) === undefined);
		while ((await resumed.playMinute(plan)) === undefined);
		expect(JSON.stringify(resumed.log.all())).toBe(JSON.stringify(whole.log.all()));
		expect(picked(resumed)).toEqual([
			{ value: 8, minute: 2, changed: true, by: "t-1", decision: cut.decisions?.[0]?.id },
			{ value: 6, minute: 3, changed: true, by: "human", decision: cut.decisions?.[1]?.id },
			{ value: 100, minute: 4, changed: false, decision: core(whole, "decision_proposed")[2]?.seq },
		]);
		expect("decisions" in resumed.snapshot()).toBe(false);
	});

	it("refuses a snapshot whose decision belongs to no loaded mechanic", async () => {
		const whole = await prefix();
		const cut = whole.snapshot();
		const events = whole.log.all().map((event): unknown => JSON.parse(JSON.stringify(event)));
		const bad = { ...cut, decisions: cut.decisions?.map((decision) => ({ ...decision, kind: "pot.other" })) };
		expect(() => createHost({ story: storyOf(setup), human: true, resume: { snapshot: bad, events } })).toThrow(/kind pot.other, which no loaded mechanic declares/);
	});
});

describe("decisions as a mechanic declares them", () => {
	it("refuses a decision without a commit and a commit without a decision when the mechanic is bound", () => {
		const without = defineMechanic({ id: "without", summary: "x", options: Type.Object({}), state: () => undefined, events: {}, decisions: { pick: Pick } }, () => ({}));
		const stray = defineMechanic({ id: "stray", summary: "x", options: Type.Object({}), state: () => undefined, events: {} }, () => ({ commits: { pick: () => undefined } }));
		const load = (use: MechanicUse) => () => createHost({ story: { id: "x", seed: 1, minutes: 1, residents: 1, mechanics: [use], grants: {} } });
		expect(load(without.with())).toThrow(/without: declares the decision "pick" but no commit for it/);
		expect(load(stray.with())).toThrow(/stray: commits "pick", which it does not declare as a decision/);
	});

	it("ends the run when a mechanic proposes off its own schema", async () => {
		const host = hostOf({ window: 1, max: 5 });
		await expect(host.playMinute(proposer({ 0: 7 }))).rejects.toThrow(/pot: the proposal of pot.pick does not match its schema \(\/value must be <= 5\)/);
		expect(host.ended?.reason).toBe("error");
	});
});

const player = stubOverseer({
	id: "acme/player",
	summary: "Holds nothing.",
	options: Type.Object({}),
	state: () => undefined,
	events: {},
	prompts: { "p/system": [], "p/input": ["standingOrders"], "p/answer": [] },
	system: "p/system",
	input: "p/input",
	output: Type.Object({}),
	answer: { tool: "answer", description: "p/answer" },
	model: { slot: "default" },
	lifetime: "short",
	triggers: [],
});
