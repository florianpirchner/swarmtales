import { describe, expect, it } from "vitest";
import { createModelSource } from "../../src/model/source.ts";
import { describeModel, missingApiKeys, ModelConfigError, resolveModelSettings, settingsFromStory } from "../../src/model/settings.ts";
import { createProviderRegistry, customProviderSpec, OPENROUTER_DEEPSEEK_FLASH } from "../../src/model/providers.ts";
import nexus from "../../stories/nexus/story.ts";

const registry = createProviderRegistry();
const defaults = { provider: "openrouter", modelId: OPENROUTER_DEEPSEEK_FLASH };
const limits = { maxOutputTokens: 100, timeoutMs: 1_000 };

describe("model selection through the provider registry", () => {
	it("uses the story default", () => {
		expect(resolveModelSettings({}, {}, defaults, registry)).toEqual({ provider: "openrouter", modelId: OPENROUTER_DEEPSEEK_FLASH });
		expect(settingsFromStory(nexus.model)).toEqual({
			provider: "openrouter",
			modelId: "z-ai/glm-5.3-flash",
			routing: { order: ["open-inference"], allowFallbacks: false },
		});
	});

	it("can be overridden through the environment, and the CLI wins over it", () => {
		expect(resolveModelSettings({}, { ARENA_PROVIDER: "deepseek", ARENA_MODEL: "deepseek-v4-pro" }, defaults, registry)).toEqual({
			provider: "deepseek",
			modelId: "deepseek-v4-pro",
		});
		expect(resolveModelSettings({ provider: "scripted" }, { ARENA_PROVIDER: "deepseek" }, defaults, registry)).toEqual({ provider: "scripted" });
	});

	it("resolves aliases per provider", () => {
		expect(resolveModelSettings({ modelId: "glm-flash" }, {}, defaults, registry)).toEqual({ provider: "openrouter", modelId: "z-ai/glm-5.3-flash" });
		expect(resolveModelSettings({ provider: "zai" }, {}, defaults, registry)).toEqual({ provider: "zai", modelId: "glm-5.3-flash" });
		expect(resolveModelSettings({ provider: "anthropic" }, {}, defaults, registry)).toEqual({ provider: "anthropic", modelId: "claude-haiku-5-5" });
		expect(resolveModelSettings({ provider: "anthropic", modelId: "haiku" }, {}, defaults, registry)).toEqual({ provider: "anthropic", modelId: "claude-haiku-5-5" });
		expect(resolveModelSettings({ provider: "scripted", modelId: "glm-flash" }, {}, defaults, registry)).toEqual({ provider: "scripted" });
	});

	it("passes OpenRouter routing through and drops it for other providers", () => {
		const routing = { order: ["open-inference"], allowFallbacks: false };
		const withRouting = { provider: "openrouter", modelId: "glm-flash", routing };
		expect(resolveModelSettings({}, {}, withRouting, registry)).toEqual({ provider: "openrouter", modelId: "z-ai/glm-5.3-flash", routing });
		expect(resolveModelSettings({ provider: "zai" }, {}, withRouting, registry)).toEqual({ provider: "zai", modelId: "glm-5.3-flash" });
		const binding = createModelSource(resolveModelSettings({}, {}, withRouting, registry), { registry }).bind("A01", limits);
		expect(binding.requestDefaults).toEqual({ provider: { order: ["open-inference"], allow_fallbacks: false } });
	});

	it("rejects unknown providers, empty model IDs and a scripted source without script", () => {
		expect(() => resolveModelSettings({ provider: "nope" }, {}, defaults, registry)).toThrow(ModelConfigError);
		expect(() => resolveModelSettings({ modelId: "" }, {}, defaults, registry)).toThrow(ModelConfigError);
		expect(() => createModelSource({ provider: "scripted" }, { registry })).toThrow(ModelConfigError);
	});

	it("reports missing API keys and describes the choice", () => {
		expect(missingApiKeys({ provider: "openrouter" }, registry, {})).toEqual(["OPENROUTER_API_KEY"]);
		expect(missingApiKeys({ provider: "openrouter" }, registry, { OPENROUTER_API_KEY: "x" })).toEqual([]);
		expect(missingApiKeys({ provider: "scripted" }, registry, {})).toEqual([]);
		expect(missingApiKeys({ provider: "zai" }, registry, {})).toEqual(["ZAI_API_KEY"]);
		expect(missingApiKeys({ provider: "deepseek" }, registry, {})).toEqual(["DEEPSEEK_API_KEY"]);
		expect(missingApiKeys({ provider: "zai" }, registry, { ZAI_API_KEY: "x" })).toEqual([]);
		// Anthropic reads only the arena's own variable, never ANTHROPIC_API_KEY.
		expect(missingApiKeys({ provider: "anthropic" }, registry, { ANTHROPIC_API_KEY: "x" })).toEqual(["ARENA_ANTHROPIC_API_KEY"]);
		expect(missingApiKeys({ provider: "anthropic" }, registry, { ARENA_ANTHROPIC_API_KEY: "x" })).toEqual([]);
		expect(describeModel({ provider: "openrouter", modelId: OPENROUTER_DEEPSEEK_FLASH }, registry)).toBe(`OpenRouter (${OPENROUTER_DEEPSEEK_FLASH})`);
	});

	it("binds Claude Haiku through the direct Anthropic API", () => {
		const binding = createModelSource({ provider: "anthropic", modelId: "claude-haiku-5-5" }, { registry }).bind("A01", limits);
		expect(binding.model).toMatchObject({ id: "claude-haiku-5-5", provider: "anthropic", api: "anthropic-messages" });
		expect(binding.requestDefaults).toBeUndefined();
	});

	it("binds Claude Sonnet for the gamemaker by its alias (v09)", () => {
		expect(resolveModelSettings({ provider: "anthropic", modelId: "sonnet" }, {}, defaults, registry)).toEqual({ provider: "anthropic", modelId: "claude-sonnet-5-5" });
		const binding = createModelSource({ provider: "anthropic", modelId: "claude-sonnet-5-5" }, { registry }).bind("GM", limits);
		expect(binding.model).toMatchObject({ id: "claude-sonnet-5-5", provider: "anthropic", api: "anthropic-messages" });
	});

	it("accepts a self-hosted OpenAI-compatible provider", () => {
		const custom = createProviderRegistry([
			customProviderSpec({ id: "my-gateway", label: "My gateway", baseUrl: "https://gateway.example/v1", modelIds: ["arena-large"], apiKeyEnv: ["MY_GATEWAY_KEY"] }),
		]);
		expect(resolveModelSettings({ provider: "my-gateway" }, {}, defaults, custom)).toEqual({ provider: "my-gateway", modelId: "arena-large" });
		expect(missingApiKeys({ provider: "my-gateway" }, custom, {})).toEqual(["MY_GATEWAY_KEY"]);
		expect(createModelSource({ provider: "my-gateway", modelId: "arena-large" }, { registry: custom }).bind("A01", limits).model.id).toBe("arena-large");
	});
});
