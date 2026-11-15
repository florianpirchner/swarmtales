// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The model source, the scripted source and the cost meter (M2 spec 1.2, 3.3, 3.4, 4.3). No request leaves the
 * process: a live source gets a stubbed `fetch`, and the global one rejects. Every key is built here at run time.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createModels, createProvider, envApiKeyAuth, normalizeContext, type AssistantMessage, type Provider } from "@earendil-works/pi-ai";
import { anthropicMessagesApi } from "@earendil-works/pi-ai/api/anthropic-messages.lazy";
import { SwtError, type ActorId } from "@swarmtales/contracts";
import { createKeyBroker, KEY_VARIABLES, type KeyAuth } from "../src/keys.ts";
import { createCostMeter, formatUsd } from "../src/meter.ts";
import { createProviderRegistry, modelOf, type ProviderSpec } from "../src/providers.ts";
import { act, fail, say, scriptedSource } from "../src/scripted.ts";
import { closedModels, createModelSource, type ModelBinding } from "../src/source.ts";
import type { ModelSettings } from "../src/settings.ts";

// Built from parts: no committed text has the shape of a key.
const keyOf = (letter: string): string => `${["s", "k"].join("")}-ant-${letter.repeat(37)}`;
const HELD = keyOf("a");
const PLANTED = keyOf("p");
const HAIKU = "claude-haiku-5-5";
const LIMITS = { maxOutputTokens: 4000, timeoutMs: 5000 };
const ACTOR: ActorId = "resident:r1";
const builtin = createProviderRegistry();
// Through a parameter: the import check of the layer rules reads a `require` call with a text as an import.
const specOf = (id: string): ProviderSpec => builtin.require(id);
const settingsOf = (provider: string, modelId = HAIKU): ModelSettings => ({ provider, modelId, requestedId: modelId, thinking: "off", maxOutputTokens: 4000 });

function caught(run: () => unknown): SwtError {
	try {
		run();
	} catch (error) {
		if (error instanceof SwtError) return error;
	}
	throw new TypeError("no SwtError was thrown");
}

// An adapter with the Anthropic model table under another id: `auth` decides where its key comes from, `input` the price of input tokens.
function variant(id: string, auth: (given: KeyAuth) => KeyAuth, input?: number): ProviderSpec {
	const create = (given: KeyAuth): Provider => {
		const haiku = modelOf(specOf("anthropic").create(given), HAIKU);
		const model = { ...haiku, provider: id, cost: { ...haiku.cost, input: input ?? haiku.cost.input } };
		return createProvider({ id, auth: { apiKey: auth(given) }, baseUrl: haiku.baseUrl, models: [model], api: anthropicMessagesApi() });
	};
	return { id, label: id, defaultModelId: HAIKU, create };
}

// A provider that refuses the request: the stub keeps the request headers and answers 400 with `text`, so nothing is retried.
function refusingFetch(seen: string[], text: string): typeof globalThis.fetch {
	return (input, init) => {
		const headers = new Headers(input instanceof Request ? input.headers : init?.headers);
		seen.push([...headers.values()].join("\n"));
		return Promise.resolve(new Response(JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: text } }), { status: 400, headers: { "content-type": "application/json" } }));
	};
}

async function ask(binding: ModelBinding, fetch?: typeof globalThis.fetch): Promise<AssistantMessage> {
	const stream = await binding.streamFn(binding.model, normalizeContext({ messages: [{ role: "user", content: "hello", timestamp: 0 }] }), fetch === undefined ? {} : { fetch });
	return stream.result();
}

const globalFetch = vi.fn(() => Promise.reject(new TypeError("a test reached the global fetch")));

beforeEach(() => {
	globalFetch.mockClear();
	vi.stubGlobal("fetch", globalFetch);
});

afterEach(() => {
	// Puts every stubbed variable back as it was (set or not set), without this file reading the environment.
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
	expect(globalFetch).not.toHaveBeenCalled();
});

describe("the model source", () => {
	it("sends the broker's key and redacts the error text of a failed request", async () => {
		const broker = createKeyBroker({ SWT_ANTHROPIC_API_KEY: HELD });
		const binding = createModelSource(settingsOf("anthropic"), builtin, broker).bind(ACTOR, LIMITS);
		const seen: string[] = [];
		const message = await ask(binding, refusingFetch(seen, `refused: the key ${HELD} is not valid`));

		expect(seen).toHaveLength(1);
		expect(seen[0]).toContain(HELD);
		expect(message.stopReason).toBe("error");
		expect(message.errorMessage).toContain("[redacted] is not valid");
		expect(JSON.stringify(message)).not.toContain(HELD);
		expect(binding.model.id).toBe(HAIKU);
		expect(binding.requestDefaults).toBeUndefined();
	});

	it("refuses a missing key with X001, an unknown model with X003 and a price of zero with X007", () => {
		const registry = createProviderRegistry([variant("free", (given) => given, 0)]);
		const broker = createKeyBroker({ SWT_ANTHROPIC_API_KEY: HELD, SWT_FREE_API_KEY: HELD }, { ...KEY_VARIABLES, free: ["SWT_FREE_API_KEY"] });
		expect(caught(() => createModelSource(settingsOf("anthropic"), builtin, createKeyBroker({}))).code).toBe("SWT-X001");
		expect(caught(() => createModelSource(settingsOf("anthropic", "haiku-9"), builtin, broker)).code).toBe("SWT-X003");

		const free = createModelSource(settingsOf("free"), registry, broker);
		const refused = caught(() => free.bind(ACTOR, LIMITS));
		expect(refused.code).toBe("SWT-X007");
		expect(refused.message).toContain(HAIKU);
		expect(createModelSource(settingsOf("anthropic"), registry, broker).bind(ACTOR, LIMITS).model.cost.output).toBeGreaterThan(0);
	});

	it("lets a key variable planted in process.env reach no provider that was built without the broker", async () => {
		const names = Object.values(KEY_VARIABLES).flat();
		for (const name of names) vi.stubEnv(name, PLANTED);
		// This adapter drops the broker's auth object and asks the provider library for the environment, as the library's own adapters do.
		const leaky = variant("leaky", () => envApiKeyAuth("leaky API key", names));
		const registry = createProviderRegistry([leaky]);
		const broker = createKeyBroker({ SWT_LEAKY_API_KEY: HELD }, { leaky: ["SWT_LEAKY_API_KEY"] });
		const provider = leaky.create(broker.auth("leaky"));

		// The library's own collection hands the planted value on: this is what the closed context shuts.
		const open = createModels();
		open.setProvider(provider);
		expect((await open.getAuth("leaky"))?.auth.apiKey).toBe(PLANTED);

		const closed = closedModels();
		closed.setProvider(provider);
		expect(await closed.getAuth("leaky")).toBeUndefined();

		const seen: string[] = [];
		const message = await ask(createModelSource(settingsOf("leaky"), registry, broker).bind(ACTOR, LIMITS), refusingFetch(seen, "refused by the stub"));
		expect(message.stopReason).toBe("error");
		expect(seen.join("\n")).not.toContain(PLANTED);
		expect(seen.join("\n")).not.toContain(HELD);
		expect(JSON.stringify(message)).not.toContain(PLANTED);
	});
});

describe("the scripted source", () => {
	it("replays the list of each actor in order, then answers with an error", async () => {
		const source = scriptedSource({ [ACTOR]: [act({ name: "guess", args: { n: 3 } }, { name: "wait" }), say("done"), fail("the provider is down")] });
		const binding = source.bind(ACTOR, LIMITS);
		const answers = [await ask(binding), await ask(binding), await ask(binding), await ask(binding)];

		expect(answers[0]?.content).toMatchObject([
			{ type: "toolCall", name: "guess", arguments: { n: 3 } },
			{ type: "toolCall", name: "wait", arguments: {} },
		]);
		expect(answers[1]?.content).toMatchObject([{ type: "text", text: "done" }]);
		// A step with tool calls keeps the stop reason of the old `act`: the agent loop reads the calls, not the reason.
		expect(answers.map((answer) => answer.stopReason)).toEqual(["stop", "stop", "error", "error"]);
		expect(answers[2]?.errorMessage).toBe("the provider is down");
		expect(answers[3]?.errorMessage).toContain("No more faux responses");
		// A new binding starts at the first step; an actor without a list has no answer; a scripted model needs no price.
		expect((await ask(source.bind(ACTOR, LIMITS))).content).toMatchObject([{ name: "guess" }, { name: "wait" }]);
		expect((await ask(source.bind("resident:r2", LIMITS))).stopReason).toBe("error");
		expect(binding.model.cost.input).toBe(0);
	});
});

describe("the cost meter", () => {
	const usage = (costUsd: number) => ({ input: 100, output: 10, cacheRead: 5, cacheWrite: 1, costUsd });

	it("refuses a cap that is not a positive finite number with X005", () => {
		for (const cap of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) expect(caught(() => createCostMeter(cap)).code).toBe("SWT-X005");
		expect(createCostMeter(0.01).capUsd).toBe(0.01);
	});

	it("reserves the dearest answer so far: breached when one more such answer would reach the cap (P472)", () => {
		const meter = createCostMeter(0.25);
		let sent = 0;
		while (meter.limit.check() === undefined && sent < 10) {
			sent += 1;
			meter.add(ACTOR, usage(sent === 1 ? 0.05 : 0.08));
		}
		// 0.05 + 0.08 = 0.13; a third answer of 0.08 would make 0.21; a fourth would pass 0.25, so it is not sent.
		expect(sent).toBe(3);
		expect(meter.dearestUsd).toBe(0.08);
		expect(meter.total.costUsd).toBeLessThan(0.25);
		expect(meter.limit.check()).toBe("cost 0.21 USD and the dearest answer so far (0.08 USD) reach the cap of 0.25 USD");
		expect(formatUsd(0.0013322349999)).toBe("0.001332235");
		expect([formatUsd(0.001), formatUsd(0), formatUsd(2), formatUsd(4.475e-5)]).toEqual(["0.001", "0", "2", "0.00004475"]);
	});

	it("breaches the limit models.budget at the first request that passes the cap without the reservation, and stays breached", () => {
		const meter = createCostMeter(0.25, { revision: 4 });
		const { limit } = meter;
		// The loop of a run, as the kernel holds it: the limit is asked before each request, the first reason ends the run.
		let reason = limit.check();
		let sent = 0;
		while (reason === undefined && sent < 10) {
			sent += 1;
			meter.add(sent % 2 === 0 ? "resident:r2" : ACTOR, usage(0.1));
			reason = limit.check();
		}
		expect(sent).toBe(3);
		expect(limit.id).toBe("models.budget");
		expect(reason).toBe("cost 0.30 USD reached the cap of 0.25 USD");
		expect(limit.check()).toBe(reason);
		expect(meter.total).toMatchObject({ requests: 3, input: 300, output: 30, cacheRead: 15, cacheWrite: 3 });
		expect(meter.byActor).toMatchObject({ [ACTOR]: { requests: 2, input: 200 }, "resident:r2": { requests: 1, output: 10, costUsd: 0.1 } });

		// The cap itself is a breach (at or above), a cost below it is none.
		const exact = createCostMeter(0.5, { revision: 4 });
		exact.add(ACTOR, usage(0.25));
		expect(exact.limit.check()).toBeUndefined();
		exact.add(ACTOR, usage(0.25));
		expect(exact.limit.check()).toBe("cost 0.50 USD reached the cap of 0.50 USD");
	});

	it("refuses a negative or non-finite number and counts nothing of that request", () => {
		const meter = createCostMeter(1);
		for (const bad of [{ ...usage(0.1), output: -1 }, usage(Number.NaN), { ...usage(0.1), input: Number.POSITIVE_INFINITY }]) {
			expect(() => {
				meter.add(ACTOR, bad);
			}).toThrow(RangeError);
		}
		expect(meter.total).toEqual({ requests: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, costUsd: 0 });
		expect(meter.byActor).toEqual({});
	});
});
