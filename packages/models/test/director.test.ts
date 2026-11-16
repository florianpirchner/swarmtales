// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The asker (M3 spec 4.4) against the scripted source, in real kernel runs through the testkit's `play`: the one
 * resident of guess-number asks once per activation, so the records are lines of the kernel's log. No request
 * leaves the process: the global `fetch` rejects.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAssistantMessageEventStream } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import type { ActorId, AskModel, DriverTable, Envelope, GameData, ModelAnswer } from "@swarmtales/contracts";
import { checkResumeEveryBoundary, guessNumber, play } from "@swarmtales/testkit";
import { createAsker, DIRECTOR_MODEL_RECORDS, scriptedAsker } from "../src/director.ts";
import { createCostMeter, type CostMeter } from "../src/meter.ts";
import { fail, say, scriptedSource, type ScriptStep } from "../src/scripted.ts";
import type { ModelSource } from "../src/source.ts";

const A01: ActorId = "resident:A01";
const OUTPUT = Type.Object({ line: Type.String({ description: "The line" }) }, { additionalProperties: false, description: "The answer" });
const QUESTION = { system: "You are the warden.", input: "A decision was proposed.", output: OUTPUT };
const game = (ticks: number): GameData => ({
	schema: 1,
	id: "guess",
	residents: 1,
	seed: 7,
	mechanics: [{ use: "guess-number", options: { max: 100 } }],
	scheduler: { id: "turns", options: { order: "roster", activation: "toAct" } },
	end: { ticks },
});

interface Setup {
	/** The cost of each answer in order (the scripted model has no price); a text stands for a cost that is no number. */
	readonly usd?: readonly (number | string)[];
	readonly capUsd?: number;
	readonly maxCostUsd?: number;
	/** The price of the model per token; zero when left out. */
	readonly price?: number;
	/** The stream function throws at this request (counted from 0). */
	readonly throwAt?: number;
}
interface Run {
	readonly answers: readonly ModelAnswer[];
	readonly records: readonly Envelope[];
	readonly meter: CostMeter;
	/** The system prompt of every request that reached the stream function. */
	readonly sent: readonly string[];
}

// The source with a cost on every answer, a price on the model and a count of what was sent.
function wired(source: ModelSource, setup: Setup, sent: string[]): ModelSource {
	return {
		bind: (actor, limits) => {
			const binding = source.bind(actor, limits);
			const price = setup.price ?? 0;
			return {
				model: { ...binding.model, cost: { ...binding.model.cost, input: price, output: price } },
				streamFn: async (model, context, options) => {
					const first = context.messages[0];
					const at = sent.push(first?.role === "system" && typeof first.content === "string" ? first.content : "") - 1;
					expect([options?.sessionId, limits.maxOutputTokens, limits.timeoutMs]).toEqual([actor, 4000, 120_000]);
					if (at === setup.throwAt) throw new TypeError(`fetch https://user:${"p".repeat(20)}@host/v1 failed`);
					const inner = await binding.streamFn(model, context, options);
					const out = createAssistantMessageEventStream();
					const usd = setup.usd?.[at];
					void (async () => {
						// A cost that is no number, as a broken provider answer could carry it.
						for await (const event of inner) out.push(event.type === "done" && usd !== undefined ? { ...event, message: { ...event.message, usage: { ...event.message.usage, cost: { ...event.message.usage.cost, total: typeof usd === "number" ? usd : Number.NaN } } } } : event);
						out.end();
					})();
					return out;
				},
			};
		},
	};
}

// One question per activation; two when the case sets a cap, so that the second one meets the limit inside the same activation.
async function run(script: readonly ScriptStep[], setup: Setup = {}, ticks = script.length): Promise<Run> {
	const meter = createCostMeter(setup.capUsd ?? 100);
	const sent: string[] = [];
	const ask = createAsker(wired(scriptedSource({ [A01]: script }), setup, sent), meter, () => (setup.maxCostUsd === undefined ? {} : { maxCostUsd: setup.maxCostUsd }));
	const answers: ModelAnswer[] = [];
	const { events } = await play(game(ticks), {
		installed: { "guess-number": guessNumber },
		records: [DIRECTOR_MODEL_RECORDS],
		drivers: {
			resident: async (activation) => {
				answers.push(await ask(activation, QUESTION), ...(setup.capUsd === undefined ? [] : [await ask(activation, QUESTION)]));
			},
		},
	});
	return { answers, records: events.filter((event) => event.source === DIRECTOR_MODEL_RECORDS.id), meter, sent };
}
const types = (records: readonly Envelope[]): readonly string[] => records.map((record) => record.type);

beforeEach(() => {
	vi.stubGlobal(
		"fetch",
		vi.fn(() => Promise.reject(new TypeError("a test reached the global fetch"))),
	);
});
afterEach(() => {
	vi.unstubAllGlobals();
});

describe("the asker", () => {
	it("asks once, writes its records as the actor, counts the cost on the meter and gives the checked value", async () => {
		const { answers, records, meter, sent } = await run([say('{"line":"Order."}'), say('```json\n{"line":"Again."}\n```')], { usd: [0.01, 0.02] });
		expect(answers).toEqual([
			{ ok: true, value: { line: "Order." }, costUsd: 0.01 },
			{ ok: true, value: { line: "Again." }, costUsd: 0.02 },
		]);
		expect(types(records)).toEqual(["request", "text", "response", "request", "text", "response"]);
		expect(records.map((record) => [record.actor, record.tick])).toEqual([0, 0, 0, 1, 1, 1].map((tick) => [A01, tick]));
		expect(records[0]?.payload).toEqual({ inputs: [QUESTION.input], tools: [], messages: 0 });
		expect(records[2]?.payload).toMatchObject({ provider: "faux", stopReason: "stop", costUsd: 0.01 });
		expect(meter.byActor[A01]?.requests).toBe(2);
		expect(meter.total.costUsd).toBeCloseTo(0.03);
		// Every question is a new conversation: the system prompt, then the schema of the answer.
		expect(sent).toEqual([`You are the warden.\n\nAnswer with one JSON value that fits this JSON schema, and with nothing else:\n${JSON.stringify(OUTPUT)}`, sent[0]]);
	});

	it("refuses with `limit` and sends nothing once the actor spent its `maxCostUsd`", async () => {
		const { answers, records, meter, sent } = await run([say('{"line":"One."}'), say('{"line":"Two."}'), say('{"line":"Three."}')], { usd: [0.01, 0.01, 0.01], maxCostUsd: 0.02 });
		expect(answers.map((answer) => (answer.ok ? "ok" : answer.reason))).toEqual(["ok", "ok", "limit"]);
		expect(answers[2]).toMatchObject({ detail: `cost 0.0200 USD of ${A01} reached its limit of 0.02 USD` });
		expect(sent).toHaveLength(2);
		expect(types(records).filter((type) => type === "request")).toHaveLength(2);
		expect(meter.total.requests).toBe(2);
	});

	it("refuses with `limit` and sends nothing once the cap of the run is reached", async () => {
		const { answers, sent, records } = await run([say('{"line":"One."}'), say('{"line":"Two."}')], { usd: [0.5], capUsd: 0.4 }, 1);
		expect(answers).toMatchObject([{ ok: true, costUsd: 0.5 }, { ok: false, reason: "limit", detail: "cost 0.5 USD reached the cap of 0.4 USD" }]);
		expect(sent).toHaveLength(1);
		expect(types(records)).toEqual(["request", "text", "response"]);
	});

	it("gives `invalid` for an answer that is no JSON or does not fit the output, and still counts its cost", async () => {
		const { answers, meter } = await run([say("I say: order."), say('{"line":7}'), say('{"line":"x","more":1}')], { usd: [0.01, 0.01, 0.01] });
		expect(answers.map((answer) => (answer.ok ? "ok" : answer.reason))).toEqual(["invalid", "invalid", "invalid"]);
		expect(meter.total.requests).toBe(3);
		expect(meter.total.costUsd).toBeCloseTo(0.03);
	});

	// Runtime revision 7 (A100, P480): the schema written back, or a first answer reasoned past, comes before the answer.
	it("gives the last object of the text that fits the output, and its cost", async () => {
		const { answers } = await run([say(`${JSON.stringify(OUTPUT)}\n\nNot the schema, the answer:\n{"line":"First."}\nCorrected: {"line":"Last."}`)], { usd: [0.01] });
		expect(answers).toEqual([{ ok: true, value: { line: "Last." }, costUsd: 0.01 }]);
	});

	it("gives `error` for a failed request, records it redacted and counts nothing", async () => {
		const held = `sk-${"k".repeat(24)}`;
		const { answers, records, meter } = await run([fail(`the provider is down (${held})`), say('{"line":"Back."}')]);
		expect(answers).toMatchObject([{ ok: false, reason: "error", detail: "the provider is down (sk-[redacted])" }, { ok: true }]);
		expect(types(records)).toEqual(["request", "request_failed", "request", "text", "response"]);
		expect(records[1]?.payload).toEqual({ message: "the provider is down (sk-[redacted])", refusal: false });
		expect(JSON.stringify([answers, records])).not.toContain(held);
		expect(meter.total.requests).toBe(1);
		// The scripted answer after the last step is the provider library's error answer.
		expect((await run([], {}, 1)).answers).toMatchObject([{ ok: false, reason: "error" }]);
	});

	it.each([
		["a cost that is no number", { usd: ["none"] }, ["request", "text", "cost_unknown"]],
		["an answer of a priced model without a cost", { price: 3 }, ["request", "text", "cost_unknown"]],
		["a stream function that throws", { throwAt: 0 }, ["request", "cost_unknown", "request_failed"]],
	] as const)("closes the meter after %s, does not use the answer and never sends again", async (_name, setup, written) => {
		const { answers, records, meter, sent } = await run([say('{"line":"One."}'), say('{"line":"Two."}')], { ...setup, capUsd: 100 }, 1);
		expect(answers).toMatchObject([{ ok: false, reason: "error" }, { ok: false, reason: "limit" }]);
		expect(meter.closed).toBeDefined();
		expect(meter.total.requests).toBe(0);
		expect(sent).toHaveLength(1);
		expect(types(records)).toEqual(written);
		// Runtime revision 6: the closing is on the log, with the meter's reason, so a replay closes there too.
		expect(records.find((record) => record.type === "cost_unknown")?.payload).toEqual({ reason: meter.closed });
		expect(JSON.stringify([answers, records])).not.toContain("p".repeat(20));
	});
});

describe("the scripted asker", () => {
	it("answers by the count of each actor's calls and with `error` after its last answer", async () => {
		const ask: AskModel = scriptedAsker({ [A01]: [{ line: "One." }, 7] });
		const answers: ModelAnswer[] = [];
		const { events } = await play(game(3), { installed: { "guess-number": guessNumber }, drivers: { resident: async (activation) => void answers.push(await ask(activation, QUESTION), await ask({ ...activation, actor: "director:none" }, QUESTION)) } });
		const missing = (actor: string): ModelAnswer => ({ ok: false, reason: "error", detail: `the script of ${actor} has no answer` });
		expect(answers).toEqual([{ ok: true, value: { line: "One." }, costUsd: 0 }, missing("director:none"), { ok: true, value: 7, costUsd: 0 }, missing("director:none"), missing(A01), missing("director:none")]);
		expect(events.filter((event) => event.source === DIRECTOR_MODEL_RECORDS.id)).toEqual([]);
	});

	// J235: the asker of `swt run --fake` is made new in a resumed process; the detail it gives holds no count of the
	// questions asked before, so the resumed log is the straight one. The resident writes each detail as a record.
	it("writes the same detail in a run resumed from every boundary as in the straight run", async () => {
		const drivers = (): DriverTable => {
			const ask = scriptedAsker({});
			return {
				resident: async (activation) => {
					const answer = await ask({ ...activation, actor: "director:confessor" }, QUESTION);
					activation.record(DIRECTOR_MODEL_RECORDS.id, "text", { text: answer.ok ? "answered" : answer.detail });
				},
			};
		};
		const options = { installed: { "guess-number": guessNumber }, records: [DIRECTOR_MODEL_RECORDS] };
		const { events } = await play(game(4), { ...options, drivers: drivers() });
		expect(events.filter((event) => event.source === DIRECTOR_MODEL_RECORDS.id).map((event) => event.payload)).toEqual(Array.from({ length: 4 }, () => ({ text: "the script of director:confessor has no answer" })));
		expect(await checkResumeEveryBoundary(game(4), drivers, { ...options, boundaries: [0, 1, 2, 3] })).toEqual([]);
	});
});
