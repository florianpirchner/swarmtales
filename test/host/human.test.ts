/**
 * Audiences, standing orders and the human hand (docs/design/overseer-api.md §4, §5; step 18
 * step 6): `{{standingOrders}}` renders to the empty string without orders and to the orders
 * prompt with them, `orders_applied` before each call that carries orders, lifetimes (until
 * revoked, one call for a long overseer, until a minute), orders that oblige an account, filtered
 * `ctx.log` and event triggers by audience, the story's and the heads' audiences, the human's tools
 * and their refusals, instructions to residents, safe stops with pause, step and resume, a replay
 * of a log with human calls that writes the same log, a snapshot cut with an active order, and
 * decisions still open at the run's end.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { createPromptLookup } from "@swarmtales/prompts";
import { COPY_NOT_ALLOWED, createHost, defineOverseer, INSTRUCTION_EMPTY, INVALID_ARGUMENTS, ORDER_UNKNOWN, RESIDENTS_OFF, RUN_ENDED, TARGET_UNKNOWN, type HostOptions } from "@swarmtales/kernel";
import type { CoreStory, EventEnvelope, Host, HumanHand, OverseerUse, ToolOutcome, Turn, TurnNote, TurnTaker } from "@swarmtales/contracts";
import { checkSnapshotRoundTrip, idleAgent, playStory, scriptedHuman, scriptedOverseer, type OverseerScript } from "@swarmtales/testkit";
import { pot } from "./proof/pot.ts";
import { PROOF_PROMPTS } from "./proof/story.ts";
import { Note, quietWatcher, tally, watcher } from "./proof/tally.ts";

const PROMPTS = createPromptLookup({ mechanics: { watch: PROOF_PROMPTS, long: PROOF_PROMPTS, reader: PROOF_PROMPTS, tally: PROOF_PROMPTS, pot: PROOF_PROMPTS } });

const short = watcher({ triggers: [{ hook: "between" }] });
const long = quietWatcher({ id: "long", lifetime: "long", triggers: [{ hook: "between" }] });

/** Counts the events of one `<source>.<type>` it can read, as the input's `index`; fires in `between` and on every `human_note` it may read. */
const reader = defineOverseer(
	{
		id: "reader",
		summary: "Counts what it may read.",
		options: Type.Object({ counts: Type.String({ description: "The <source>.<type> it counts" }) }),
		state: () => undefined,
		events: {},
		prompts: { "watch/system": [], "watch/input": ["minute", "index", "standingOrders"], "watch/tools/answer": [] },
		system: "watch/system",
		input: "watch/input",
		output: Note,
		answer: { tool: "answer", description: "watch/tools/answer" },
		model: { slot: "reader" },
		lifetime: "short",
		triggers: [{ hook: "between" }, { event: "core", type: "human_note" }],
	},
	() => ({
		calls: (_fired, ctx) => {
			const [source = "", type = ""] = ctx.options.counts.split(".");
			return [{ minute: ctx.minute, index: ctx.log.ofType(source, type).length }];
		},
		fallback: () => undefined,
	}),
);

const HUMAN_GRANTS = ["instruct", "amendDecision", "pause", "resume", "step", "mark"] as const;

function storyOf(extra: Partial<CoreStory> = {}, overseers: readonly OverseerUse[] = [short.as("w-1"), long.as("g-1")]): CoreStory {
	const names = Object.fromEntries(overseers.map((use) => [use.name, ["mark"]]));
	return {
		id: "hand",
		seed: 9,
		minutes: 3,
		residents: 2,
		mechanics: [tally.with(), pot.with({ window: 2 })],
		overseers,
		grants: { resident: ["mark", "poke", "propose"], human: HUMAN_GRANTS, ...names },
		...extra,
	};
}

const ok: OverseerScript = (call) => ({ answer: { note: call.name } });

function options(extra: Partial<HostOptions> = {}, story: CoreStory = storyOf()): HostOptions {
	return { story, prompts: PROMPTS, overseers: scriptedOverseer({ "w-1": ok, "g-1": ok, "r-1": ok, "r-2": ok }), human: true, ...extra };
}

function started(given: HostOptions): Host {
	const host = createHost(given);
	host.start();
	return host;
}

function handOf(host: Host): HumanHand {
	const hand = host.hand();
	if (hand === undefined) throw new Error("no hand");
	return hand;
}

function inputsOf(given: HostOptions, name: string): readonly string[] {
	const runtime = given.overseers;
	if (runtime === undefined || !("asked" in runtime)) throw new Error("no scripted runtime");
	const asked: unknown = runtime.asked;
	if (!Array.isArray(asked)) throw new Error("no record");
	return asked.flatMap((entry: unknown) => (typeof entry === "object" && entry !== null && "call" in entry && typeof entry.call === "object" && entry.call !== null && "name" in entry.call && entry.call.name === name && "input" in entry.call && typeof entry.call.input === "string" ? [entry.call.input] : []));
}

function core(host: Host, type: string): readonly EventEnvelope[] {
	return host.log.ofType("core", type);
}

const ORDERS_HEAD = "\n\nStanding instructions from the human who runs this story:\n";

describe("standing orders", () => {
	it("render {{standingOrders}} as the empty string without orders, and the orders prompt with them", async () => {
		const given = options();
		const host = started(given);
		const sent = handOf(host).instruct({ target: "w-1", text: "be brief" });
		await host.playMinute(idleAgent);
		const note = core(host, "human_note")[0];
		expect(note?.payload).toEqual({ order: note?.seq, target: "w-1", text: "be brief", mode: "advice", lifetime: "untilRevoked", copy: [] });
		expect(await sent).toEqual({ ok: true, reply: `instruction ${String(note?.seq)} sent to w-1` });
		expect(inputsOf(given, "g-1")).toEqual(["Minute 0, call 0."]);
		expect(inputsOf(given, "w-1")).toEqual([`Minute 0, call 0.${ORDERS_HEAD}- Advice ${String(note?.seq)}: be brief`]);
		const applied = core(host, "orders_applied");
		expect(applied.map((event) => event.payload)).toEqual([{ overseer: "w-1", orders: [note?.seq] }]);
		const called = core(host, "overseer_called").find((event) => event.payload !== null && typeof event.payload === "object" && "overseer" in event.payload && event.payload.overseer === "w-1");
		expect(called?.seq).toBe((applied[0]?.seq ?? 0) + 1);
	});

	it("keep a short overseer's order until revoked, a long one's for one call, and an untilMinute order until its minute", async () => {
		const given = options({}, storyOf({ minutes: 4 }));
		const host = started(given);
		const hand = handOf(host);
		void hand.instruct({ target: "w-1", text: "stay" });
		void hand.instruct({ target: "g-1", text: "once" });
		void hand.instruct({ target: "g-1", text: "two minutes", lifetime: { untilMinute: 1 } });
		await host.playMinute(idleAgent);
		const [stay, once, until] = core(host, "human_note").map((event) => event.seq);
		await host.playMinute(idleAgent);
		const revoked = hand.instruct({ target: "w-1", text: "", revoke: stay });
		await host.playMinute(idleAgent);
		expect(await revoked).toEqual({ ok: true, reply: `order ${String(stay)} revoked` });
		await host.playMinute(idleAgent);
		expect(core(host, "orders_applied").map((event) => [event.minute, event.payload])).toEqual([
			[0, { overseer: "w-1", orders: [stay] }],
			[0, { overseer: "g-1", orders: [once, until] }],
			[1, { overseer: "w-1", orders: [stay] }],
			[1, { overseer: "g-1", orders: [until] }],
		]);
		expect(inputsOf(given, "w-1").slice(2)).toEqual(["Minute 2, call 0.", "Minute 3, call 0."]);
	});

	it("oblige an account while an order of mode order is active; the account lands in overseer_answered", async () => {
		const runtime = scriptedOverseer({
			"w-1": (call) => {
				const order = /Order (\d+)/.exec(call.input)?.[1];
				return order === undefined ? { answer: { note: "free" } } : { answer: { note: "obeyed", orders: [{ order: Number(order), followed: false, reason: "too late" }] } };
			},
			"g-1": ok,
		});
		const given = options({ overseers: runtime });
		const host = started(given);
		void handOf(host).instruct({ target: "w-1", text: "stop marking", mode: "order" });
		await host.playMinute(idleAgent);
		const id = core(host, "human_note")[0]?.seq ?? 0;
		expect(runtime.asked[0]?.call.input).toBe(`Minute 0, call 0.${ORDERS_HEAD}- Order ${String(id)} (follow it, or say in your answer why not): stop marking`);
		const schema = runtime.asked[0]?.call.answerSchema;
		expect(schema !== undefined && "properties" in schema && typeof schema.properties === "object" && schema.properties !== null && "orders" in schema.properties).toBe(true);
		expect(runtime.asked[1]?.call.answerSchema).toBe(Note);
		const answered = core(host, "overseer_answered").find((event) => event.actor === "overseer:w-1");
		expect(answered?.payload).toEqual({ overseer: "w-1", ok: true, by: "model", output: { note: "obeyed" }, costUsd: 0, orders: [{ order: id, followed: false, reason: "too late" }] });
		expect(host.log.ofType("watch", "noted")[0]?.payload).toMatchObject({ note: "obeyed" });
		// An order without its account is off the schema: the fallbacks answer.
		const silent = scriptedOverseer({ "w-1": () => ({ answer: { note: "ignored" } }), "g-1": ok });
		const second = started(options({ overseers: silent }));
		void handOf(second).instruct({ target: "w-1", text: "stop", mode: "order" });
		await second.playMinute(idleAgent);
		expect(core(second, "overseer_answered").find((event) => event.actor === "overseer:w-1")?.payload).toMatchObject({ ok: false, by: "fallback" });
	});
});

describe("audiences", () => {
	const readers = [short.as("w-1"), reader.as("r-1", { counts: "core.human_note" }), reader.as("r-2", { counts: "tally.marked" })];

	it("filter an overseer's ctx.log and its event triggers by the note's audience", async () => {
		const given = options({}, storyOf({ minutes: 2 }, readers));
		const host = started(given);
		const hand = handOf(host);
		void hand.instruct({ target: "w-1", text: "for w-1" });
		await host.playMinute(idleAgent);
		void hand.instruct({ target: "r-1", text: "for r-1" });
		await host.playMinute(idleAgent);
		const notes = core(host, "human_note");
		expect(notes.map((event) => event.audience)).toEqual([
			["w-1", "human"],
			["r-1", "human"],
		]);
		// r-1 reads only its own note: none in minute 0, one when its note fires it and in minute 1's between.
		expect(inputsOf(given, "r-1")).toEqual(["Minute 0, call 0.", `Minute 1, call 1.${ORDERS_HEAD}- Advice ${String(notes[1]?.seq)}: for r-1`, `Minute 1, call 1.${ORDERS_HEAD}- Advice ${String(notes[1]?.seq)}: for r-1`]);
		expect(core(host, "overseer_called").filter((event) => event.payload !== null && typeof event.payload === "object" && "trigger" in event.payload && event.payload.trigger === "event:core.human_note").map((event) => event.actor)).toEqual(["overseer:r-1"]);
	});

	it("take the story's audience by <source>.<type> over the head's default, and refuse an unknown name", async () => {
		const marker: TurnTaker = async (turn) => {
			if (turn.resident === "A01") await turn.call("mark", { note: "m" });
		};
		const hidden = options({}, storyOf({ minutes: 1, audiences: { "tally.marked": ["w-1"] } }, readers));
		const { host } = await playStory(hidden, marker);
		expect(host.log.ofType("tally", "marked").map((event) => event.audience)).toEqual([["w-1"]]);
		expect(inputsOf(hidden, "r-2")).toEqual(["Minute 0, call 0."]);
		const open = options({}, storyOf({ minutes: 1 }, readers));
		await playStory(open, marker);
		expect(inputsOf(open, "r-2")).toEqual(["Minute 0, call 1."]);
		const headDefault = watcher({ triggers: [{ hook: "between" }], audiences: { noted: ["human"] } });
		const { host: noted } = await playStory(options({}, storyOf({ minutes: 1 }, [headDefault.as("w-1")])), idleAgent);
		expect(noted.log.ofType("watch", "noted").map((event) => event.audience)).toEqual([["human"]]);
		const overridden = await playStory(options({}, storyOf({ minutes: 1, audiences: { "watch.noted": ["w-1", "human"] } }, [headDefault.as("w-1")])), idleAgent);
		expect(overridden.host.log.ofType("watch", "noted").map((event) => event.audience)).toEqual([["w-1", "human"]]);
		expect(() => createHost(options({}, storyOf({ audiences: { "tally.marked": ["nobody"] } })))).toThrow(/the audience of tally.marked names "nobody"/);
	});
});

describe("the human's tools", () => {
	it("give a hand only when a human is attached; only the human may be granted its tools", () => {
		expect(createHost({ story: storyOf() }).hand()).toBeUndefined();
		expect(createHost({ story: storyOf(), human: false }).hand()).toBeUndefined();
		expect(createHost({ story: storyOf(), human: {} }).hand()).toBeDefined();
		expect(() => createHost({ story: storyOf({ grants: { resident: ["mark", "pause"] } }) })).toThrow(/pause is granted to "resident", but only the human uses it/);
		expect(() => createHost({ story: storyOf({ grants: { "w-1": ["instruct"] } }) })).toThrow(/instruct is granted to "w-1", but only the human uses it/);
	});

	it("refuse unknown targets, residents without the story's switch, copies the story does not allow, unknown orders and empty texts", async () => {
		const host = started(options());
		const instruct = (params: unknown): Promise<ToolOutcome> => host.call("human", "instruct", params);
		const refused = async (params: unknown) => {
			const outcome = await instruct(params);
			return outcome.ok ? "ok" : outcome.code;
		};
		expect(await refused({ target: "nobody", text: "x" })).toBe(TARGET_UNKNOWN);
		expect(await refused({ target: "gamemaker", text: "x" })).toBe(TARGET_UNKNOWN);
		expect(await refused({ target: "A01", text: "x" })).toBe(RESIDENTS_OFF);
		expect(await refused({ target: "w-1", text: "x", copy: ["g-1"] })).toBe(COPY_NOT_ALLOWED);
		expect(await refused({ target: "w-1", text: "x", revoke: 999 })).toBe(ORDER_UNKNOWN);
		expect(await refused({ target: "w-1", text: "  " })).toBe(INSTRUCTION_EMPTY);
		expect(await refused({ target: "w-1", text: "x", mode: "shout" })).toBe(INVALID_ARGUMENTS);
		expect(core(host, "tool_refused").map((event) => event.payload)).toEqual([
			{ tool: "instruct", stage: "rule", code: TARGET_UNKNOWN, detail: "no overseer, gamemaker or resident of this story has that name" },
			{ tool: "instruct", stage: "rule", code: TARGET_UNKNOWN, detail: "no overseer, gamemaker or resident of this story has that name" },
			{ tool: "instruct", stage: "rule", code: RESIDENTS_OFF, detail: "this story does not let the human instruct residents" },
			{ tool: "instruct", stage: "rule", code: COPY_NOT_ALLOWED, detail: "this story does not let the human copy an instruction to others" },
			{ tool: "instruct", stage: "rule", code: ORDER_UNKNOWN, detail: "no active order has that number" },
			{ tool: "instruct", stage: "rule", code: INSTRUCTION_EMPTY, detail: "an instruction needs a text, unless it only revokes an order" },
			{ tool: "instruct", stage: "parse", code: INVALID_ARGUMENTS },
		]);
		expect(core(host, "human_note")).toEqual([]);
		expect((await host.call("gamemaker", "instruct", { target: "w-1", text: "x" })).ok).toBe(false);
	});

	it("copy by the story's copyTo: the gamemaker, or whom the call chooses", async () => {
		const driven = started(options({ between: () => Promise.resolve() }, storyOf({ human: { copyTo: "gamemaker" } })));
		expect((await driven.call("human", "instruct", { target: "w-1", text: "x" })).ok).toBe(true);
		expect((await driven.call("human", "instruct", { target: "gamemaker", text: "y" })).ok).toBe(true);
		expect((await driven.call("human", "instruct", { target: "w-1", text: "z", copy: ["g-1"] })).ok).toBe(false);
		expect(core(driven, "human_note").map((event) => [event.audience, event.payload])).toEqual([
			[["w-1", "gamemaker", "human"], { order: 3, target: "w-1", text: "x", mode: "advice", lifetime: "untilRevoked", copy: ["gamemaker"] }],
			[["gamemaker", "human"], { order: 5, target: "gamemaker", text: "y", mode: "advice", lifetime: { calls: 1 }, copy: [] }],
		]);
		const chooser = started(options({}, storyOf({ human: { copyTo: "choose" } })));
		expect((await chooser.call("human", "instruct", { target: "w-1", text: "x", copy: ["g-1", "g-1"] })).ok).toBe(true);
		expect((await chooser.call("human", "instruct", { target: "w-1", text: "x", copy: ["w-1"] })).ok).toBe(false);
		expect((await chooser.call("human", "instruct", { target: "w-1", text: "x", copy: ["A01"] })).ok).toBe(false);
		expect(core(chooser, "human_note").map((event) => event.audience)).toEqual([["w-1", "g-1", "human"]]);
	});

	it("reach a resident once, in its next turn, as an input of kind human, when the story allows it", async () => {
		const seen: { minute: number; resident: string; human: readonly TurnNote[] }[] = [];
		const agent: TurnTaker = (turn: Turn) => {
			seen.push({ minute: turn.minute, resident: turn.resident, human: turn.inputs.filter((note) => note.kind === "human") });
			return Promise.resolve();
		};
		const host = started(options({}, storyOf({ human: { residents: true }, turns: { activation: "onNews" } })));
		const sent = handOf(host).instruct({ target: "A02", text: "look up" });
		await host.playMinute(agent);
		await host.playMinute(agent);
		expect((await sent).ok).toBe(true);
		expect(core(host, "human_note")[0]?.audience).toEqual(["A02", "human"]);
		// With activation onNews only the instructed resident steps, once.
		expect(seen).toEqual([{ minute: 0, resident: "A02", human: [{ source: "core", kind: "human", text: "A voice from above: look up" }] }]);
	});
});

/** Waits until `ready` holds, a few event-loop turns at a time. */
async function until(ready: () => boolean): Promise<void> {
	for (let tries = 0; !ready(); tries++) {
		if (tries > 200) throw new Error("timed out");
		await new Promise((resolve) => {
			setTimeout(resolve, 1);
		});
	}
}

/** The resident who plays first in minute 0 proposes 3 (a decision the human holds, window 2). */
function proposeOnce(): TurnTaker {
	let proposed = false;
	return async (turn) => {
		if (proposed || turn.minute !== 0) return;
		proposed = true;
		await turn.call("propose", { value: 3 });
	};
}

/** A live run with every kind of human call at safe stops, and the agent that drives it. */
async function liveRun(): Promise<{ readonly events: readonly EventEnvelope[]; readonly host: Host }> {
	const story = storyOf({ minutes: 3, turns: { blockSize: 1 } });
	const host = started(options({}, story));
	const hand = handOf(host);
	const pending: Promise<ToolOutcome>[] = [];
	const propose = proposeOnce();
	const agent: TurnTaker = async (turn) => {
		await propose(turn);
		// Sent inside a turn: it runs at the safe stop after this block.
		if (turn.minute === 1) pending.push(hand.instruct({ target: "w-1", text: `from ${turn.resident}` }));
	};
	const turns = (): number => core(host, "turn_started").length;
	pending.push(hand.pause());
	const playing = host.playMinute(agent);
	expect((await pending[0])?.ok).toBe(true);
	expect(turns()).toBe(0);
	pending.push(hand.step());
	await until(() => turns() === 1 && core(host, "decision_proposed").length === 1);
	const decision = core(host, "decision_proposed")[0]?.seq;
	const amend = hand.amendDecision({ decision, proposal: { value: 4 }, reason: "four" });
	const instruct = hand.instruct({ target: "g-1", text: "while halted" });
	await until(() => core(host, "human_note").length === 1);
	expect(turns()).toBe(1);
	pending.push(amend, instruct, hand.resume());
	await playing;
	await host.playMinute(agent);
	await host.playMinute(agent);
	expect((await Promise.all(pending)).map((outcome) => outcome.ok)).toEqual(Array.from({ length: pending.length }, () => true));
	return { events: host.log.all(), host };
}

describe("safe stops", () => {
	it("halt before a block while paused, play one block per step, run calls while halted, and log only tool_called for pause, step and resume", async () => {
		const { events, host } = await liveRun();
		const human = events.filter((event) => event.actor === "human");
		expect(human.filter((event) => event.type === "tool_called").map((event) => event.payload !== null && typeof event.payload === "object" && "tool" in event.payload ? event.payload.tool : "")).toEqual(["pause", "step", "amendDecision", "instruct", "resume", "instruct", "instruct"]);
		expect(human.map((event) => event.type)).toEqual(["tool_called", "tool_called", "tool_called", "human_amend", "tool_called", "human_note", "tool_called", "tool_called", "human_note", "tool_called", "human_note"]);
		// The two instructions sent inside minute 1's turns landed after their blocks: one before the second block's turn, one after it.
		const [, first, second] = core(host, "human_note");
		const secondTurn = core(host, "turn_started").filter((event) => event.minute === 1)[1];
		expect([first?.minute, second?.minute]).toEqual([1, 1]);
		expect((first?.seq ?? 0) < (secondTurn?.seq ?? 0) && (secondTurn?.seq ?? 0) < (second?.seq ?? 0)).toBe(true);
		expect(core(host, "decision_settled")[0]?.payload).toMatchObject({ changed: true, by: "human", proposal: { value: 4 } });
		expect(host.ended?.reason).toBe("minutes");
	});

	it("halt in the between slot too while paused, before the overseers' between calls", async () => {
		const host = started(options({}, storyOf({ minutes: 2, turns: { blockSize: 2 } })));
		const hand = handOf(host);
		const paused = hand.pause();
		let done = false;
		const playing = host.playMinute(idleAgent).then(() => {
			done = true;
		});
		expect((await paused).ok).toBe(true);
		expect((await hand.step()).ok).toBe(true);
		await until(() => core(host, "turn_started").length === 2);
		await new Promise((resolve) => {
			setTimeout(resolve, 20);
		});
		expect(done).toBe(false);
		expect([core(host, "minute_ended").length, core(host, "overseer_called").length]).toEqual([0, 0]);
		expect((await hand.resume()).ok).toBe(true);
		await playing;
		expect(core(host, "overseer_called").map((event) => event.minute)).toEqual([0, 0]);
	});

	it("give calls that never reached a safe stop RUN_ENDED once the run ends", async () => {
		const host = started(options({}, storyOf({ minutes: 1 })));
		await host.run(idleAgent);
		expect(await handOf(host).pause()).toEqual({ ok: false, code: RUN_ENDED });
	});
});

describe("a replay of a log with human calls", () => {
	it("gives the same log", async () => {
		const live = await liveRun();
		const story = storyOf({ minutes: 3, turns: { blockSize: 1 } });
		const replayed = await playStory(options({ human: scriptedHuman(live.events) }, story), proposeOnce());
		expect(JSON.stringify(replayed.events)).toBe(JSON.stringify(live.events));
	});

	it("survives a snapshot cut with an active order and an open decision", async () => {
		const live = await liveRun();
		const story = storyOf({ minutes: 3, turns: { blockSize: 1 } });
		const agent = (): TurnTaker => proposeOnce();
		const fresh = (): HostOptions => options({ human: scriptedHuman(live.events) }, story);
		const cut = createHost(fresh());
		cut.start();
		const played = agent();
		await cut.playMinute(played);
		await cut.playMinute(played);
		const snapshot = cut.snapshot();
		expect(snapshot.orders?.map((order) => order.target)).toEqual(["w-1", "w-1"]);
		expect(snapshot.decisions?.length).toBe(1);
		for (const minutes of [1, 2]) expect(await checkSnapshotRoundTrip(fresh, agent, minutes)).toEqual([]);
	});
});

describe("decisions still open when the run ends", () => {
	it("settle at runEnded with their original proposal, the amendments listed, before the runEnded hooks", async () => {
		const story = storyOf({ minutes: 2, mechanics: [tally.with(), pot.with({ window: 5 })] });
		const host = started(options({}, story));
		await host.playMinute(async (turn) => {
			if (turn.resident === "A01") await turn.call("propose", { value: 2 });
		});
		const decision = core(host, "decision_proposed")[0]?.seq ?? 0;
		const amended = await host.call("human", "amendDecision", { decision, proposal: { value: 5 }, reason: "five" });
		expect(amended.ok).toBe(true);
		await host.playMinute(idleAgent);
		const settled = core(host, "decision_settled")[0];
		const amendment = core(host, "tool_called").find((event) => event.actor === "human")?.seq;
		expect(settled?.payload).toEqual({ decision, kind: "pot.pick", changed: false, proposal: { value: 2 }, amendments: [{ by: "human", seq: amendment }] });
		expect(host.log.ofType("pot", "picked").map((event) => event.payload)).toEqual([{ value: 2, minute: 2, changed: false, decision }]);
		const tail = host.log.all().slice(-4).map((event) => event.type);
		expect(tail).toEqual(["decision_settled", "picked", "closing", "run_ended"]);
		const snapshot = host.snapshot();
		expect(snapshot.decisions).toBeUndefined();
		expect(snapshot.jobs.filter((job) => job.owner === "core")).toEqual([]);
	});

	it("settle on a stop between minutes too", async () => {
		const host = started(options({}, storyOf({ minutes: 5, mechanics: [tally.with(), pot.with({ window: 5 })] })));
		await host.playMinute(async (turn) => {
			if (turn.resident === "A01") await turn.call("propose", { value: 1 });
		});
		host.stop("enough");
		expect(core(host, "decision_settled")[0]?.payload).toMatchObject({ changed: false, proposal: { value: 1 } });
		expect(host.ended?.reason).toBe("stopped");
	});
});
