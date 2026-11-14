// SPDX-License-Identifier: Apache-2.0
/**
 * Review of M2, part A: failing cases against the key broker, the meter and the resident session. The harness is
 * the one of `session.test.ts` (the scripted source under the `turns` scheduler); the global `fetch` rejects.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StreamFn } from "@earendil-works/pi-agent-core";
import { createAssistantMessageEventStream, fauxAssistantMessage, type AssistantMessage, type SimpleStreamOptions, type TranscriptContext } from "@earendil-works/pi-ai";
import type { Activation, ActorId, DriverResult, DriverTable, Envelope, GameData, InputNote, Kernel, Redact } from "@swarmtales/contracts";
import { guessNumber, play, type Played } from "@swarmtales/testkit";
import { createResidentSession, type ResidentSession } from "../src/driver/session.ts";
import { createCostMeter, type CostMeter, type Spend } from "../src/meter.ts";
import { RESIDENT_RECORDS } from "../src/records.ts";
import { createKeyBroker } from "../src/keys.ts";
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
	/** The failed answers get the cost too. */
	readonly failed?: boolean;
	/** The model has a price above zero. */
	readonly price?: boolean;
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

// A binding whose every answer costs `usd`: the ones that end with `done`, and with `failed` the failed ones too.
// With `price` the model has a price, as every model of a live source has.
function priced(binding: ModelBinding, usd: number, setup: Setup): ModelBinding {
	const costing = (message: AssistantMessage): AssistantMessage => ({ ...message, usage: { ...message.usage, cost: { ...message.usage.cost, total: usd } } });
	const streamFn: StreamFn = async (model, context, options) => {
		const source = await binding.streamFn(model, context, options);
		const out = createAssistantMessageEventStream();
		void (async () => {
			for await (const event of source) {
				if (event.type === "done") out.push({ ...event, message: costing(event.message) });
				else out.push(event.type === "error" && setup.failed === true ? { ...event, error: costing(event.error) } : event);
			}
			out.end();
		})();
		return out;
	};
	const model = setup.price === true ? { ...binding.model, cost: { ...binding.model.cost, input: 1, output: 5 } } : binding.model;
	return { ...binding, model, streamFn };
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
			const binding = setup.usd === undefined ? bound : priced(bound, setup.usd, setup);
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


describe("review A: the key broker", () => {
	it("K1: takes a held value out whole, also when a pattern of contracts matches only its start", () => {
		// Built at run time from parts. The dot ends the `sk-` pattern, the slash the bearer pattern.
		const rest = "b".repeat(20);
		const dotted = `sk-${"a".repeat(20)}.${rest}`;
		const slashed = `${"c".repeat(20)}/${rest}`;
		for (const held of [dotted, slashed]) {
			const broker = createKeyBroker({ SWT_ANTHROPIC_API_KEY: held });
			const text = broker.redact(`401 for ${held}, sent as Bearer ${held}`);
			expect(text).not.toContain(rest);
			expect(broker.leaks(text)).toBe(false);
			expect(text).toBe("401 for [redacted], sent as Bearer [redacted]");
		}
	});
});

describe("review A: the cost cap", () => {
	// M1: `meter.add` throws for a cost it cannot count and the agent of the provider library turns the throw into a
	// failed request. The meter fails closed: it keeps the first usage it refused, its limit answers a reason from
	// then on, so the driver sends nothing more and the kernel ends the run.
	it("M1: stops sending after an answer whose cost cannot be counted", async () => {
		const { records, meter } = await run({ [A01]: [say(), say(), say(), say()] }, { ticks: 4, capUsd: 0.03, usd: Number.NaN });
		expect(meter.total.requests).toBe(0);
		expect(of(records, "request")).toHaveLength(1);
		expect(meter.limit.check()).toBeDefined();
		expect(meter.closed).toBe(`the costUsd of an answer to ${A01} is no amount that can be counted`);
	});

	it("M1: a failed answer whose cost is no amount closes the meter; only a cost of exactly zero is 'not billed'", async () => {
		for (const usd of [Number.NaN, -0.01, Number.POSITIVE_INFINITY]) {
			const { records, meter } = await run({ [A01]: [fail("overloaded"), say(), say()] }, { ticks: 3, capUsd: 0.03, usd, failed: true });
			expect([usd, of(records, "request").length, meter.total.requests]).toEqual([usd, 1, 0]);
			expect(meter.closed).toBeDefined();
		}
		const unbilled = await run({ [A01]: [fail("overloaded"), say()] }, { ticks: 2, capUsd: 0.03, usd: 0, failed: true });
		expect([of(unbilled.records, "request").length, unbilled.meter.closed]).toEqual([2, undefined]);
	});

	it("M1: an answer of a model with a price that comes without a cost closes the meter; a scripted model has no price", async () => {
		const { records, meter } = await run({ [A01]: [say(), say(), say()] }, { ticks: 3, capUsd: 0.03, usd: 0, price: true });
		expect([of(records, "request").length, of(records, "response").length, meter.total.requests]).toEqual([1, 0, 0]);
		expect(meter.closed).toBe(`an answer to ${A01} of a model with a price came without a cost`);
		// The same model with a cost is counted, and a failed request of it that was not billed closes nothing.
		const paid = await run({ [A01]: [fail("overloaded"), say(), say()] }, { ticks: 3, capUsd: 1, usd: 0.01, price: true });
		expect([of(paid.records, "request").length, paid.meter.total.requests, paid.meter.closed]).toEqual([3, 2, undefined]);
		const free = await run({ [A01]: [say(), say()] }, { ticks: 2, capUsd: 0.03 });
		expect([of(free.records, "request").length, free.meter.closed]).toEqual([2, undefined]);
	});

	it("M1: the meter refuses every number that is missing, negative, not finite or a text, counts nothing of it and stays closed", () => {
		// What the provider library hands over is typed as numbers; at run time it is whatever a provider sent.
		const untyped = (value: unknown): value is Omit<Spend, "requests"> => typeof value === "object" && value !== null;
		const good = { input: 10, output: 2, cacheRead: 0, cacheWrite: 0, costUsd: 0.001 };
		for (const field of ["input", "output", "cacheRead", "cacheWrite", "costUsd"]) {
			for (const bad of [Number.NaN, -1, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, "0.001", null, undefined, {}]) {
				const meter = createCostMeter(1);
				const usage: unknown = { ...good, [field]: bad };
				if (!untyped(usage)) throw new TypeError("no usage");
				expect(() => {
					meter.add(A01, usage);
				}).toThrow(RangeError);
				expect([field, bad, meter.total.requests, meter.total.costUsd, meter.byActor]).toEqual([field, bad, 0, 0, {}]);
				expect(meter.limit.check()).toBe(`the cost of the run is not known: the ${field} of an answer to ${A01} is no amount that can be counted`);
				// A later answer is still counted, and the meter stays closed with its first reason.
				meter.add(A01, good);
				meter.close("another reason");
				expect([meter.total.requests, meter.closed]).toEqual([1, `the ${field} of an answer to ${A01} is no amount that can be counted`]);
			}
		}
		const missing: unknown = { input: 10, output: 2 };
		const meter = createCostMeter(1);
		expect(() => {
			if (untyped(missing)) meter.add(A01, missing);
		}).toThrow(RangeError);
		expect(meter.limit.check()).toBeDefined();
	});

	it("M1: a meter that was closed by hand, and a sum that overflows, are at the limit", () => {
		const closed = createCostMeter(1);
		expect(closed.limit.check()).toBeUndefined();
		closed.close("the usage was missing");
		expect(closed.limit.check()).toBe("the cost of the run is not known: the usage was missing");
		const huge = createCostMeter(Number.MAX_VALUE);
		huge.add(A01, { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, costUsd: Number.MAX_VALUE });
		huge.add(A01, { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, costUsd: Number.MAX_VALUE });
		expect(huge.limit.check()).toBeDefined();
	});

	it("M2: passes the cap by the requests in flight in one block and sends nothing in the next (spec 4.3)", async () => {
		const answers = [say(), say(), say(), say()];
		const { records, meter } = await run({ [A01]: answers, "resident:A02": answers, "resident:A03": answers }, { residents: 3, ticks: 4, blockSize: 3, capUsd: 0.03, usd: 0.02 });
		expect(of(records, "request")).toHaveLength(3);
		expect(meter.total.costUsd).toBeCloseTo(0.06);
	});

	it("M3: counts a failed request that was billed, and none that was not", async () => {
		const { records, meter } = await run({ [A01]: [fail("overloaded"), say()] }, { ticks: 2, capUsd: 0.03, usd: 0.02 });
		// The harness prices the answers that end with `done`; the failed one carries no cost and is not counted.
		expect(types(records)).toEqual(["request", "request_failed", "request", "text", "response"]);
		expect(meter.total).toMatchObject({ requests: 1 });
	});
});

describe("review A: the resident session against the old runner", () => {
	it("S1: a tool that is not declared and arguments that do not fit never reach the kernel; the model reads the library's text", async () => {
		const seen: Seen[] = [];
		const { records, results, events } = await run({ [A01]: [act({ name: "nope" }), act({ name: "guess", args: { value: "x" } }), seeing(seen, say())] }, { ticks: 3 });
		expect([kernelEvents(events, "tool_called"), kernelEvents(events, "tool_refused")]).toEqual([[], []]);
		expect(results).toEqual([{ pending: true }, { pending: true }, { pending: false }]);
		expect(seen[0]?.texts[1]).toBe("Tool nope not found");
		expect(seen[0]?.texts[3]).toMatch(/^Validation failed for tool "guess":\n {2}- value: must be integer/);
		expect(types(records).filter((type) => type === "request_failed")).toEqual([]);
	});

	it("S2: an answer without content is counted, leaves nothing to answer, and the next step still sends", async () => {
		const seen: Seen[] = [];
		const { records, results } = await run({ [A01]: [fauxAssistantMessage([]), seeing(seen, say())] }, { ticks: 2 });
		expect(types(records)).toEqual(["request", "response", "request", "text", "response"]);
		expect(results).toEqual([{ pending: false }, { pending: false }]);
		expect(seen[0]?.texts).toEqual(["Tick 0.", "Tick 1."]);
	});
});
