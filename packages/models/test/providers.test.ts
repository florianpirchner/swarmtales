// SPDX-License-Identifier: Apache-2.0
/**
 * The provider adapters, the model settings and the request limits (M2 spec 3.2 and 3.3). No request leaves the
 * process: every adapter gets a stubbed `fetch`, and the global one throws. Every key is built here at run time.
 */
import { inspect } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createModels } from "@earendil-works/pi-ai";
import { SwtError } from "@swarmtales/contracts";
import { createKeyBroker } from "../src/keys.ts";
import { BUILTIN_PROVIDERS, createProviderRegistry, modelOf, openRouterProviderPreferences, type ProviderSpec } from "../src/providers.ts";
import { limitsFor, PROVIDER_RETRIES, REQUEST_TIMEOUT_MS, toolChoiceDefaults, withRequestDefaults } from "../src/request.ts";
import { resolveModelSettings } from "../src/settings.ts";

// Built from parts: no committed text has the shape of a key.
const KEYS: Readonly<Record<string, string>> = { anthropic: `${["s", "k"].join("")}-ant-${"a".repeat(37)}`, openrouter: `${["s", "k"].join("")}-or-${"b".repeat(37)}` };
const CLOSED = { env: () => Promise.resolve(undefined), fileExists: () => Promise.resolve(false) };
const registry = createProviderRegistry();
// Through a parameter: the import check of the layer rules reads a `require` call with a text as an import.
const specOf = (id: string): ProviderSpec => registry.require(id);

function caught(run: () => unknown): SwtError {
	try {
		run();
	} catch (error) {
		if (error instanceof SwtError) return error;
	}
	throw new TypeError("no SwtError was thrown");
}

const shown = (value: unknown): string => `${JSON.stringify(value)}${inspect(value, { depth: 12, showHidden: true })}`;

// A provider that refuses the request: the stub keeps the request headers and answers 400, so nothing is retried.
function refusingFetch(seen: string[]): typeof globalThis.fetch {
	return (input, init) => {
		const headers = new Headers(input instanceof Request ? input.headers : init?.headers);
		new Headers(init?.headers).forEach((value, name) => {
			headers.set(name, value);
		});
		seen.push([...headers.values()].join("\n"));
		return Promise.resolve(new Response(JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: "refused by the stub" } }), { status: 400, headers: { "content-type": "application/json" } }));
	};
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("the provider adapters", () => {
	it.each(["anthropic", "openrouter"])("%s sends the broker's key in the request header and nowhere else", async (id) => {
		const key = KEYS[id] ?? "";
		vi.stubGlobal("fetch", () => Promise.reject(new TypeError("a test reached the global fetch")));
		const logs = (["log", "info", "warn", "error", "debug"] as const).map((name) => vi.spyOn(console, name).mockImplementation(() => undefined));
		const broker = createKeyBroker({ [`SWT_${id.toUpperCase()}_API_KEY`]: key });
		const spec = specOf(id);
		const provider = spec.create(broker.auth(id));
		const models = createModels({ authContext: CLOSED });
		models.setProvider(provider);
		const model = modelOf(provider, resolveModelSettings({ provider: id }, {}, undefined, registry).modelId);
		const seen: string[] = [];
		const message = await models.completeSimple(model, { messages: [{ role: "user", content: "hello", timestamp: 0 }] }, { fetch: refusingFetch(seen), maxRetries: 0, timeoutMs: 5000 });

		expect(seen).toHaveLength(1);
		expect(seen[0]).toContain(key);
		expect(message.stopReason).toBe("error");
		expect(message.errorMessage).toContain("refused by the stub");
		expect(shown([message, provider, spec, registry, models.getProviders(), model])).not.toContain(key);
		expect(shown(logs.map((log) => log.mock.calls))).not.toContain(key);
		expect(provider.auth.oauth).toBeUndefined();
		expect(provider.getAllModels?.().every((entry) => entry.type === undefined || entry.type === "chat") ?? true).toBe(true);
	});

	it("gives no key to a provider that was built without the broker's auth object", async () => {
		const models = createModels({ authContext: CLOSED });
		models.setProvider(specOf("anthropic").create({ name: "none", resolve: () => Promise.resolve(undefined) }));
		expect(await models.getAuth("anthropic")).toBeUndefined();
	});
});

describe("the registry and the settings", () => {
	it("knows the two adapters and resolves the alias haiku to the id of the old registry", () => {
		expect(registry.ids()).toEqual(["openrouter", "anthropic"]);
		expect(BUILTIN_PROVIDERS.map((spec) => spec.modelAliases)).toEqual([
			{ "deepseek-flash": "deepseek/deepseek-v4.1-flash-1017", "glm-flash": "z-ai/glm-5.3-flash" },
			{ haiku: "claude-haiku-5-5", sonnet: "claude-sonnet-5-5" },
		]);
		expect(resolveModelSettings({}, {}, "anthropic/haiku", registry)).toEqual({ provider: "anthropic", modelId: "claude-haiku-5-5", requestedId: "haiku", thinking: "medium", maxOutputTokens: 4000 });
		expect(resolveModelSettings({}, {}, { id: "openrouter/z-ai/glm-5.3-flash", thinking: "low", maxOutputTokens: 16000 }, registry)).toEqual({
			provider: "openrouter",
			modelId: "z-ai/glm-5.3-flash",
			requestedId: "z-ai/glm-5.3-flash",
			thinking: "low",
			maxOutputTokens: 16000,
		});
	});

	it("lets the command line win over the environment and the environment over the game", () => {
		const env = { SWT_PROVIDER: "openrouter", SWT_MODEL: "deepseek-flash" };
		expect(resolveModelSettings({}, env, "anthropic/haiku", registry)).toMatchObject({ provider: "openrouter", modelId: "deepseek/deepseek-v4.1-flash-1017", requestedId: "deepseek-flash" });
		expect(resolveModelSettings({ provider: "anthropic", modelId: "sonnet", thinking: "off" }, env, "anthropic/haiku", registry)).toMatchObject({ provider: "anthropic", modelId: "claude-sonnet-5-5", thinking: "off" });
		// The game's model stays with the game's provider: another provider gets its own default.
		expect(resolveModelSettings({ provider: "openrouter" }, {}, "anthropic/haiku", registry).modelId).toBe("z-ai/glm-5.3-flash");
		expect(resolveModelSettings({ provider: "anthropic" }, {}, undefined, registry).modelId).toBe("claude-haiku-5-5");
	});

	it("refuses an unknown provider with X002, an unknown model with X003 and an empty model id with X004", () => {
		const unknown = caught(() => resolveModelSettings({}, {}, "antropic/haiku", registry));
		expect(unknown.code).toBe("SWT-X002");
		expect(unknown.message).toContain("openrouter, anthropic");
		expect(caught(() => specOf("deepseek")).code).toBe("SWT-X002");
		expect(caught(() => resolveModelSettings({}, {}, undefined, registry)).code).toBe("SWT-X002");
		expect(caught(() => createProviderRegistry([{ ...specOf("anthropic"), id: "" }])).code).toBe("SWT-X002");
		expect(createProviderRegistry([{ ...specOf("anthropic"), id: "own" }]).has("own")).toBe(true);

		const provider = specOf("anthropic").create(createKeyBroker({ SWT_ANTHROPIC_API_KEY: KEYS.anthropic }).auth("anthropic"));
		const missing = caught(() => modelOf(provider, "haiku-9"));
		expect(missing.code).toBe("SWT-X003");
		expect(missing.message).toMatch(/and \d+ more/);
		expect(modelOf(provider, "claude-haiku-5-5").cost.input).toBeGreaterThan(0);

		for (const run of [() => resolveModelSettings({ modelId: "" }, {}, "anthropic/haiku", registry), () => resolveModelSettings({}, { SWT_MODEL: "" }, "anthropic/haiku", registry), () => resolveModelSettings({}, {}, "anthropic/", registry), () => resolveModelSettings({}, {}, "anthropic", registry)]) {
			expect(caught(run).code).toBe("SWT-X004");
		}
	});
});

describe("the request limits and defaults", () => {
	it("cuts the output limit to the model's own and keeps the timeout and the retries of the old runner", () => {
		expect([REQUEST_TIMEOUT_MS, PROVIDER_RETRIES]).toEqual([120_000, 6]);
		expect(limitsFor(8000, { maxOutputTokens: 393_216, timeoutMs: 1 })).toEqual({ maxOutputTokens: 8000, timeoutMs: 1 });
		expect(limitsFor(0, { maxOutputTokens: 4000, timeoutMs: 1 }).maxOutputTokens).toBe(4000);
	});

	it("merges fixed request fields over a payload", () => {
		const routing = openRouterProviderPreferences({ order: ["a", "b"], allowFallbacks: false });
		expect(routing).toEqual({ provider: { order: ["a", "b"], allow_fallbacks: false } });
		expect(openRouterProviderPreferences({ order: [] })).toEqual({ provider: {} });
		expect(withRequestDefaults({ model: "m", provider: 1 }, routing)).toEqual({ model: "m", ...routing });
		expect(withRequestDefaults("text", routing)).toBe("text");
		expect(withRequestDefaults({ model: "m" }, undefined)).toEqual({ model: "m" });
		expect(toolChoiceDefaults("required", "anthropic-messages")).toEqual({ tool_choice: { type: "any" } });
		expect(toolChoiceDefaults("required", "openai-completions")).toEqual({ tool_choice: "required" });
	});
});
