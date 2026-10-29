/**
 * Provider registry.
 *
 * The arena has no hard-wired model list. Every provider is a
 * {@link ProviderSpec}; the built-in list contains OpenRouter (default), the
 * direct Anthropic, DeepSeek and Z.ai APIs and the offline provider `scripted`. More
 * providers, including a self-hosted OpenAI-compatible endpoint, are added
 * with {@link ProviderRegistry.register}.
 */
import { createProvider, envApiKeyAuth, type Model, type Provider, type ProviderStreams } from "@earendil-works/pi-ai";
import { anthropicMessagesApi } from "@earendil-works/pi-ai/api/anthropic-messages.lazy";
import { stream, streamSimple } from "@earendil-works/pi-ai/api/openai-completions";
import { ANTHROPIC_MODELS } from "@earendil-works/pi-ai/providers/anthropic.models";
import { deepseekProvider } from "@earendil-works/pi-ai/providers/deepseek";
import { openrouterProvider } from "@earendil-works/pi-ai/providers/openrouter";
import { zaiProvider } from "@earendil-works/pi-ai/providers/zai";
import type { OpenRouterRouting } from "../story/types.ts";

/** OpenRouter model ID of DeepSeek V4.1 Flash (1017). */
export const OPENROUTER_DEEPSEEK_FLASH = "deepseek/deepseek-v4.1-flash-1017";
/** OpenRouter model ID of Z.ai GLM-5.3-Flash. */
export const OPENROUTER_GLM_FLASH = "z-ai/glm-5.3-flash";
/** Direct DeepSeek API. */
export const DEEPSEEK_DIRECT_FLASH = "deepseek-flash";
/** Direct Z.ai API. */
export const ZAI_GLM_FLASH = "glm-5.3-flash";

/** Direct Anthropic API: Claude Haiku 5.5. */
export const ANTHROPIC_HAIKU = "claude-haiku-5-5";
/** Direct Anthropic API: Claude Sonnet 5.5, e.g. for the game master (v09). */
export const ANTHROPIC_SONNET = "claude-sonnet-5-5";
/**
 * The arena reads its own variable instead of `ANTHROPIC_API_KEY`: hosted
 * sessions filter that name out, and a dedicated name keeps arena spending
 * separate from other tools on the same machine.
 */
export const ANTHROPIC_API_KEY_ENV = "ARENA_ANTHROPIC_API_KEY";

export const SCRIPTED_PROVIDER_ID = "scripted";

/** The `provider` object of an OpenRouter request. */
export function openRouterProviderPreferences(routing: OpenRouterRouting): Readonly<Record<string, unknown>> {
	const provider: Record<string, unknown> = {};
	if (routing.order !== undefined && routing.order.length > 0) provider.order = [...routing.order];
	if (routing.allowFallbacks !== undefined) provider.allow_fallbacks = routing.allowFallbacks;
	return { provider };
}

export interface ProviderSpec {
	/** Unique provider ID, e.g. `openrouter`. */
	readonly id: string;
	readonly label: string;
	/** Used when neither CLI nor environment names a model. Empty for providers without models. */
	readonly defaultModelId: string;
	/** Environment variables pi reads the API key from. */
	readonly apiKeyEnv: readonly string[];
	/** Builds the pi provider; only called when a run starts. */
	readonly create: () => Provider;
	/** Short names for the CLI, e.g. `glm-flash`. */
	readonly modelAliases?: Readonly<Record<string, string>>;
}

export const BUILTIN_PROVIDERS: readonly ProviderSpec[] = [
	{
		id: "openrouter",
		label: "OpenRouter",
		defaultModelId: OPENROUTER_GLM_FLASH,
		apiKeyEnv: ["OPENROUTER_API_KEY"],
		create: openrouterProvider,
		modelAliases: { "deepseek-flash": OPENROUTER_DEEPSEEK_FLASH, "glm-flash": OPENROUTER_GLM_FLASH },
	},
	{
		id: "anthropic",
		label: "Anthropic (direct)",
		defaultModelId: ANTHROPIC_HAIKU,
		apiKeyEnv: [ANTHROPIC_API_KEY_ENV],
		create: anthropicDirectProvider,
		modelAliases: { haiku: ANTHROPIC_HAIKU, sonnet: ANTHROPIC_SONNET },
	},
	{
		id: "deepseek",
		label: "DeepSeek (direct)",
		defaultModelId: DEEPSEEK_DIRECT_FLASH,
		apiKeyEnv: ["DEEPSEEK_API_KEY"],
		create: deepseekProvider,
		modelAliases: { "deepseek-flash": DEEPSEEK_DIRECT_FLASH },
	},
	{
		id: "zai",
		label: "Z.ai (direct)",
		defaultModelId: ZAI_GLM_FLASH,
		apiKeyEnv: ["ZAI_API_KEY"],
		create: zaiProvider,
		modelAliases: { "glm-flash": ZAI_GLM_FLASH },
	},
	{
		id: SCRIPTED_PROVIDER_ID,
		label: "Scripted (offline, deterministic)",
		defaultModelId: "",
		apiKeyEnv: [],
		create: () => {
			throw new Error("The scripted provider is not built through pi");
		},
	},
];

/**
 * pi's Anthropic catalog and Messages API, authenticated only through
 * {@link ANTHROPIC_API_KEY_ENV}. pi's own `anthropicProvider` would read
 * `ANTHROPIC_API_KEY` and OAuth tokens, which the arena does not use.
 */
export function anthropicDirectProvider(): Provider {
	return createProvider({
		id: "anthropic",
		name: "Anthropic",
		baseUrl: "https://api.anthropic.com",
		auth: { apiKey: envApiKeyAuth("Anthropic API key", [ANTHROPIC_API_KEY_ENV]) },
		models: Object.values(ANTHROPIC_MODELS),
		api: anthropicMessagesApi(),
	});
}

export class ProviderRegistry {
	readonly #specs = new Map<string, ProviderSpec>();

	constructor(specs: readonly ProviderSpec[] = BUILTIN_PROVIDERS) {
		for (const spec of specs) this.register(spec);
	}

	register(spec: ProviderSpec): void {
		if (spec.id.length === 0) throw new Error("Provider ID must not be empty");
		this.#specs.set(spec.id, spec);
	}

	has(id: string): boolean {
		return this.#specs.has(id);
	}

	get(id: string): ProviderSpec | undefined {
		return this.#specs.get(id);
	}

	require(id: string): ProviderSpec {
		const spec = this.#specs.get(id);
		if (spec === undefined) throw new Error(`Unknown provider "${id}". Known: ${this.ids().join(", ")}`);
		return spec;
	}

	ids(): readonly string[] {
		return [...this.#specs.keys()];
	}
}

export function createProviderRegistry(extra: readonly ProviderSpec[] = []): ProviderRegistry {
	return new ProviderRegistry([...BUILTIN_PROVIDERS, ...extra]);
}

export interface CustomProviderOptions {
	readonly id: string;
	readonly label?: string;
	/** Base URL including `/v1`, e.g. `https://api.example.com/v1`. */
	readonly baseUrl: string;
	readonly modelIds: readonly string[];
	readonly apiKeyEnv?: readonly string[];
	readonly contextWindow?: number;
	readonly maxTokens?: number;
	readonly reasoning?: boolean;
	readonly pricing?: { readonly input: number; readonly output: number; readonly cacheRead?: number };
}

/** A self-hosted OpenAI-compatible provider (gateways, proxies). */
export function createOpenAiCompatibleProvider(options: CustomProviderOptions): Provider {
	if (options.modelIds.length === 0) throw new Error(`Provider "${options.id}" needs at least one model ID`);
	const apiKeyEnv = options.apiKeyEnv ?? [];
	const models: readonly Model<"openai-completions">[] = options.modelIds.map((id) => ({
		id,
		name: id,
		api: "openai-completions",
		provider: options.id,
		baseUrl: options.baseUrl,
		input: ["text"],
		cost: {
			input: options.pricing?.input ?? 0,
			output: options.pricing?.output ?? 0,
			cacheRead: options.pricing?.cacheRead ?? 0,
			cacheWrite: 0,
		},
		reasoning: options.reasoning ?? false,
		contextWindow: options.contextWindow ?? 128_000,
		maxTokens: options.maxTokens ?? 8_192,
	}));

	const streams: ProviderStreams = {
		stream: (model, context, streamOptions) => {
			if (model.api !== "openai-completions") throw new Error(`Model ${model.id} uses ${model.api}, expected openai-completions`);
			return stream({ ...model, api: "openai-completions" }, context, streamOptions);
		},
		streamSimple: (model, context, streamOptions) => {
			if (model.api !== "openai-completions") throw new Error(`Model ${model.id} uses ${model.api}, expected openai-completions`);
			return streamSimple({ ...model, api: "openai-completions" }, context, streamOptions);
		},
	};

	return createProvider({
		id: options.id,
		name: options.label ?? options.id,
		baseUrl: options.baseUrl,
		auth: { apiKey: envApiKeyAuth(`${options.label ?? options.id} API key`, apiKeyEnv) },
		models,
		api: streams,
	});
}

export function customProviderSpec(options: CustomProviderOptions): ProviderSpec {
	return {
		id: options.id,
		label: options.label ?? options.id,
		defaultModelId: options.modelIds[0] ?? "",
		apiKeyEnv: options.apiKeyEnv ?? [],
		create: () => createOpenAiCompatibleProvider(options),
	};
}
