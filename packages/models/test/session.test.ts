// SPDX-License-Identifier: Apache-2.0
/**
 * The resident session (M2 spec 4.2 to 4.4): one turn of one resident against the scripted source, in runs played
 * by the testkit under the `turns` scheduler. No request leaves the process: the global `fetch` rejects.
 *
 * Stand-in (`interface-change`, see the report of M2-09): `play` of the testkit takes neither a record source nor
 * kernel ports, so the kernel of these runs declares no record and has no external limit. `Activation.record` is
 * replaced here by a list that keeps the log length at the moment of each record; `call` is the kernel's own.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StreamFn } from "@earendil-works/pi-agent-core";
import { createAssistantMessageEventStream, type SimpleStreamOptions, type TranscriptContext } from "@earendil-works/pi-ai";
import type { Activation, ActorId, DriverResult, DriverTable, Envelope, GameData, InputNote, Kernel, Redact } from "@swarmtales/contracts";
import { guessNumber, play, type Played } from "@swarmtales/testkit";
import { createResidentSession, outcomeText, type ResidentSession } from "../src/driver/session.ts";
import { createCostMeter, type CostMeter } from "../src/meter.ts";
import { RESIDENT_RECORDS } from "../src/records.ts";
import { act, fail, say, scriptedSource, type Script, type ScriptStep } from "../src/scripted.ts";
import type { ModelBinding } from "../src/source.ts";

interface Rec {
	readonly actor: ActorId;
	readonly tick: number;
	readonly type: string;
	readonly payload: unknown;
	/** The length of the kernel's log when the record was written. */
	readonly at: number;
}
interface Setup {
	readonly residents?: number;
	readonly ticks?: number;
	readonly blockSize?: number;
	readonly capUsd?: number;
	readonly redact?: Redact;
	/** The cost every answer is given; the scripted model has no price. */
	readonly usd?: number;
	/** The texts after the inputs; a line per tick (ticks count from 0) when left out (guess-number shows no input line). */
	readonly notice?: (activation: Activation) => readonly string[];
	readonly inputs?: (activation: Activation) => readonly InputNote[];
	/** Start without a declared tool and declare the granted ones at the first step. */
	readonly late?: boolean;
}
interface Run extends Played {
	readonly records: readonly Rec[];
	readonly results: readonly DriverResult[];
	readonly meter: CostMeter;
	readonly sessions: ReadonlyMap<string, ResidentSession>;
}
// What a scripted step saw of its request.
interface Seen {
	readonly texts: readonly string[];
	readonly options: SimpleStreamOptions | undefined;
}

const A01: ActorId = "resident:A01";
const LIMITS = { maxOutputTokens: 4000, timeoutMs: 5000 };
const game = (residents: number, ticks: number, blockSize: number): GameData => ({
	schema: 1,
	id: "guess",
	residents,
	seed: 7,
	mechanics: [{ use: "guess-number", options: { max: 1000 } }],
	scheduler: { id: "turns", options: { order: "roster", activation: "toAct", blockSize } },
	end: { ticks },
});

// A binding whose every answer costs `usd`.
function priced(binding: ModelBinding, usd: number): ModelBinding {
	const streamFn: StreamFn = async (model, context, options) => {
		const source = await binding.streamFn(model, context, options);
		const out = createAssistantMessageEventStream();
		void (async () => {
			for await (const event of source) out.push(event.type === "done" ? { ...event, message: { ...event.message, usage: { ...event.message.usage, cost: { ...event.message.usage.cost, total: usd } } } } : event);
			out.end();
		})();
		return out;
	};
	return { ...binding, streamFn };
}

// A step that notes the texts of its request (user texts and tool results) and its stream options, then answers with `step`.
function seeing(seen: Seen[], step: ScriptStep): ScriptStep {
	return (context: TranscriptContext, options, state, model) => {
		const texts = context.messages.flatMap((message) => {
			if (message.role === "user") return [typeof message.content === "string" ? message.content : ""];
			return message.role === "toolResult" ? [message.content.map((part) => (part.type === "text" ? part.text : "")).join("")] : [];
		});
		seen.push({ texts, options });
		return typeof step === "function" ? step(context, options, state, model) : step;
	};
}

async function run(script: Script, setup: Setup = {}): Promise<Run> {
	const records: Rec[] = [];
	const results: DriverResult[] = [];
	const meter = createCostMeter(setup.capUsd ?? 100);
	const source = scriptedSource(script);
	const sessions = new Map<string, ResidentSession>();
	const drivers = (kernel: Kernel): DriverTable => ({
		resident: async (activation) => {
			const { actor, tick } = activation;
			const bound = source.bind(actor, LIMITS);
			const binding = setup.usd === undefined ? bound : priced(bound, setup.usd);
			const made = createResidentSession({ actor, systemPrompt: `You are ${actor}.`, tools: setup.late === true ? [] : activation.tools, binding, thinking: "off", meter, redact: setup.redact ?? ((text) => text) });
			const session = sessions.get(actor) ?? made;
			sessions.set(actor, session);
			if (setup.late === true) session.declare(activation.tools);
			const record: Activation["record"] = (from, type, payload) => {
				expect(from).toBe(RESIDENT_RECORDS.id);
				records.push({ actor, tick, type, payload, at: kernel.log.all().length });
				return { seq: 0, tick, source: from, type, actor, payload };
			};
			const inputs = setup.inputs?.(activation) ?? activation.inputs;
			const result = await session.step({ actor, tick, basis: activation.basis, detail: activation.detail, inputs, tools: activation.tools, call: (as, params) => activation.call(as, params), record }, { open: kernel.openTools(actor), notice: setup.notice?.(activation) ?? [`Tick ${String(tick)}.`] });
			results.push(result);
			return result;
		},
	});
	const played = await play(game(setup.residents ?? 1, setup.ticks ?? 3, setup.blockSize ?? 1), { installed: { "guess-number": guessNumber }, drivers });
	return { ...played, records, results, meter, sessions };
}

const types = (records: readonly Rec[]): readonly string[] => records.map((record) => record.type);
const of = (records: readonly Rec[], type: string): readonly unknown[] => records.filter((record) => record.type === type).map((record) => record.payload);
const kernelEvents = (events: readonly Envelope[], type: string): readonly Envelope[] => events.filter((event) => event.source === "kernel" && event.type === type);

beforeEach(() => {
	vi.stubGlobal(
		"fetch",
		vi.fn(() => Promise.reject(new TypeError("a test reached the global fetch"))),
	);
});
afterEach(() => {
	vi.unstubAllGlobals();
});

describe("the resident session", () => {
	it("gives the text of a tool outcome as the old runner did", () => {
		expect(outcomeText({ ok: true, reply: "4 is too low." })).toBe("4 is too low.");
		expect(outcomeText({ ok: false, code: "TOOL_LOCKED", detail: "Wait for your turn." })).toBe("TOOL_LOCKED: Wait for your turn.");
		expect(outcomeText({ ok: false, code: "TOOL_LOCKED" })).toBe("TOOL_LOCKED");
	});

	it("sends a tool call through `activation.call`, answers its result at the next activation, and is pending in between", async () => {
		const seen: Seen[] = [];
		const { events, records, results, meter } = await run({ [A01]: [seeing(seen, act({ name: "guess", args: { value: 1001 } })), seeing(seen, say("Too high, then.")), seeing(seen, say())] });
		expect(events.filter((event) => event.type === "guessed").map((event) => event.payload)).toEqual([{ by: "A01", value: 1001, hint: "high" }]);
		expect(results).toEqual([{ pending: true }, { pending: false }, { pending: false }]);
		// The model reads the kernel's reply as the tool result, and only at its next request.
		expect(seen.map((request) => request.texts)).toEqual([["Tick 0."], ["Tick 0.", "1001 is too high.", "Tick 1."], ["Tick 0.", "1001 is too high.", "Tick 1.", "Tick 2."]]);
		expect(types(records)).toEqual(["request", "response", "request", "text", "response", "request", "text", "response"]);
		expect(of(records, "request")).toEqual([
			{ inputs: ["Tick 0."], tools: ["guess"], messages: 0 },
			{ inputs: ["Tick 1."], tools: ["guess"], messages: 3 },
			{ inputs: ["Tick 2."], tools: ["guess"], messages: 5 },
		]);
		expect(of(records, "text")[0]).toEqual({ text: "Too high, then." });
		// Usage reaches the meter, once per answered request; the fixed fields of the old runner reach the stream function.
		expect(meter.total.requests).toBe(3);
		expect(meter.byActor[A01]).toEqual(meter.total);
		expect(meter.total.input + meter.total.cacheWrite).toBeGreaterThan(0);
		expect(of(records, "response")[0]).toMatchObject({ provider: "faux", stopReason: "stop", costUsd: 0 });
		expect(seen.map((request) => [request.options?.maxRetries, request.options?.sessionId, request.options?.maxTokens, request.options?.timeoutMs])).toEqual(Array.from({ length: 3 }, () => [6, A01, 4000, 5000]));
	});

	it("sends nothing and records nothing without an input and without an unanswered tool result", async () => {
		const { records, results } = await run({ [A01]: [say(), say()] }, { notice: (activation) => (activation.tick === 1 ? [] : ["Go."]) });
		expect(records.map((record) => [record.tick, record.type])).toEqual([[0, "request"], [0, "text"], [0, "response"], [2, "request"], [2, "text"], [2, "response"]]);
		expect(results).toEqual([{ pending: false }, { pending: false }, { pending: false }]);
	});

	it("records a failed request redacted, keeps its inputs, and the run goes on", async () => {
		const held = `held-${"k".repeat(24)}`;
		const seen: Seen[] = [];
		const { end, records, meter } = await run({ [A01]: [fail(`the provider is down (${held})`), seeing(seen, say())] }, { ticks: 2, redact: (text) => text.replaceAll(held, "[redacted]") });
		expect(types(records)).toEqual(["request", "request_failed", "request", "text", "response"]);
		expect(of(records, "request_failed")).toEqual([{ message: "the provider is down ([redacted])", refusal: false }]);
		expect(JSON.stringify(records)).not.toContain(held);
		expect(seen[0]?.texts).toEqual(["Tick 0.", "Tick 1."]);
		expect(meter.total.requests).toBe(1);
		expect(end).toEqual({ reason: "ticks", tick: 2 });
	});

	it("takes the inputs of a step the provider's safeguards refused out of the context", async () => {
		const seen: Seen[] = [];
		const { records, sessions } = await run({ [A01]: [say("Hello."), fail("Blocked by our Safeguards."), seeing(seen, say())] });
		expect(of(records, "request_failed")).toEqual([{ message: "Blocked by our Safeguards.", refusal: true }]);
		expect(seen[0]?.texts).toEqual(["Tick 0.", "Tick 2."]);
		expect(of(records, "request")).toMatchObject([{ messages: 0 }, { messages: 2 }, { messages: 2 }]);
		expect(sessions.get(A01)?.messages).toBe(4);
	});

	it("drops the conversation at a reset line and declares a late tool before the next request", async () => {
		const seen: Seen[] = [];
		const reset = (activation: Activation): readonly InputNote[] => (activation.tick === 1 ? [{ source: "test", kind: "context-reset", text: "A new day." }] : []);
		const { records, sessions, events } = await run({ [A01]: [say(), seeing(seen, act({ name: "guess", args: { value: 1001 } }))] }, { ticks: 2, inputs: reset, late: true });
		expect(types(records)).toEqual(["request", "text", "response", "context_reset", "request", "response"]);
		expect(of(records, "context_reset")).toEqual([{ messages: 2 }]);
		expect(of(records, "request")[1]).toEqual({ inputs: ["A new day.", "Tick 1."], tools: ["guess"], messages: 0 });
		expect(seen[0]?.texts).toEqual(["A new day.", "Tick 1."]);
		expect(sessions.get(A01)?.declared).toEqual(["guess"]);
		expect(kernelEvents(events, "tool_called")).toHaveLength(1);
	});

	it("asks the meter before it sends: at the cap no further request leaves", async () => {
		// Stand-in for `KernelPorts.limits`: the kernel of `play` has no external limit, so the run plays on to its
		// last tick; with the limit passed it would end with `{ reason: "limit", limit: "models.budget" }` at tick 2.
		const { records, meter, results } = await run({ [A01]: [act({ name: "guess", args: { value: 1001 } }), say(), say(), say()] }, { ticks: 4, capUsd: 0.03, usd: 0.02 });
		expect(of(records, "request")).toHaveLength(2);
		expect(meter.total).toMatchObject({ requests: 2 });
		expect(meter.total.costUsd).toBeCloseTo(0.04);
		expect(meter.limit.id).toBe("models.budget");
		expect(meter.limit.check()).toBe("cost 0.04 USD reached the cap of 0.03 USD");
		expect(results).toHaveLength(4);
	});

	it("records when the request starts and never calls after its activation closed, in a block under `turns`", async () => {
		const guess = (value: number): ScriptStep => act({ name: "guess", args: { value } }, { name: "guess", args: { value: value + 1 } });
		const { events, records } = await run({ [A01]: [guess(1001), say()], "resident:A02": [guess(1003), say()] }, { residents: 2, ticks: 2, blockSize: 2 });
		const called = kernelEvents(events, "tool_called");
		expect(called.map((event) => event.actor)).toEqual([A01, A01, "resident:A02", "resident:A02"]);
		// Erratum O18: every call is caused by an activation that closes after it.
		const closed = kernelEvents(events, "activation_closed");
		for (const call of called) {
			const end = closed.find((event) => event.causedBy === call.causedBy);
			expect(events.find((event) => event.seq === call.causedBy)).toMatchObject({ type: "activation_opened", actor: call.actor });
			expect(end?.seq).toBeGreaterThan(call.seq);
		}
		// Both requests of the block are recorded before the first member's first call.
		const first = called[0]?.seq ?? 0;
		const started = records.filter((record) => record.tick === 0 && record.type === "request");
		expect(started.map((record) => record.actor)).toEqual([A01, "resident:A02"]);
		for (const record of started) expect(record.at).toBeLessThan(first);
	});
});
