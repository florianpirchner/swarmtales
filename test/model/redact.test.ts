/**
 * Secrets in provider error texts (step 18 challenge, chain-security m7): a model call's error text
 * goes verbatim into the signed `events.jsonl` (`turn_error`, `gamemaker_error`, an overseer's error),
 * where it can no longer be removed without breaking the chain. A base URL with credentials is echoed
 * by Node's `Request` ("Request cannot be constructed from a URL that includes credentials: ..."), so
 * every real model source redacts error texts before they leave the stream.
 */
import { afterEach, describe, expect, it } from "vitest";
import { redactSecrets } from "@swarmtales/kernel";
import { type Api, type AssistantMessage, type AssistantMessageEventStream, createAssistantMessageEventStream, createProvider, envApiKeyAuth, type Model } from "@earendil-works/pi-ai";
import { createModelSource, createProviderRegistry, customProviderSpec } from "@swarmtales/models";

const KEY_ENV = "SWARMTALES_TEST_REDACT_KEY";

afterEach(() => {
	Reflect.deleteProperty(process.env, KEY_ENV);
});

describe("redacting secrets from error texts", () => {
	it("removes the credentials of a URL and API-key-shaped tokens, and keeps the rest", () => {
		expect(redactSecrets("Request cannot be constructed from a URL that includes credentials: https://user:sekret@gateway.example/v1/chat")).toBe(
			"Request cannot be constructed from a URL that includes credentials: https://[redacted]@gateway.example/v1/chat",
		);
		expect(redactSecrets("401 invalid x-api-key sk-ant-api03-AbCdEfGhIjKlMnOpQrStUv_wx-yz")).toBe("401 invalid x-api-key sk-[redacted]");
		expect(redactSecrets("Authorization: Bearer abcdefghijklmnop0123")).toBe("Authorization: Bearer [redacted]");
		expect(redactSecrets("429 rate limited, retry after 3 s (https://openrouter.ai/docs)")).toBe("429 rate limited, retry after 3 s (https://openrouter.ai/docs)");
		expect(redactSecrets("a task-list item and an sk- prefix alone")).toBe("a task-list item and an sk- prefix alone");
	});

	it("reaches a real provider's error text before any caller reads it", async () => {
		process.env[KEY_ENV] = "sk-test-0123456789abcdefghij";
		// A provider whose call fails with the text Node's Request writes for a URL with credentials (pi-ai's OpenAI
		// client says only "Connection error." for it today; another client, or a later version, may echo the URL).
		const echoing = (model: Model<Api>): AssistantMessageEventStream => {
			const stream = createAssistantMessageEventStream();
			const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } };
			const message: AssistantMessage = {
				role: "assistant",
				content: [],
				api: model.api,
				provider: model.provider,
				model: model.id,
				usage,
				stopReason: "error",
				errorMessage: `Request cannot be constructed from a URL that includes credentials: ${model.baseUrl} (key ${process.env[KEY_ENV] ?? ""})`,
				timestamp: Date.now(),
			};
			queueMicrotask(() => {
				stream.push({ type: "start", partial: message });
				stream.push({ type: "error", reason: "error", error: message });
			});
			return stream;
		};
		const base = customProviderSpec({ id: "gateway", baseUrl: "https://user:sekret@127.0.0.1:9/v1", modelIds: ["m"], apiKeyEnv: [KEY_ENV] });
		const spec = {
			...base,
			create: () => {
				const real = base.create();
				return createProvider({ id: "gateway", name: "gateway", baseUrl: "https://user:sekret@127.0.0.1:9/v1", auth: { apiKey: envApiKeyAuth("gateway API key", [KEY_ENV]) }, models: real.getModels(), api: { stream: echoing, streamSimple: echoing } });
			},
		};
		const source = createModelSource({ provider: "gateway", modelId: "m" }, { registry: createProviderRegistry([spec]) });
		const binding = source.bind("A01", { maxOutputTokens: 16, timeoutMs: 5_000 });
		const stream = await binding.streamFn(binding.model, { messages: [{ role: "user", content: "hello", timestamp: 0 }] });
		const seen: string[] = [];
		for await (const event of stream) if (event.type === "error") seen.push(event.error.errorMessage ?? "");
		const message = await stream.result();
		expect(message.stopReason).toBe("error");
		expect(message.errorMessage).toBe("Request cannot be constructed from a URL that includes credentials: https://[redacted]@127.0.0.1:9/v1 (key sk-[redacted])");
		expect(seen).toEqual([message.errorMessage]);
	});
});
