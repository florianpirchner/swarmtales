/**
 * P75: a story sets `maxOutputTokens` for its own model (393216 for DeepSeek); a run that overrides the model
 * (`--gamemaker-model haiku`) must not send that number to a provider that answers 400 above its own limit.
 * The request carries at most the model's `maxTokens`; a smaller limit stays as it is.
 */
import { type Api, type AssistantMessage, type AssistantMessageEventStream, createAssistantMessageEventStream, createProvider, envApiKeyAuth, type Model, normalizeContext } from "@earendil-works/pi-ai";
import { afterEach, describe, expect, it } from "vitest";
import { createModelSource, createProviderRegistry, customProviderSpec } from "@swarmtales/models";

const KEY_ENV = "SWARMTALES_TEST_LIMITS_KEY";

afterEach(() => {
	Reflect.deleteProperty(process.env, KEY_ENV);
});

/** The `max_tokens` a request to a provider whose model allows `limit` carries when the run asks for `asked`. */
async function sentFor(limit: number, asked: number): Promise<number | undefined> {
	process.env[KEY_ENV] = "sk-test-0123456789abcdefghij";
	let sent: number | undefined;
	const capturing = (model: Model<Api>, _context: unknown, options?: { readonly maxTokens?: number }): AssistantMessageEventStream => {
		sent = options?.maxTokens;
		const stream = createAssistantMessageEventStream();
		const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } };
		const message: AssistantMessage = { role: "assistant", content: [], api: model.api, provider: model.provider, model: model.id, usage, stopReason: "stop", timestamp: 0 };
		queueMicrotask(() => {
			stream.push({ type: "start", partial: message });
			stream.push({ type: "done", reason: "stop", message });
		});
		return stream;
	};
	const base = customProviderSpec({ id: "gateway", baseUrl: "http://127.0.0.1:9/v1", modelIds: ["m"], apiKeyEnv: [KEY_ENV], maxTokens: limit });
	const spec = {
		...base,
		create: () => createProvider({ id: "gateway", name: "gateway", baseUrl: "http://127.0.0.1:9/v1", auth: { apiKey: envApiKeyAuth("gateway API key", [KEY_ENV]) }, models: base.create().getModels(), api: { stream: capturing, streamSimple: capturing } }),
	};
	const binding = createModelSource({ provider: "gateway", modelId: "m" }, { registry: createProviderRegistry([spec]) }).bind("GM", { maxOutputTokens: asked, timeoutMs: 5_000 });
	const stream = await binding.streamFn(binding.model, normalizeContext({ messages: [{ role: "user", content: "hello", timestamp: 0 }] }));
	await stream.result();
	return sent;
}

describe("the output limit of an overridden model (P75)", () => {
	it("cuts the story's 393216 to the model's own limit", async () => {
		expect(await sentFor(64_000, 393_216)).toBe(64_000);
	});

	it("keeps a limit the model can honour", async () => {
		expect(await sentFor(64_000, 4_000)).toBe(4_000);
		expect(await sentFor(64_000, 64_000)).toBe(64_000);
	});
});
