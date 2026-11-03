/**
 * Overseer scheduling (docs/design/overseer-api.md §1.3, step 18 step 5) with the testkit's
 * `scriptedOverseer`: the slots (minuteStarted, between, runEnded) and their order, schedules and
 * facts, event triggers right after the call that wrote the event, nested world-tool calls,
 * parallel requests whose results land in a fixed order whatever the models' speed, fail open
 * (fallback slot, body fallback, no runtime), the limits, the consult trigger, the load errors,
 * and that a story without overseers logs exactly what it logged before.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { createHost, defineMechanic, defineOverseer, type HostOptions } from "@swarmtales/kernel";
import type { CoreStory, EventEnvelope, Host, OverseerLimits, OverseerUse, RoleCaller, Turn, TurnTaker } from "@swarmtales/contracts";
import { checkDeterminism, checkSnapshotRoundTrip, idleAgent, playStory, scriptedAgent, scriptedOverseer, type CallRecord, type OverseerScript } from "@swarmtales/testkit";
import { proofAgent, proofOptions } from "./proof/story.ts";
import { quietWatcher, TallyEvents, tally, Verdict, watcher, type WatcherSpec } from "./proof/tally.ts";

function storyOf(overseers: readonly OverseerUse[], extra: Partial<CoreStory> = {}): CoreStory {
	const names = Object.fromEntries(overseers.map((use) => [use.name, ["mark", "poke"]]));
	return { id: "watch", seed: 5, minutes: 3, residents: 2, mechanics: [tally.with()], overseers, grants: { resident: ["mark", "poke", "accuse"], ...names }, ...extra };
}

const answer = (note: string, extra: Partial<{ calls: readonly { tool: string; params: unknown }[]; costUsd: number; delayMs: number }> = {}) => ({ answer: { note }, ...extra });

/** Always answers `note`. */
const always = (note: string): OverseerScript => () => answer(note);

/** The events a test looks at, as short lines. */
const WATCHED = new Set(["overseer_called", "overseer_answered", "overseer_skipped", "noted", "marked", "poked", "started", "ended", "closing", "minute_started", "minute_ended", "run_ended", "role_asked", "role_answered", "judged"]);

function line(event: EventEnvelope): string {
	const payload = event.payload;
	const field = (name: string): string => {
		if (typeof payload !== "object" || payload === null) return "";
		const found: unknown = Object.entries(payload).find(([key]) => key === name)?.[1];
		return found === undefined ? "" : JSON.stringify(found);
	};
	switch (event.type) {
		case "overseer_called":
			return `${String(event.minute)} called ${field("overseer")} ${field("trigger")} ${field("index")}`;
		case "overseer_answered":
			return `${String(event.minute)} answered ${field("overseer")} ${field("by")} ${field("output")}${field("error") === "" ? "" : ` ${field("error")}`}`;
		case "overseer_skipped":
			return `${String(event.minute)} skipped ${field("overseer")} ${field("reason")}`;
		case "noted":
			return `${String(event.minute)} noted ${field("note")} ${field("index")} ${field("seen")}`;
		case "marked":
			return `${String(event.minute)} marked ${event.actor} ${field("note")}`;
		case "poked":
			return `${String(event.minute)} poked ${event.actor}`;
		default:
			return `${String(event.minute)} ${event.type}`;
	}
}

function lines(events: readonly EventEnvelope[]): readonly string[] {
	return events.filter((event) => WATCHED.has(event.type)).map(line);
}

async function run(options: HostOptions, agent: TurnTaker = idleAgent): Promise<{ readonly host: Host; readonly events: readonly EventEnvelope[] }> {
	return playStory(options, agent);
}

function use(spec: WatcherSpec, name = "w-1", options: { readonly tag?: string; readonly limits?: OverseerLimits } = {}): OverseerUse {
	return watcher(spec).as(name, { ...(options.tag === undefined ? {} : { tag: options.tag }), ...(options.limits === undefined ? {} : { limits: options.limits }) });
}

/** The first resident (in the story's order) pokes once per turn; the others do nothing. */
const poker: TurnTaker = async (turn: Turn) => {
	if (turn.resident === "A01") await turn.call("poke", {});
};

describe("a story without overseers", () => {
	it("logs what it logged before, with or without a runtime", async () => {
		const plain = await playStory(proofOptions(), proofAgent());
		const runtime = scriptedOverseer({});
		const withRuntime = await playStory({ ...proofOptions(), overseers: runtime }, proofAgent());
		const none = await playStory({ ...proofOptions(), story: { ...proofOptions().story, overseers: [] } }, proofAgent());
		expect(JSON.stringify(withRuntime.events)).toBe(JSON.stringify(plain.events));
		expect(JSON.stringify(none.events)).toBe(JSON.stringify(plain.events));
		expect(runtime.asked).toEqual([]);
		expect(JSON.stringify(withRuntime.host.snapshot())).toBe(JSON.stringify(plain.host.snapshot()));
	});
});

describe("slots", () => {
	it("runs a between overseer after minuteEnded and before minute_ended, its answer settled, then the app's between", async () => {
		const between: number[] = [];
		const { events } = await run({
			story: storyOf([use({ triggers: [{ hook: "between" }] })], { minutes: 1 }),
			overseers: scriptedOverseer({ "w-1": always("seen") }),
			between: (minute) => {
				between.push(minute);
				return Promise.resolve();
			},
		});
		expect(lines(events)).toEqual(["0 minute_started", "0 started", "0 ended", '0 called "w-1" "hook:between" 0', '0 answered "w-1" "model" {"note":"seen"}', '0 noted "seen" 0 1', "0 minute_ended", "1 closing", "1 run_ended"]);
		expect(between).toEqual([0]);
		const called = events.find((event) => event.type === "overseer_called");
		const answered = events.find((event) => event.type === "overseer_answered");
		const noted = events.find((event) => event.type === "noted");
		expect(called?.actor).toBe("overseer:w-1");
		expect(answered?.causedBy).toBe(called?.seq);
		expect(noted?.causedBy).toBe(answered?.seq);
		expect(noted?.source).toBe("watch");
	});

	it("runs minuteStarted overseers after the mechanics' phases and runEnded ones before run_ended", async () => {
		const { events } = await run({
			story: storyOf([use({ triggers: [{ hook: "minuteStarted" }, { hook: "runEnded" }] })], { minutes: 1 }),
			overseers: scriptedOverseer({ "w-1": always("x") }),
		});
		expect(lines(events)).toEqual([
			"0 minute_started",
			"0 started",
			'0 called "w-1" "hook:minuteStarted" 0',
			'0 answered "w-1" "model" {"note":"x"}',
			'0 noted "x" 0 1',
			"0 ended",
			"0 minute_ended",
			"1 closing",
			'1 called "w-1" "hook:runEnded" 0',
			'1 answered "w-1" "model" {"note":"x"}',
			'1 noted "x" 0 2',
			"1 run_ended",
		]);
	});

	it("sorts a slot by order, ties in the story's order, each firing to its end before the next", async () => {
		const story = storyOf(
			[quietWatcher({ id: "late", triggers: [{ hook: "between", order: 20 }] }).as("late"), quietWatcher({ id: "early-b", triggers: [{ hook: "between", order: 10 }] }).as("b"), use({ triggers: [{ hook: "between", order: 10 }] }, "a")],
			{ minutes: 1 },
		);
		const runtime = scriptedOverseer({ late: [answer("late")], b: [answer("b", { delayMs: 20 })], a: [answer("a")] });
		const { events } = await run({ story, overseers: runtime });
		expect(lines(events).filter((entry) => entry.includes("called") || entry.includes("answered"))).toEqual([
			'0 called "b" "hook:between" 0',
			'0 answered "b" "model" {"note":"b"}',
			'0 called "a" "hook:between" 0',
			'0 answered "a" "model" {"note":"a"}',
			'0 called "late" "hook:between" 0',
			'0 answered "late" "model" {"note":"late"}',
		]);
	});

	it("fires a schedule at start, start + every, ... in the between slot", async () => {
		const { events } = await run({ story: storyOf([use({ triggers: [{ schedule: { every: 2, start: 1 } }] })], { minutes: 6 }), overseers: scriptedOverseer({ "w-1": always("tick") }) });
		expect(events.filter((event) => event.type === "overseer_called").map((event) => event.minute)).toEqual([1, 3, 5]);
		const plain = await run({ story: storyOf([use({ triggers: [{ schedule: { every: 3 } }] })], { minutes: 6 }), overseers: scriptedOverseer({ "w-1": always("tick") }) });
		expect(plain.events.filter((event) => event.type === "overseer_called").map((event) => event.minute)).toEqual([0, 3]);
	});

	it("fires a fact trigger in the between slot whenever its condition holds", async () => {
		const spec: WatcherSpec = { triggers: [{ fact: "tally.count", when: (value: unknown) => typeof value === "number" && value >= 2 }] };
		const { events } = await run({ story: storyOf([use(spec)], { minutes: 4 }), overseers: scriptedOverseer({ "w-1": always("two") }) }, poker);
		// A01 pokes once a minute, which marks nothing; the count only grows by marks.
		expect(events.filter((event) => event.type === "overseer_called")).toEqual([]);
		const marker: TurnTaker = async (turn) => {
			if (turn.resident === "A01") await turn.call("mark", { note: "m" });
		};
		const marked = await run({ story: storyOf([use(spec)], { minutes: 4 }), overseers: scriptedOverseer({ "w-1": always("two") }) }, marker);
		const fired = marked.events.filter((event) => event.type === "overseer_called");
		expect(fired.map((event) => event.minute)).toEqual([1, 2, 3]);
		expect(fired[0]?.payload).toEqual({ overseer: "w-1", trigger: "fact:tally.count", index: 0 });
	});

	it("makes several calls per firing, indexed, all called before any answer", async () => {
		const runtime = scriptedOverseer({ "w-1": (call) => answer(call.input.includes('"index":0') ? "first" : "second", { delayMs: call.input.includes('"index":0') ? 25 : 0 }) });
		const { events } = await run({ story: storyOf([use({ triggers: [{ hook: "between" }], calls: () => 2 })], { minutes: 1 }), overseers: runtime });
		expect(lines(events).filter((entry) => /called|answered|noted/.test(entry))).toEqual([
			'0 called "w-1" "hook:between" 0',
			'0 called "w-1" "hook:between" 1',
			'0 answered "w-1" "model" {"note":"first"}',
			'0 noted "first" 0 1',
			'0 answered "w-1" "model" {"note":"second"}',
			'0 noted "second" 1 2',
		]);
		expect(runtime.asked.map((asked) => asked.call.slot)).toEqual(["watcher", "watcher"]);
	});
});

describe("event triggers and nested calls", () => {
	const onPoke: WatcherSpec = { triggers: [{ event: TallyEvents, type: "poked", when: (payload: unknown) => typeof payload === "object" && payload !== null && "resident" in payload && payload.resident === "A01" }] };

	it("run right after the call that wrote the event, their world tools nested, before the next call", async () => {
		const story = storyOf([use(onPoke)], { minutes: 1, residents: 1 });
		const agent: TurnTaker = async (turn) => {
			await turn.call("poke", {});
			await turn.call("mark", { note: "after" });
		};
		const marking = scriptedOverseer({ "w-1": () => answer("p", { calls: [{ tool: "mark", params: { note: "seen a poke" } }] }) });
		const { events } = await run({ story, overseers: marking }, agent);
		const relevant = lines(events).filter((entry) => /poked|called|answered|marked|noted/.test(entry));
		expect(relevant).toEqual([
			"0 poked resident:A01",
			'0 called "w-1" "event:tally.poked" 0',
			'0 marked overseer:w-1 "seen a poke"',
			'0 answered "w-1" "model" {"note":"p"}',
			'0 noted "p" 0 1',
			'0 marked resident:A01 "after"',
		]);
		const poked = events.find((event) => event.type === "poked");
		const called = events.find((event) => event.type === "overseer_called");
		const toolCall = events.find((event) => event.type === "tool_called" && event.actor === "overseer:w-1");
		expect(called?.causedBy).toBe(poked?.seq);
		expect(toolCall?.causedBy).toBe(called?.seq);
		expect(marking.asked[0]?.outcomes).toEqual([{ ok: true, reply: "marked 1" }]);
		expect(marking.asked[0]?.call.tools.map((tool) => tool.name)).toEqual(["mark", "poke"]);
	});

	it("fire only for events their when accepts", async () => {
		const story = storyOf([use(onPoke)], { minutes: 1, residents: 2 });
		const everyone: TurnTaker = async (turn) => {
			await turn.call("poke", {});
		};
		const { events } = await run({ story, overseers: scriptedOverseer({ "w-1": always("p") }) }, everyone);
		expect(lines(events).filter((entry) => /poked|called/.test(entry))).toEqual(["0 poked resident:A02", "0 poked resident:A01", '0 called "w-1" "event:tally.poked" 0']);
	});

	it("start the requests of one event at once and apply the answers in story order, whatever the models' speed", async () => {
		const both = [use(onPoke, "a"), quietWatcher({ ...onPoke, id: "watch-b" }).as("b")];
		const story = storyOf(both, { minutes: 1, residents: 1 });
		const script = (slow: "a" | "b") => ({
			a: [answer("a", { delayMs: slow === "a" ? 30 : 0, calls: [{ tool: "mark", params: { note: "by a" } }] })],
			b: [answer("b", { delayMs: slow === "b" ? 30 : 0, calls: [{ tool: "mark", params: { note: "by b" } }] })],
		});
		const slowA = await run({ story, overseers: scriptedOverseer(script("a")) }, poker);
		const slowB = await run({ story, overseers: scriptedOverseer(script("b")) }, poker);
		expect(JSON.stringify(slowA.events)).toBe(JSON.stringify(slowB.events));
		expect(lines(slowA.events).filter((entry) => /called|answered|marked/.test(entry))).toEqual([
			'0 called "a" "event:tally.poked" 0',
			'0 called "b" "event:tally.poked" 0',
			'0 marked overseer:a "by a"',
			'0 answered "a" "model" {"note":"a"}',
			'0 marked overseer:b "by b"',
			'0 answered "b" "model" {"note":"b"}',
		]);
	});

	it("queue what an overseer's own events trigger for the next round", async () => {
		// "watch" is the first overseer's definition id, so its events are known; the chained one notes with source "chain".
		const chained = quietWatcher({ id: "chain", triggers: [{ event: { id: "watch", events: {} }, type: "noted", when: (_payload, self) => self === "c-1" }] });
		const story = storyOf([use(onPoke), chained.as("c-1")], { minutes: 1, residents: 1 });
		const { events } = await run({ story, overseers: scriptedOverseer({ "w-1": always("first"), "c-1": always("second") }) }, poker);
		expect(lines(events).filter((entry) => /called|noted|answered/.test(entry))).toEqual([
			'0 called "w-1" "event:tally.poked" 0',
			'0 answered "w-1" "model" {"note":"first"}',
			'0 noted "first" 0 1',
			'0 called "c-1" "event:watch.noted" 0',
			'0 answered "c-1" "model" {"note":"second"}',
		]);
	});

	it("stop a trigger loop at the round cap", async () => {
		const loop = watcher({ id: "watch", triggers: [{ event: { id: "watch", events: {} }, type: "noted" }, { hook: "between" }], fallback: { note: "again" } });
		const host = createHost({ story: storyOf([loop.as("w-1")], { minutes: 1 }) });
		host.start();
		await expect(host.playMinute(idleAgent)).rejects.toThrow(/more than 1000 rounds of event triggers/);
		expect(host.ended?.reason).toBe("error");
	});
});

describe("fail open", () => {
	const between: WatcherSpec = { triggers: [{ hook: "between" }], model: { slot: "watcher", fallback: "cheap" }, fallback: { note: "body" } };

	it("tries the fallback slot, then the body's fallback; never refuses, never ends the run", async () => {
		const runtime = scriptedOverseer({
			"w-1": (call, n) => {
				if (n === 0) return { error: "overloaded" };
				if (n === 1) return answer("cheap");
				if (n === 2) return { answer: { wrong: 1 } };
				if (n === 3) return { throws: "socket closed" };
				return undefined;
			},
		});
		const { events, host } = await run({ story: storyOf([use(between)], { minutes: 3 }), overseers: runtime });
		expect(lines(events).filter((entry) => entry.includes("answered"))).toEqual([
			'0 answered "w-1" "fallback-model" {"note":"cheap"}',
			'1 answered "w-1" "fallback" {"note":"body"} "socket closed"',
			'2 answered "w-1" "fallback" {"note":"body"} "no script"',
		]);
		expect(runtime.asked.map((asked) => asked.call.slot)).toEqual(["watcher", "cheap", "watcher", "cheap", "watcher", "cheap"]);
		expect(host.ended?.reason).toBe("minutes");
		expect(events.filter((event) => event.type === "overseer_answered")[1]?.payload).toMatchObject({ ok: false, by: "fallback" });
	});

	it("names the schema error of an answer off its schema", async () => {
		const runtime = scriptedOverseer({ "w-1": [{ answer: { wrong: 1 } }] });
		const { events } = await run({ story: storyOf([use({ triggers: [{ hook: "between" }] })], { minutes: 1 }), overseers: runtime });
		const answered = events.find((event) => event.type === "overseer_answered");
		expect(answered?.payload).toEqual({ overseer: "w-1", ok: false, by: "fallback", error: "the answer does not match its schema (/ must have required properties note)", costUsd: 0 });
		expect(events.some((event) => event.type === "noted")).toBe(false);
	});

	it("answers through the body's fallback without a runtime (by none)", async () => {
		const { events } = await run({ story: storyOf([use(between)], { minutes: 1 }) });
		expect(lines(events).filter((entry) => /answered|noted/.test(entry))).toEqual(['0 answered "w-1" "none" {"note":"body"}', '0 noted "body" 0 1']);
		const silent = await run({ story: storyOf([use({ triggers: [{ hook: "between" }] })], { minutes: 1 }) });
		expect(silent.events.find((event) => event.type === "overseer_answered")?.payload).toEqual({ overseer: "w-1", ok: false, by: "none", costUsd: 0 });
	});

	it("ends the run when the overseer's own code throws", async () => {
		const host = createHost({ story: storyOf([use({ triggers: [{ hook: "between" }], throwsAt: 1 })], { minutes: 3 }), overseers: scriptedOverseer({ "w-1": always("x") }) });
		host.start();
		await host.playMinute(idleAgent);
		await expect(host.playMinute(idleAgent)).rejects.toThrow(/watch: broken/);
		expect(host.ended?.reason).toBe("error");
		expect(host.log.all().at(-1)?.payload).toEqual({ reason: "error", detail: "watch: broken" });
	});
});

describe("limits", () => {
	it("skips calls over maxCalls, the story's limit tightening the head's", async () => {
		// The body's calls() is not asked once the limit is reached (minute 2).
		const asked: number[] = [];
		const spec: WatcherSpec = {
			triggers: [{ hook: "between" }],
			calls: (_fired, minute) => {
				asked.push(minute);
				return 2;
			},
			limits: { maxCalls: 5 },
		};
		const { events } = await run({ story: storyOf([use(spec, "w-1", { limits: { maxCalls: 3 } })], { minutes: 3 }), overseers: scriptedOverseer({ "w-1": always("x") }) });
		expect(lines(events).filter((entry) => /called|skipped/.test(entry))).toEqual([
			'0 called "w-1" "hook:between" 0',
			'0 called "w-1" "hook:between" 1',
			'1 skipped "w-1" "maxCalls"',
			'1 called "w-1" "hook:between" 0',
			'2 skipped "w-1" "maxCalls"',
		]);
		expect(asked).toEqual([0, 1]);
	});

	it("skips once the cost reached maxCostUsd and records every cost with the referee", async () => {
		const spec: WatcherSpec = { triggers: [{ hook: "between" }], limits: { maxCostUsd: 0.05 } };
		const runtime = scriptedOverseer({ "w-1": () => answer("x", { costUsd: 0.03 }) });
		const { events } = await run({ story: storyOf([use(spec)], { minutes: 4, limits: { maxCostUsd: 1 } }), overseers: runtime });
		expect(lines(events).filter((entry) => /called|skipped/.test(entry))).toEqual(['0 called "w-1" "hook:between" 0', '1 called "w-1" "hook:between" 0', '2 skipped "w-1" "maxCostUsd"', '3 skipped "w-1" "maxCostUsd"']);
		const capped = await run({ story: storyOf([use({ triggers: [{ hook: "between" }] })], { minutes: 4, limits: { maxCostUsd: 0.05 } }), overseers: scriptedOverseer({ "w-1": () => answer("x", { costUsd: 0.03 }) }) });
		expect(capped.host.ended).toEqual({ reason: "referee", minute: 2, limit: "core.maxCostUsd" });
	});

	it("runs the calls of a cost-capped overseer one after the other and stops at the cap (F2 M1)", async () => {
		// Five calls in one firing, 0.03 USD each, a 0.05 cap: two calls are made (the second reaches the cap), not five.
		const spec: WatcherSpec = { triggers: [{ hook: "between" }], calls: () => 5, limits: { maxCostUsd: 0.05 } };
		const runtime = scriptedOverseer({ "w-1": () => answer("x", { costUsd: 0.03 }) });
		const { events } = await run({ story: storyOf([use(spec)], { minutes: 2, limits: { maxCostUsd: 1 } }), overseers: runtime });
		expect(lines(events).filter((entry) => /called|skipped/.test(entry))).toEqual(['0 called "w-1" "hook:between" 0', '0 called "w-1" "hook:between" 1', '0 skipped "w-1" "maxCostUsd"', '1 skipped "w-1" "maxCostUsd"']);
		const spent = events.filter((event) => event.type === "overseer_answered").length;
		expect(spent).toBe(2);
	});
});

describe("the consult trigger", () => {
	const judge = (fallback?: { readonly note: string }) =>
		watcher({ id: "judge-def", triggers: [{ consult: true }], ...(fallback === undefined ? {} : { fallback }) });

	it("refuses an overseer whose output is not the tool's answer schema", () => {
		expect(() => createHost({ story: storyOf([judge().as("judge")], { minutes: 1 }) })).toThrow(/answers tally's accuse with another schema object/);
	});

	it("answers a tool's consult with role_asked and role_answered instead of overseer_called and overseer_answered", async () => {
		// The judge answers in the tool's own schema: the very Verdict object.
		const court = defineOverseer(
			{
				id: "court",
				summary: "Judges claims.",
				options: Type.Object({}),
				state: () => undefined,
				events: { ruled: Type.Object({ upheld: Type.Boolean() }) },
				prompts: { "court/system": [], "court/claim": ["claim", "standingOrders"], "court/tools/verdict": [] },
				system: "court/system",
				input: "court/claim",
				output: Verdict,
				answer: { tool: "verdict", description: "court/tools/verdict" },
				model: { slot: "classifier" },
				lifetime: "short",
				triggers: [{ consult: true }],
			},
			() => ({
				calls: (fired) => (fired.kind === "consult" && typeof fired.question === "object" && fired.question !== null && "claim" in fired.question && typeof fired.question.claim === "number" ? [{ claim: fired.question.claim }] : []),
				settle: (output, _call, ctx) => {
					ctx.emit("ruled", { upheld: output.upheld });
				},
				fallback: () => undefined,
			}),
		);
		let rolesSeen: boolean | undefined;
		const probe = defineMechanic(
			{ id: "probe", summary: "Reads ctx.roles.", options: Type.Object({}), state: () => undefined, events: {} },
			() => ({
				hooks: {
					runStarted: (ctx) => {
						rolesSeen = ctx.roles.has("judge");
					},
				},
			}),
		);
		const story = storyOf([court.as("judge")], { minutes: 1, residents: 1, mechanics: [tally.with(), probe.with()] });
		const runtime = scriptedOverseer({ judge: [{ answer: { upheld: true }, costUsd: 0.01 }, { error: "down" }] });
		const record: CallRecord[] = [];
		const agent = scriptedAgent(() => [{ tool: "accuse", params: { claim: 4 } }, { tool: "accuse", params: { claim: 5 } }], record);
		const { events } = await run({ story, overseers: runtime }, agent);
		expect(rolesSeen).toBe(true);
		expect(events.some((event) => event.type === "overseer_called" || event.type === "overseer_answered")).toBe(false);
		expect(events.filter((event) => event.type === "role_asked" || event.type === "role_answered" || event.type === "ruled" || event.type === "judged").map((event) => [event.type, event.payload])).toEqual([
			["role_asked", { role: "judge", tool: "accuse", question: { claim: 4 } }],
			["role_answered", { role: "judge", ok: true, answer: { upheld: true }, costUsd: 0.01 }],
			["ruled", { upheld: true }],
			["judged", { verdict: "upheld" }],
			["role_asked", { role: "judge", tool: "accuse", question: { claim: 5 } }],
			["role_answered", { role: "judge", ok: false, error: "down", costUsd: 0 }],
			["judged", { verdict: "failed: down" }],
		]);
		expect(runtime.asked.map((asked) => asked.call.input)).toEqual(['court/claim {"claim":4,"standingOrders":""}', 'court/claim {"claim":5,"standingOrders":""}']);
		const caller: RoleCaller = { ask: () => Promise.resolve({ ok: true, answer: { upheld: false }, costUsd: 0 }) };
		expect(() => createHost({ story, roles: { judge: caller } })).toThrow(/served by the overseer court and by the app's role caller/);
	});
});

describe("load errors", () => {
	it("refuse a trigger on an unknown fact or event and a bad schedule", () => {
		expect(() => createHost({ story: storyOf([use({ triggers: [{ fact: "tally.nothing", when: () => true }] })]) })).toThrow(/triggers on the fact tally.nothing, which no loaded mechanic computes/);
		expect(() => createHost({ story: storyOf([use({ triggers: [{ event: TallyEvents, type: "nothing" }] })]) })).toThrow(/triggers on tally.nothing/);
		expect(() => createHost({ story: storyOf([use({ triggers: [{ event: "core", type: "nothing" }] })]) })).toThrow(/triggers on core.nothing/);
		expect(() => createHost({ story: storyOf([use({ triggers: [{ schedule: { every: 0 } }] })]) })).toThrow(/invalid schedule every 0/);
		expect(() => watcher({ triggers: [] }).parseOptions({ tag: 3 })).toThrow(/watch: the options do not match the schema/);
	});
});

describe("conformance of a story with overseers", () => {
	const spec: WatcherSpec = { triggers: [{ hook: "between" }, { event: TallyEvents, type: "poked" }] };
	/** Answers from the call alone (a resumed run's runtime starts fresh): the minute in the input, a mark in even minutes. */
	const byMinute: OverseerScript = (call) => {
		const minute = Number(/"minute":(\d+)/.exec(call.input)?.[1] ?? "-1");
		return answer(`m${String(minute)}`, { costUsd: 0.001, calls: minute % 2 === 0 ? [{ tool: "mark", params: { note: "x" } }] : [] });
	};
	const options = (): HostOptions => ({ story: storyOf([use(spec, "w-1", { tag: "#" })], { minutes: 5 }), overseers: scriptedOverseer({ "w-1": byMinute }) });

	it("gives the same events for the same seed and survives a snapshot round trip with the overseer's state and usage", async () => {
		expect(await checkDeterminism(options, () => poker)).toEqual([]);
		for (const cut of [1, 2, 4]) expect(await checkSnapshotRoundTrip(options, () => poker, cut)).toEqual([]);
	});

	it("writes the overseer's usage and slice into the snapshot only once it was called", async () => {
		const host = createHost(options());
		host.start();
		expect(host.snapshot().overseers).toEqual({ "w-1": { calls: 0, costUsd: 0, slice: { version: 1, data: { seen: 0 } } } });
		await host.playMinute(poker);
		expect(host.snapshot().overseers?.["w-1"]).toEqual({ calls: 2, costUsd: 0.002, slice: { version: 1, data: { seen: 2 } } });
	});
});
